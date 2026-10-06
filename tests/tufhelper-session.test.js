import assert from 'node:assert/strict';
import test from 'node:test';
// Node ESM requires the exact .js extension.
// eslint-disable-next-line import/extensions
import { createHelperSession } from '../src/features/tufhelperlite/application/createHelperSession.js';

function harness() {
  const peers = [];
  const session = createHelperSession({ createPort: () => {
    const peer = { sent: [], receive: null, state: null }; peers.push(peer);
    return {
      async open(receive, state) { peer.receive = receive; peer.state = state; queueMicrotask(() => receive('snapshot', { health: { capabilities: [] }, jobs: [], summary: { revision: 1 } })); },
      send(name, payload) { const id = `command-${peer.sent.length}`; peer.sent.push({ id, name, payload }); return id; },
      close() { peer.closed = true; },
    };
  } });
  return { session, peers };
}

test('named command results correlate independently while mutations update the store', async () => {
  const { session, peers } = harness(); await session.connect();
  const first = session.openById('10'); const second = session.openById('20');
  const commands = peers[0].sent.filter((item) => item.name === 'level.open-from-id');
  peers[0].receive('job.started', { jobId: 'second', updatedAtUnixMs: 2 }, { correlationId: commands[1].id });
  peers[0].receive('job.started', { jobId: 'first', updatedAtUnixMs: 1 }, { correlationId: commands[0].id });
  assert.equal((await first).jobId, 'first'); assert.equal((await second).jobId, 'second');
  assert.equal(session.getSnapshot().jobs.length, 2); session.close();
});

test('terminal events settle jobs without polling and stale start results cannot undo completion', async () => {
  const { session, peers } = harness(); await session.connect();
  const finished = session.waitForJob('job');
  peers[0].receive('jobs.changed', { jobs: [{ jobId: 'job', done: true, status: 'cancelled', updatedAtUnixMs: 2 }] });
  assert.equal((await finished).status, 'cancelled');
  peers[0].receive('job.started', { jobId: 'job', done: false, updatedAtUnixMs: 2 });
  assert.equal(session.getSnapshot().jobs[0].done, true); session.close();
});

test('disconnect rejects pending actions; reconnect observes state without replaying operations', async () => {
  const { session, peers } = harness(); await session.connect();
  const pending = session.updateLevel('12'); const rejection = assert.rejects(pending, /interrupted/);
  peers[0].state(false); await rejection;
  peers[0].receive('snapshot', { jobs: [], summary: { revision: 2 } });
  assert.equal(peers[0].sent.filter((item) => item.name === 'level.update.start').length, 1);
  assert.equal(session.getSnapshot().summary.revision, 2); session.close();
});

test('old connection callbacks are ignored after close and replacement', async () => {
  const { session, peers } = harness(); await session.connect(); session.close(); await session.connect();
  peers[0].receive('jobs.changed', { jobs: [{ jobId: 'old' }] });
  assert.deepEqual(session.getSnapshot().jobs, []); session.close();
});

test('folder results delivered before the UI awaits selection are retained by operation ID', async () => {
  const { session, peers } = harness(); await session.connect();
  peers[0].receive('folder.selection', { operationId: 'picker', state: 'cancelled' });
  assert.equal((await session.waitForFolder('picker')).state, 'cancelled'); session.close();
});

test('visible level interests are counted, bounded and resubscribed after a new snapshot', async () => {
  const { session, peers } = harness(); const stop = session.watchLevel('5'); const duplicate = session.watchLevel('5'); await session.connect();
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(peers[0].sent.at(-1).payload.ids, ['5']); stop(); await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(peers[0].sent.at(-1).payload.ids, ['5']); duplicate(); await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(peers[0].sent.at(-1).payload.ids, []); session.close();
});

test('application observers detach on abort and never consume another operation', async () => {
  const { session, peers } = harness(); await session.connect();
  const controller = new AbortController(); const pending = session.waitForJob('job', { signal: controller.signal });
  controller.abort(new Error('Dismissed')); await assert.rejects(pending, /Dismissed/);
  peers[0].receive('jobs.changed', { jobs: [{ jobId: 'other', done: true }] }); session.close();
});

test('rejected commands preserve domain errors and do not complete another command', async () => {
  const { session, peers } = harness(); await session.connect();
  const pending = session.page({ cursor: 'stale' }); const command = peers[0].sent.at(-1);
  peers[0].receive('command.rejected', { code: 'download_library_cursor_stale', message: 'Reload the library.' }, { correlationId: command.id });
  await assert.rejects(pending, (error) => error.code === 'download_library_cursor_stale' && error.message === 'Reload the library.'); session.close();
});
test('declared PascalCase mod DTOs hydrate capabilities and settle domain observers', async () => {
  const { session, peers } = harness(); await session.connect();
  const health = { Capabilities: ['download-storage-v1', 'download-library-v1'] };
  peers[0].receive('snapshot', { Health: health, Jobs: [], Storage: { State: 'idle' }, Batch: { State: 'idle' }, Summary: { Revision: 3 } });
  assert.deepEqual(session.getSnapshot().health.Capabilities, health.Capabilities);
  assert.equal(session.getSnapshot().storage.State, 'idle');
  assert.equal(session.getSnapshot().summary.Revision, 3);
  const started = session.openById('9'); const command = peers[0].sent.at(-1);
  peers[0].receive('job.started', { JobId: 'wire-job', Done: false, UpdatedAtUnixMs: 1 }, { correlationId: command.id });
  assert.equal((await started).JobId, 'wire-job');
  const terminal = session.waitForJob('wire-job');
  peers[0].receive('jobs.changed', { Jobs: [{ JobId: 'wire-job', Done: true, Status: 'completed', UpdatedAtUnixMs: 2 }] });
  assert.equal((await terminal).Status, 'completed');
  peers[0].receive('library.membership', { LevelIds: ['9'] });
  assert.deepEqual(session.getSnapshot().levelIds, ['9']);
  peers[0].receive('folder.selection', { OperationId: 'wire-picker', State: 'selected', SelectionToken: 'grant' });
  assert.equal((await session.waitForFolder('wire-picker')).SelectionToken, 'grant');
  session.close();
});
