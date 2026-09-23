// tuf-search: #replayDeliveryTest
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// Node's native ESM test runner requires the explicit extension.
// eslint-disable-next-line import/extensions
import { playerMessageSchema, replayOpenPayload } from '../src/pages/common/Pass/PassDetailPage/replay/replayDelivery.js';

const runId = '00000000-0000-4000-8000-000000000001';
test('host sends identity only, independent of replay formats and visual sources', () => {
  assert.deepEqual(replayOpenPayload({ id: '123', level: { id: 45 }, autoSubmissionRunId: runId, visuals: { source: 'future-source' } }),
    { runId, passId: 123, levelId: 45 });
  assert.throws(() => replayOpenPayload({ id: 0, levelId: 45, autoSubmissionRunId: runId }));
});
test('host accepts new player events without understanding their payload', () => {
  const envelope = { source: 'tuf-replay', protocolVersion: 3, sessionId: runId, type: 'player.future', payload: { future: true } };
  assert.equal(playerMessageSchema.safeParse(envelope).success, true);
  assert.equal(playerMessageSchema.safeParse({ ...envelope, protocolVersion: 2 }).success, false);
  assert.equal(playerMessageSchema.safeParse({ ...envelope, source: 'foreign' }).success, false);
});
test('host hook never downloads payloads and validates both message origin and window', () => {
  const source = readFileSync(new URL('../src/pages/common/Pass/PassDetailPage/replay/usePassReplay.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|arrayBuffer|loadReplay|transferables/i);
  assert.ok(source.includes('event.origin !== current.config.player'));
  assert.ok(source.includes('event.source !== iframeRef.current?.contentWindow'));
  assert.ok(source.includes('host.open'));
  assert.ok(source.includes('host.dispose'));
});
