// tuf-search: #replayDeliveryTest
// ESLint's node resolver does not recognize Bun's built-in test module.
// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from 'bun:test';
import { defaultReplaySettings, playerMessageSchema, replayManifestSchema, replaySettingsSchema } from '../src/pages/common/Pass/PassDetailPage/replay/replayDelivery';
import { interpolateReplayPosition } from '../src/pages/common/Pass/PassDetailPage/replay/useReplayPosition';

const envelope = payload => ({ source: 'tuf-replay', protocolVersion: 1, sessionId: '00000000-0000-4000-8000-000000000001', type: 'player.state', payload });
const state = { positionUs: 100000, durationUs: 1000000, paused: false, ended: false, appliedCommandId: 1, settings: defaultReplaySettings };

describe('replay host contract', () => {
  test('requires a versioned gameplay hash in public replay manifests', () => {
    const manifest = {
      format_version: 2, run_id: '00000000-0000-4000-8000-000000000001', tuf_level_id: 1,
      external_pass_id: 1, official_file_id: 'old-file', chart_path: 'main.adofai',
      chart_sha256: 'a'.repeat(64), gameplay_hash_version: 1, gameplay_hash: 'b'.repeat(64),
      evidence_digest: 'c'.repeat(64), recorded_speed: 1,
      files: ['inputs', 'hits', 'metadata'].map((kind, index) => ({
        name: `${kind}.${kind === 'metadata' ? 'json' : 'csv'}`, kind,
        media_type: 'text/plain', url: `/files/${index}`, sha256: 'd'.repeat(64), bytes: 1, records: 1,
      })),
    };
    expect(replayManifestSchema.safeParse(manifest).success).toBe(true);
    expect(replayManifestSchema.safeParse({ ...manifest, gameplay_hash: undefined }).success).toBe(false);
  });
  test('accepts complete state and rejects incompatible protocol and malformed values', () => {
    expect(playerMessageSchema.safeParse(envelope(state)).success).toBe(true);
    expect(playerMessageSchema.safeParse({ ...envelope(state), protocolVersion: 2 }).success).toBe(false);
    expect(playerMessageSchema.safeParse(envelope({ ...state, positionUs: -1 })).success).toBe(false);
    expect(playerMessageSchema.safeParse(envelope({ ...state, settings: { ...defaultReplaySettings, pitchPercent: 0 } })).success).toBe(false);
    expect(replaySettingsSchema.safeParse({ ...defaultReplaySettings, unknownControl: true }).success).toBe(false);
  });
  test('interpolates in recorded microseconds using pitch and clamps to duration', () => {
    expect(interpolateReplayPosition(state, 250)).toBe(350000);
    expect(interpolateReplayPosition({ ...state, settings: { pitchPercent: 200 } }, 250)).toBe(600000);
    expect(interpolateReplayPosition(state, 2000)).toBe(1000000);
    expect(interpolateReplayPosition({ ...state, paused: true }, 2000)).toBe(100000);
    expect(interpolateReplayPosition(state, -100)).toBe(100000);
  });
});
