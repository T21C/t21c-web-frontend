// ESLint's node resolver does not recognize Bun's built-in test module.
// eslint-disable-next-line import/no-unresolved
import { expect, test } from 'bun:test';
import JSZip from 'jszip';
import { selectReplayChart } from '../src/pages/common/Pass/PassDetailPage/replay/selectReplayChart';

test('uses the exact recorded path when it still exists', async () => {
  const zip = await JSZip.loadAsync(await new JSZip().file('main.adofai', 'small').file('other.adofai', 'much larger').generateAsync({ type: 'arraybuffer' }));
  expect((await selectReplayChart(zip, 'main.adofai')).path).toBe('main.adofai');
});

test('falls back to the largest chart after a harmless filename change', async () => {
  const zip = await JSZip.loadAsync(await new JSZip().file('backup.adofai', 'small').file('renamed.adofai', 'the current gameplay chart').generateAsync({ type: 'arraybuffer' }));
  expect((await selectReplayChart(zip, 'main.adofai')).path).toBe('renamed.adofai');
});
