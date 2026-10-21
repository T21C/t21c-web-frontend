import assert from 'node:assert/strict';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { createIpcPort } from '../src/features/tufhelperlite/adapters/createIpcPort.js';
// eslint-disable-next-line import/extensions
import { createHelperSession } from '../src/features/tufhelperlite/application/createHelperSession.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const snapshot = (revision = 1) => ({ health: {}, jobs: [], storage: {}, batch: {}, summary: { revision } });
function harness(onUse) {
  const statuses = new Set(); const calls = []; let handlers;
  const browser = new EventTarget(); const page = new EventTarget(); page.visibilityState = 'visible';
  const channel = {
    status: 'unavailable', sessionId: undefined,
    onStatus(receive) { statuses.add(receive); receive(this.status); return () => statuses.delete(receive); },
    watchLibrary(request) { calls.push(['watchLibrary', request]); return Promise.resolve({ levelIds: request.ids }); },
    openFromId(request) { calls.push(['openFromId', request]); return Promise.resolve({ jobId: request.id, updatedAtUnixMs: 1 }); },
    cancelJob(request) { calls.push(['cancelJob', request]); return Promise.resolve({ jobId: request.jobId, cancelled: true }); },
    cancelCheckAll() { calls.push(['cancelCheckAll']); return Promise.resolve({ state: 'cancelled' }); },
    cancelUpdateAll() { calls.push(['cancelUpdateAll']); return Promise.resolve({ state: 'cancelled' }); },
    cancelChange() { calls.push(['cancelChange']); return Promise.resolve({ state: 'cancelled' }); },
    libraryPage(request) { calls.push(['libraryPage', request]); return Promise.resolve({ items: [], revision: 1 }); },
    setTempDownloadMode(request) { calls.push(['setTempDownloadMode', request]); return Promise.resolve({ tempDownloadMode: request.enabled, tempDirectory: '/mod/Downloads/temp' }); },
    flushTemp() { calls.push(['flushTemp']); return Promise.resolve({ tempDownloadMode: true, tempDirectory: '/mod/Downloads/temp' }); },
    deleteLevel(request) { calls.push(['deleteLevel', request]); return Promise.resolve({ ok: true, id: request.id, deleted: true }); },
    pickFolder(request) {
      calls.push(['pickFolder', request]);
      handlers.folderSelection({ selection: { operationId: 'picker', state: 'selected', selectionToken: 'grant' } });
      return Promise.resolve({ operationId: 'picker', state: 'picking' });
    },
  };
  const app = {
    appId: 'app', checks: 0, closes: 0,
    use(contract, implementations) { handlers = implementations; onUse?.({ channel, handlers }); return channel; },
    ready(sessionId = 'session') { channel.status = 'ready'; channel.sessionId = sessionId; statuses.forEach((receive) => receive('ready')); },
    unavailable(error) { channel.status = 'unavailable'; channel.sessionId = undefined; statuses.forEach((receive) => receive('unavailable', error)); },
    initializing() { channel.status = 'initializing'; statuses.forEach((receive) => receive('initializing')); },
    checkConnection() { this.checks++; },
    dispose() { this.closes++; },
    push(name, payload) { handlers[name](payload); },
  };
  const port = createIpcPort({ registerApp: () => app, contract: {}, browser, page });
  return { port, app, channel, calls, statuses, browser, page };
}

test('a late registered snapshot recovers after readiness timeout without recreating the app', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port, timeoutMs: 10 });
  await assert.rejects(session.connect(), (error) => error.code === 'TIMEOUT');
  h.app.ready();
  assert.equal(session.getSnapshot().connected, false);
  h.app.push('snapshot', { state: snapshot(1) });
  assert.equal(session.getSnapshot().connected, true);
  h.app.unavailable();
  assert.equal(session.getSnapshot().connected, false);
  h.app.ready('session-2');
  h.app.push('jobsChanged', { jobs: [{ jobId: 'before-snapshot' }] });
  assert.deepEqual(session.getSnapshot().jobs, []);
  h.app.push('snapshot', { state: snapshot(2) });
  assert.equal(session.getSnapshot().summary.revision, 2);
  assert.equal(h.app.closes, 0);
  session.close(); assert.equal(h.app.closes, 1);
});

test('initial registration progress keeps the application readiness wait pending', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const connected = session.connect();
  await tick(); h.app.initializing(); await tick();
  assert.equal(session.getSnapshot().connected, false);
  h.app.ready(); h.app.push('snapshot', { state: snapshot() });
  await connected;
  assert.equal(session.getSnapshot().connected, true);
  session.close();
});

