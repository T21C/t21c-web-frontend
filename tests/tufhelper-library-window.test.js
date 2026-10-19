import assert from 'node:assert/strict';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { removeDownloadedLevel } from '../src/components/common/TufHelperLiteDownloadManager/downloadLevelWindowState.js';

const windowAt = (positioned = true) => ({
  positioned, revision: 7, firstItemIndex: 1000000, totalCount: 80,
  pages: [20, 40, 60].map((startIndex) => ({
    startIndex, totalCount: 80, requestCursor: `opaque-${startIndex}`, revision: 7,
    items: Array.from({ length: 20 }, (_, offset) => ({ id: startIndex + offset, name: `Level ${startIndex + offset}` })),
  })),
});

test('deleting a visible level retains other loaded rows and shifts later absolute positions', () => {
  const current = windowAt();
  const next = removeDownloadedLevel(current, '45');
  assert.equal(next.totalCount, 79);
  assert.deepEqual(next.pages.map((page) => page.startIndex), [20, 40, 59]);
  assert.equal(next.pages.flatMap((page) => page.items).length, 59);
  assert.equal(next.pages.some((page) => page.items.some((item) => item.id === 45)), false);
  assert.equal(next.pages[0].items[0], current.pages[0].items[0]);
  assert.equal(next.pages[2].items[0], current.pages[2].items[0]);
  assert.equal(current.pages[1].items.length, 20, 'the previous render snapshot was mutated');
});

test('a completed background refresh cannot cause a second removal or count decrement', () => {
  const current = removeDownloadedLevel(windowAt(), 45);
  assert.equal(removeDownloadedLevel(current, 45), current);
  assert.equal(removeDownloadedLevel(current, 999), current);
});

test('removing the last loaded level leaves the existing window identity and cursors available for refresh', () => {
  const current = { ...windowAt(false), totalCount: 1, pages: [{ items: [{ id: 1 }], requestCursor: null }] };
  const next = removeDownloadedLevel(current, 1);
  assert.equal(next.firstItemIndex, current.firstItemIndex);
  assert.equal(next.revision, current.revision);
  assert.equal(next.totalCount, 0);
  assert.deepEqual(next.pages[0].items, []);
  assert.equal(next.pages[0].requestCursor, null);
});
