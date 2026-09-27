// tuf-search: #passJudgementHitCount #judgements #tilecount
// Mirrors server CalcAcc.tilecount / auditPassJudgements totalHits (excludes earlyDouble, lateDouble).

import { ADOFAI_VERSION } from './adofaiVersion';

function num(v) {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sum of hits that count toward chart tilecount from pass submission form fields.
 * Excludes `tooEarly` (early double — miss).
 */
export function getPassJudgementHitCountFromForm(form) {
  if (!form) return 0;
  return (
    num(form.early) +
    num(form.ePerfect) +
    num(form.perfectMinus) +
    num(form.perfect) +
    num(form.perfectPlus) +
    num(form.lPerfect) +
    num(form.late)
  );
}

/**
 * Sum from persisted/API judgement keys (PassSubmission judgements shape).
 * Excludes earlyDouble and lateDouble.
 */
export function getPassJudgementHitCountFromSubmissionJudgements(j) {
  if (!j) return 0;
  return (
    num(j.earlySingle) +
    num(j.ePerfect) +
    num(j.perfectMinus) +
    num(j.perfect) +
    num(j.perfectPlus) +
    num(j.lPerfect) +
    num(j.lateSingle)
  );
}

/**
 * Achievable manual judgements: persisted tilecount (excludes non-auto midspins)
 * minus auto-play tiles (including auto-range midspins).
 * `midspinCount` is ignored so existing call sites do not need a sweep.
 */
export function getEffectiveTilecount(levelTilecount, autoTileCount = 0, _midspinCount = 0) {
  if (levelTilecount == null) return null;
  const tc = typeof levelTilecount === 'number' ? levelTilecount : Number(levelTilecount);
  if (!Number.isFinite(tc)) return null;
  const tileInt = Math.floor(tc);
  const autoInt = Math.floor(num(autoTileCount));
  return Math.max(tileInt - autoInt, 0);
}

/**
 * Suffix for tilecount-mismatch i18n keys (`''` or `WithAuto`).
 * Midspins are already excluded from persisted tilecount.
 */
export function getTilecountMismatchI18nSuffix(autoTileCount = 0, _midspinCount = 0) {
  const hasAuto = Math.floor(num(autoTileCount)) > 0;
  if (hasAuto) return 'WithAuto';
  return '';
}

/**
 * When to warn: level has a positive achievable tilecount and it does not equal hit sum.
 */
export function isTilecountJudgementMismatch(levelTilecount, hitCount, autoTileCount = 0, midspinCount = 0) {
  const effective = getEffectiveTilecount(levelTilecount, autoTileCount, midspinCount);
  if (effective == null || effective <= 0) return false;
  const hits = typeof hitCount === 'number' && Number.isFinite(hitCount) ? Math.floor(hitCount) : 0;
  return hits !== effective;
}

/**
 * Alpha (3.4.0+) selected, but the entered hit total is exactly achievable
 * tiles plus midspins — the pre-3.4.0 count that still includes midspins.
 */
export function isIncludedMidspinOnLatestVersion({
  adofaiVersion,
  levelTilecount,
  autoTileCount = 0,
  midspinCount = 0,
  hitCount,
  perfect,
} = {}) {
  if (adofaiVersion !== ADOFAI_VERSION.V3_4_0) return false;
  const midspin = Math.floor(num(midspinCount));
  if (midspin <= 0) return false;
  const effective = getEffectiveTilecount(levelTilecount, autoTileCount);
  if (effective == null || effective <= 0) return false;
  const hits = typeof hitCount === 'number' && Number.isFinite(hitCount) ? Math.floor(hitCount) : 0;
  if (hits !== effective + midspin) return false;
  return Math.floor(num(perfect)) >= midspin;
}
