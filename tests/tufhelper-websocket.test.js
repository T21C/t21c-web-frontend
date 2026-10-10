import assert from 'node:assert/strict';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { createWebSocketPort } from '../src/features/tufhelperlite/adapters/createWebSocketPort.js';
// eslint-disable-next-line import/extensions
import { createHelperSession } from '../src/features/tufhelperlite/application/createHelperSession.js';

function harness() {
  const events = new Map(); const states = new Set(); const statuses = new Set();
  const browser = new EventTarget(); const page = new EventTarget(); page.visibilityState = 'visible';
  const channel = {
    status: 'initializing',
    on(name, receive) { events.set(name, receive); return () => events.delete(name); },
    onStatus(receive) { statuses.add(receive); receive(this.status); return () => statuses.delete(receive); },
    send() { return 'command'; },
  };
  const client = {
    state: 'disconnected', checks: 0, closes: 0,
    namespace() { return channel; },
    onState(receive) { states.add(receive); receive(this.state); return () => states.delete(receive); },
    async start() { this.change('reconnecting'); },
    change(state) { this.state = state; states.forEach((receive) => receive(state)); },
    ready(status) { channel.status = status; statuses.forEach((receive) => receive(status)); },
    checkConnection() { this.checks++; },
    close() { this.closes++; this.change('closed'); },
  };
  const port = createWebSocketPort({ createConnection: () => client, browser, page });
  return { port, client, events, states, statuses, browser, page };
}

test('a late game snapshot recovers after application readiness timeout without a new port', async () => {
  const h = harness(); const session = createHelperSession({ createPort: () => h.port, timeoutMs: 10 });
  await assert.rejects(session.connect(), (error) => error.code === 'TIMEOUT');
  h.client.change('connected');
  assert.equal(session.getSnapshot().connected, false);
  h.client.ready('ready');
  h.events.get('snapshot')({ health: {}, jobs: [], summary: { revision: 1 } });
  assert.equal(session.getSnapshot().connected, true);
  h.client.change('reconnecting'); h.client.ready('unavailable');
  assert.equal(session.getSnapshot().connected, false);
  h.client.change('connected'); h.client.ready('ready');
  h.events.get('snapshot')({ health: {}, jobs: [], summary: { revision: 2 } });
  assert.equal(session.getSnapshot().summary.revision, 2);
  assert.equal(h.client.closes, 0);
  session.close(); assert.equal(h.client.closes, 1);
});

test('foreground checks respect visibility and close releases browser and SDK listeners', async () => {
  const h = harness(); await h.port.open(() => {}, () => {});
  h.browser.dispatchEvent(new Event('focus')); h.browser.dispatchEvent(new Event('pageshow'));
  h.page.visibilityState = 'hidden'; h.browser.dispatchEvent(new Event('focus'));
  h.page.visibilityState = 'visible'; h.page.dispatchEvent(new Event('visibilitychange'));
  h.browser.dispatchEvent(new Event('online'));
  assert.equal(h.client.checks, 4);
  h.port.close(); h.browser.dispatchEvent(new Event('focus')); h.browser.dispatchEvent(new Event('online'));
  assert.equal(h.client.checks, 4); assert.equal(h.events.size, 0);
  assert.equal(h.states.size, 0); assert.equal(h.statuses.size, 0);
});

test('snapshot listeners exist before initial discovery can deliver any state', async () => {
  const h = harness(); const messages = [];
  h.client.start = async () => {
    h.client.change('connected'); h.client.ready('ready');
    h.events.get('snapshot')({ jobs: [] });
  };
  await h.port.open((name) => messages.push(name), () => {});
  assert.deepEqual(messages, ['snapshot']); h.port.close();
});
