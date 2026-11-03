import assert from 'node:assert/strict';
import test from 'node:test';
// eslint-disable-next-line import/extensions
import { pguBandFromAutoraterRating, autoraterHideBand } from '../src/utils/ratingRequestBand.js';
// eslint-disable-next-line import/extensions
import { AUTORATER_USER_ID } from '../src/utils/autorater.js';

test('P0 belongs to the P filter band in plain and AutoRater display strings', () => {
  for (const rating of ['P0', 'P0 (P0, P0, P0, P0)', 'P0 (P0, P1, P0, P1)']) {
    assert.equal(pguBandFromAutoraterRating(rating), 'P');
    assert.equal(autoraterHideBand({details: [
      {userId: AUTORATER_USER_ID, rating, isCommunityRating: false},
    ]}), 'P');
  }
});

test('the filter uses the AutoRater average and excludes human and community votes', () => {
  assert.equal(pguBandFromAutoraterRating('G1 low (P0, G1, P20, G2)'), 'G');
  assert.equal(pguBandFromAutoraterRating('U1 high (U1, U2, G20, U1)'), 'U');
  assert.equal(pguBandFromAutoraterRating('P20'), 'P');
  assert.equal(autoraterHideBand({details: [
    {userId: 'human', rating: 'P0', isCommunityRating: false},
    {userId: AUTORATER_USER_ID, rating: 'P0', isCommunityRating: true},
  ]}), null);
  for (const rating of [null, '', 'Censored', 'Impossible', 'G0', 'U0', 'P00', 'P21']) {
    assert.equal(pguBandFromAutoraterRating(rating), null);
  }
});
