import assert from 'node:assert/strict';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { AUTORATER_USER_ID, isAutoraterDetail, autoraterResizeHeight } from '../src/utils/autorater.js';

test('only the AutoRater account receives the widget and replacement avatar', () => {
  assert.equal(isAutoraterDetail({ userId: AUTORATER_USER_ID }), true);
  assert.equal(isAutoraterDetail({ user: { id: AUTORATER_USER_ID } }), true);
  assert.equal(isAutoraterDetail({ userId: 'human', user: { username: 'AutoRater' } }), false);
  assert.equal(isAutoraterDetail(null), false);
});

test('resize accepts only the selected chart from the expected iframe and origin', () => {
  const source = {};
  const origin = 'https://www.auto-rater-cat.com';
  const event = { source, origin, data: { type: 'auto-rater-cat:resize', levelId: 16931, height: 912.2 } };
  const height = (input) => autoraterResizeHeight(input, source, origin, 16931);
  assert.equal(height(event), 913);
  assert.equal(height({ ...event, origin: 'https://example.com' }), null);
  assert.equal(height({ ...event, source: {} }), null);
  for (const data of [null, { ...event.data, levelId: 17158 }, { ...event.data, height: NaN },
    { ...event.data, height: '900' }, { ...event.data, type: 'other' }]) {
    assert.equal(height({ ...event, data }), null);
  }
  assert.equal(height({ ...event, data: { ...event.data, height: 10 } }), 300);
  assert.equal(height({ ...event, data: { ...event.data, height: 99999 } }), 2400);
});
