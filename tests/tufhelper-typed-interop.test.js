import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { createIpcPort } from '../src/features/tufhelperlite/adapters/createIpcPort.js';
// eslint-disable-next-line import/extensions
import { createHelperSession } from '../src/features/tufhelperlite/application/createHelperSession.js';

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function until(predicate, message, milliseconds = 10000) {
  const deadline = Date.now() + milliseconds;
  while (!predicate() && Date.now() < deadline) await pause(10);
  assert.ok(predicate(), message);
}

test('real TUFHelper services preserve settings, deletion, push, targeting, cancellation and reconnect', {
  skip: !process.env.TUFHELPER_IPC_FIXTURE || !globalThis.WebSocket,
}, async (t) => {
  // eslint-disable-next-line import/extensions
  const { createIpc } = await import('../vendor/adofai-ipc/index.js');
  // eslint-disable-next-line import/extensions
  const { TufHelperContract } = await import('../vendor/tufhelper-ipc/index.js');
  const children = []; const peers = [];
  t.after(() => {
    for (const peer of peers) peer.session.close();
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  });
  async function launch() {
    const child = spawn(process.env.DOTNET_EXE || `${process.env.HOME}/.dotnet/dotnet`, [process.env.TUFHELPER_IPC_FIXTURE, '--serve-ipc'], { stdio: ['pipe', 'pipe', 'pipe'] });
    children.push(child);
    let output = ''; let errors = ''; let launchError;
    child.once('error', (error) => { launchError = error; });
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { errors += data; });
    await until(() => /IPC_TUFHELPER_SERVER_PORT=([0-9]+)/.test(output) || child.exitCode !== null || child.signalCode !== null || launchError, 'TUFHelper fixture did not start');
    assert.equal(launchError, undefined, String(launchError));
    assert.equal(child.exitCode, null, errors); assert.equal(child.signalCode, null, errors);
    return {
      child, port: Number(output.match(/IPC_TUFHELPER_SERVER_PORT=([0-9]+)/)[1]),
      async control(command) {
        const start = output.length;
        child.stdin.write(`${command}\n`);
        await until(() => output.slice(start).includes(`IPC_TUFHELPER_CONTROL_DONE=${command}`), `TUFHelper control ${command} failed: ${errors}`);
        return output.slice(start);
      },
    };
  }
  let server = await launch();
  const options = { startPort: server.port, endPort: server.port, connectTimeoutMs: 1000, heartbeatIntervalMs: 50, heartbeatTimeoutMs: 250 };
  function createPeer() {
    const sdk = createIpc(options);
    const peer = { pushes: Object.create(null) };
    const port = createIpcPort({
      contract: TufHelperContract, browser: null, page: null,
      registerApp(appOptions) {
        const app = sdk.registerApp(appOptions); peer.app = app;
        const use = app.use.bind(app);
        app.use = (contract, handlers) => {
          const observed = Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name, (request) => {
            peer.pushes[name] = (peer.pushes[name] || 0) + 1;
            return handler(request);
          }]));
          peer.channel = use(contract, observed); return peer.channel;
        };
        return app;
      },
    });
    peer.session = createHelperSession({ createPort: () => port, timeoutMs: 10000 });
    peers.push(peer); return peer;
  }
  const first = createPeer(); const second = createPeer();
  await Promise.all([first.session.connect(), second.session.connect()]);
  assert.notEqual(first.app.appId, second.app.appId);
  assert.equal(first.session.getSnapshot().health.ok, true);
  assert.deepEqual(first.session.getSnapshot().jobs, []);
  assert.equal(first.pushes.snapshot, 1); assert.equal(second.pushes.snapshot, 1);
  const firstAppId = first.app.appId; const firstSession = first.channel.sessionId;
  assert.ok(firstSession);
  const library = await first.session.page({});
  assert.deepEqual(library.items, []); assert.equal(library.totalCount, 0);
  const missing = await first.session.cancelJob('missing');
  assert.equal(missing.ok, false); assert.equal(missing.cancelled, false); assert.equal(missing.jobId, 'missing');

  const stats = async () => {
    const output = await server.control('stats');
    return JSON.parse(output.match(/IPC_TUFHELPER_STATS=(\{[^\n]+\})/)[1]);
  };
  const unwatch = first.session.watchLevel('123');
  await server.control('library.seed');
  await until(() => first.session.getSnapshot().summary?.levelCount === 1 && second.session.getSnapshot().summary?.levelCount === 1, 'seeded library summary was not broadcast');
  await until(() => first.session.getSnapshot().levelIds.includes('123'), 'visible downloaded membership was not refreshed');
  assert.deepEqual(second.session.getSnapshot().levelIds, [], 'library membership leaked to an uninterested app');
  assert.equal((await first.session.page({})).items[0].id, 123);

  const enabled = await first.session.setTempDownloadMode(true);
  assert.equal(enabled.tempDownloadMode, true);
  assert.match(enabled.tempDirectory.replaceAll('\\', '/'), /\/Downloads\/temp$/);
  await until(() => second.session.getSnapshot().settings?.tempDownloadMode === true, 'settings change was not pushed to the other app');
  await until(() => first.session.getSnapshot().levelIds.length === 0, 'persistent membership remained active in temp mode');
  await assert.rejects(first.session.deleteLevel('123'), (error) => error.code === 'temp_download_mode_enabled');
  await assert.rejects(first.session.pickFolder(true), (error) => error.code === 'temp_download_mode_enabled');
  await server.control('temp.seed');
  assert.equal((await stats()).tempHasFiles, true);
  await first.session.flushTemp();
  const flushed = await stats();
  assert.equal(flushed.tempExists, true); assert.equal(flushed.tempHasFiles, false);
  assert.equal(flushed.persistent123Exists, true, 'flush deleted the persistent library');
  const late = createPeer();
  await late.session.connect();
  assert.equal(late.session.getSnapshot().settings.tempDownloadMode, true, 'new app snapshot omitted saved settings');
  late.session.close();

  await first.session.setTempDownloadMode(false);
  await until(() => second.session.getSnapshot().settings?.tempDownloadMode === false, 'persistent mode was not restored in the other app');
  await until(() => first.session.getSnapshot().levelIds.includes('123'), 'persistent library interests were not restored');
  await assert.rejects(first.session.deleteLevel('../123'), (error) => error.code === 'invalid_level_id');
  assert.deepEqual({ ...await first.session.deleteLevel('123') }, { ok: true, id: '123', deleted: true });
  await until(() => first.session.getSnapshot().summary?.levelCount === 0 && second.session.getSnapshot().summary?.levelCount === 0, 'deletion summary did not reach all apps');
  await until(() => first.session.getSnapshot().levelIds.length === 0, 'deleted level stayed in membership');
  assert.equal((await stats()).persistent123Exists, false, 'delete did not remove the actual managed directory');
  assert.equal((await first.session.page({})).items.length, 0);
  assert.equal((await first.session.deleteLevel('123')).deleted, false);
  unwatch();

  const jobsBefore = first.pushes.jobsChanged || 0;
  const progress = await server.control('progress');
  const progressJobId = progress.match(/IPC_TUFHELPER_PROGRESS_JOB_ID=([^\r\n]+)/)[1];
  await until(() => first.session.getSnapshot().jobs.some((job) => job.jobId === progressJobId), 'progress push did not reach the first app');
  await until(() => second.session.getSnapshot().jobs.some((job) => job.jobId === progressJobId), 'progress push did not reach the second app');
  assert.ok(first.pushes.jobsChanged > jobsBefore);
  assert.equal(first.session.getSnapshot().jobs.find((job) => job.jobId === progressJobId).progress, 0.5);
  await assert.rejects(first.session.setTempDownloadMode(true), (error) => error.code === 'download_jobs_active');
  await assert.rejects(first.session.flushTemp(), (error) => error.code === 'download_jobs_active');
  const finished = first.session.waitForJob(progressJobId);
  assert.equal((await first.session.cancelJob(progressJobId)).cancelled, true);
  assert.equal((await finished).status, 'cancelled');

  const folderNotifications = second.pushes.folderSelection || 0;
  await server.control('folder.immediate');
  const picker = await first.session.pickFolder(true);
  // The fake native picker completes inside Pick, before its start result is returned.
  // The UI may begin waiting after that completion; retain it by operation ID.
  await until(() => (first.pushes.folderSelection || 0) === 1, 'folder selection was not pushed to its owner');
  const selection = await first.session.waitForFolder(picker.operationId);
  assert.equal(selection.state, 'selected'); assert.ok(selection.selectionToken);
  assert.equal(second.pushes.folderSelection || 0, folderNotifications, 'folder selection was broadcast to another app');
  await assert.rejects(second.session.changeStorage({ selectionToken: selection.selectionToken }), (error) => /selection|token/.test(error.code || ''), 'another app consumed the folder permission');
  await first.session.changeStorage({ selectionToken: selection.selectionToken });
  await until(() => first.session.getSnapshot().storage.currentDirectory === selection.directory, 'the selecting app could not use its folder permission');
  await assert.rejects(first.session.changeStorage({ selectionToken: selection.selectionToken }), (error) => /selection|token/.test(error.code || ''), 'a one-time folder permission was reused');

  const pendingPicker = await first.session.pickFolder(true);
  const waiting = first.session.waitForFolder(pendingPicker.operationId);
  const disconnected = assert.rejects(waiting, (error) => error.code === 'unavailable' || error.code === 'DISCONNECTED');
  const port = server.port;
  const exited = once(server.child, 'exit'); server.child.kill('SIGTERM'); await exited;
  await disconnected;
  await until(() => !first.session.getSnapshot().connected && !second.session.getSnapshot().connected, 'old sessions stayed available after shutdown');
  server = await launch(); assert.equal(server.port, port);
  await until(() => first.session.getSnapshot().connected && second.session.getSnapshot().connected, 'fresh snapshots did not restore the apps');
  assert.equal(first.app.appId, firstAppId);
  assert.notEqual(first.channel.sessionId, firstSession);
  assert.equal(first.pushes.snapshot, 2); assert.equal(second.pushes.snapshot, 2);
  assert.deepEqual(first.session.getSnapshot().jobs, []);
  const totals = await stats();
  assert.equal(totals.folderStarts, 0, 'reconnection replayed an unfinished folder action');

  const firstJobs = first.pushes.jobsChanged || 0; const secondJobs = second.pushes.jobsChanged || 0;
  first.session.close();
  await assert.rejects(first.channel.ready(), (error) => error.code === 'disposed');
  await server.control('jobs.changed');
  await until(() => (second.pushes.jobsChanged || 0) > secondJobs, 'remaining app stopped receiving updates');
  assert.equal(first.pushes.jobsChanged || 0, firstJobs, 'disposed app received state pushes');
});
