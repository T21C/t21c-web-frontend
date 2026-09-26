import assert from 'node:assert/strict';
import test from 'node:test';
import { availableDefaults, visualSettingsSchema } from './replayVisualSettings.js';

test('hidden, deleted and wrong-kind presets clear only their own default slot', () => {
  const key = '00000000-0000-4000-8000-000000000001';
  const overlay = '00000000-0000-4000-8000-000000000002';
  const defaults = { keyviewer_id: key, overlay_id: overlay };
  const presets = [
    { id: key, name: 'keys', kind: 'keyviewer', source: 'dmnote', is_hidden: true },
    { id: overlay, name: 'overlay', kind: 'overlay', source: 'jipper-resourcepack', is_hidden: false },
  ];
  assert.equal(visualSettingsSchema.safeParse({ defaults, presets }).success, true);
  assert.deepEqual(availableDefaults(defaults, presets), { keyviewer_id: null, overlay_id: overlay });
  assert.deepEqual(defaults, { keyviewer_id: key, overlay_id: overlay });
  assert.deepEqual(availableDefaults({ keyviewer_id: overlay, overlay_id: key }, presets), { keyviewer_id: null, overlay_id: null });
  assert.deepEqual(availableDefaults(defaults, []), { keyviewer_id: null, overlay_id: null });
});