test('foreground checks respect visibility and close releases browser and SDK listeners', async () => {
  const h = harness(); await h.port.open(() => {}, () => {});
  h.browser.dispatchEvent(new Event('focus')); h.browser.dispatchEvent(new Event('pageshow'));
  h.page.visibilityState = 'hidden'; h.browser.dispatchEvent(new Event('focus'));
  h.page.visibilityState = 'visible'; h.page.dispatchEvent(new Event('visibilitychange'));
  h.browser.dispatchEvent(new Event('online'));
  assert.equal(h.app.checks, 4);
  h.port.close(); h.browser.dispatchEvent(new Event('focus')); h.browser.dispatchEvent(new Event('online'));
  assert.equal(h.app.checks, 4); assert.equal(h.statuses.size, 0);
  assert.equal(h.app.closes, 1);
});

test('initial snapshot handlers exist before registration and buffered snapshots await readiness', async () => {
  const h = harness(({ handlers }) => { assert.equal(typeof handlers.snapshot, 'function'); });
  const messages = [];
  await h.port.open((name) => messages.push(name), () => {});
  h.app.push('snapshot', { state: snapshot() });
  assert.deepEqual(messages, []);
  h.app.ready();
  assert.deepEqual(messages, ['snapshot']); h.port.close();
});

test('generated results retain independent correlation and explicit cancels use their methods', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const connected = session.connect(); h.app.ready(); h.app.push('snapshot', { state: snapshot() }); await connected;
  const first = session.openById('10'); const second = session.openById('20');
  assert.equal((await first).jobId, '10'); assert.equal((await second).jobId, '20');
  assert.equal((await session.cancelJob('10')).cancelled, true);
  assert.equal((await session.cancelCheckAll()).state, 'cancelled');
  assert.equal((await session.cancelUpdateAll()).state, 'cancelled');
  assert.equal((await session.cancelChange()).state, 'cancelled');
  assert.ok(h.calls.some(([name, request]) => name === 'cancelJob' && request.jobId === '10'));
  assert.ok(h.calls.some(([name]) => name === 'cancelCheckAll'));
  assert.ok(h.calls.some(([name]) => name === 'cancelUpdateAll'));
  assert.ok(h.calls.some(([name]) => name === 'cancelChange'));
  session.close();
});

test('targeted membership and early folder selection keep their domain behavior', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const unwatch = session.watchLevel('5'); const connected = session.connect();
  h.app.ready(); h.app.push('snapshot', { state: snapshot() }); await connected;
  await tick();
  assert.deepEqual(session.getSnapshot().levelIds, ['5']);
  const picker = await session.pickFolder(true);
  assert.equal((await session.waitForFolder(picker.operationId)).selectionToken, 'grant');
  unwatch(); session.close();
});

test('disconnect drops stale results and reconnect sends fresh interests without replaying mutations', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const connected = session.connect(); h.app.ready(); h.app.push('snapshot', { state: snapshot() }); await connected;
  let resolve;
  h.channel.openFromId = (request) => { h.calls.push(['openFromId', request]); return new Promise((finish) => { resolve = finish; }); };
  const pending = session.openById('old'); const rejected = assert.rejects(pending, /interrupted/);
  await tick(); h.app.unavailable(); await rejected;
  h.app.ready('new-session'); h.app.push('snapshot', { state: snapshot(2) });
  resolve({ jobId: 'old', done: false }); await tick();
  assert.equal(session.getSnapshot().jobs.some((job) => job.jobId === 'old'), false);
  assert.equal(h.calls.filter(([name]) => name === 'openFromId').length, 1);
  session.close();
});

test('generated call errors preserve the domain code', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const connected = session.connect(); h.app.ready(); h.app.push('snapshot', { state: snapshot() }); await connected;
  h.channel.libraryPage = () => Promise.reject(Object.assign(new Error('Reload the library.'), { code: 'download_library_cursor_stale' }));
  await assert.rejects(session.page({ cursor: 'stale' }), (error) => error.code === 'download_library_cursor_stale');
  session.close();
});

test('settings and deletion use generated methods and unsolicited settings reach the snapshot', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port });
  const connected = session.connect(); h.app.ready(); h.app.push('snapshot', { state: snapshot() }); await connected;
  const enabled = await session.setTempDownloadMode(true);
  assert.equal(enabled.tempDownloadMode, true);
  assert.equal(session.getSnapshot().settings.tempDownloadMode, true);
  assert.equal((await session.flushTemp()).tempDirectory, '/mod/Downloads/temp');
  assert.deepEqual(await session.deleteLevel('123'), { ok: true, id: '123', deleted: true });
  assert.deepEqual(h.calls.filter(([name]) => ['setTempDownloadMode', 'flushTemp', 'deleteLevel'].includes(name)), [
    ['setTempDownloadMode', { enabled: true }], ['flushTemp'], ['deleteLevel', { id: '123' }],
  ]);
  h.app.push('settingsChanged', { settings: { tempDownloadMode: false, tempDirectory: '/mod/Downloads/temp' } });
  assert.equal(session.getSnapshot().settings.tempDownloadMode, false);
  session.close();
});
