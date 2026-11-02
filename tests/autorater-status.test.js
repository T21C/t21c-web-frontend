import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAutoraterStatus, validateAutoraterStatus } from '../src/utils/autoraterStatus.js';

const result = { level_id: 17646, status: 'current', outdated: false, warning_count: 0,
  warnings: [], warnings_status: 'complete' };

test('unknown and partial warnings never become a complete empty scan', () => {
  assert.equal(validateAutoraterStatus(result, 17646), result);
  for (const change of [
    { level_id: 10 }, { outdated: true }, { warning_count: 5 },
    { warnings: [{}] }, { warnings_status: 'unavailable' },
  ]) assert.throws(() => validateAutoraterStatus({ ...result, ...change }, 17646));
  const unknown = { ...result, status: 'unverified', outdated: null, warning_count: null, warnings_status: 'unavailable' };
  assert.equal(validateAutoraterStatus(unknown, 17646), unknown);
  const missing = { ...unknown, status: 'outdated', outdated: true, reason: 'missing_record' };
  assert.equal(validateAutoraterStatus(missing, 17646), missing);
});

test('coalesces in-flight requests, encodes the displayed vote and refetches on reopening', async t => {
  let calls = 0;
  const rating = 'U8 low (U8, U7, U7, U9)';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/embed/tuf/17646/status');
    assert.equal(parsed.searchParams.get('rating'), rating);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => result };
  });
  const first = fetchAutoraterStatus('https://www.auto-rater-cat.com', 17646, rating);
  const second = fetchAutoraterStatus('https://www.auto-rater-cat.com', 17646, rating);
  assert.equal(first, second);
  assert.equal(await first, result);
  assert.equal(calls, 1);
  await fetchAutoraterStatus('https://www.auto-rater-cat.com', 17646, rating);
  assert.equal(calls, 2);
});

test('failed requests can be retried without keeping a rejected cache entry', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));
  await assert.rejects(fetchAutoraterStatus('https://www.auto-rater-cat.com', 17646, 'G1'));
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => result }));
  assert.equal(await fetchAutoraterStatus('https://www.auto-rater-cat.com', 17646, 'G1'), result);
});
