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
 * Achievable manual judgements.
 * Persisted tilecount is path length minus non-auto midspins, so `midspinCount`
 * must not be subtracted again. Auto tiles, including auto-range midspins, are
 * still inside that count and are removed here.
 * Example: 2579 tiles, 26 auto, 16 midspin → 2553 judgements.
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
 * Suffix for tilecount-mismatch i18n keys.
 * Midspins are already excluded from the achievable count; the suffix only
 * names them alongside any auto tiles that were subtracted.
 */
export function getTilecountMismatchI18nSuffix(autoTileCount = 0, midspinCount = 0) {
  const hasAuto = Math.floor(num(autoTileCount)) > 0;
  const hasMidspin = Math.floor(num(midspinCount)) > 0;
  if (hasAuto && hasMidspin) return 'WithAutoAndMidspin';
  if (hasAuto) return 'WithAuto';
  if (hasMidspin) return 'WithMidspin';
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
 * 3.4.0 selected, but the entered hit total is exactly achievable
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

/** Inputs that add up to achievable tilecount. `tooEarly` is a miss and is left out. */
const TILECOUNT_JUDGEMENT_FIELDS = ['ePerfect', 'perfect', 'lPerfect', 'early', 'late'];
const XPERFECT_TILECOUNT_JUDGEMENT_FIELDS = ['perfectMinus', 'perfect', 'perfectPlus', 'ePerfect', 'lPerfect', 'early', 'late'];
const OTHER_PURE_PERFECT_FIELDS = ['ePerfect', 'lPerfect', 'tooEarly', 'early', 'late'];
const XPERFECT_OTHER_PURE_PERFECT_FIELDS = ['perfectMinus', 'perfectPlus', 'ePerfect', 'lPerfect', 'tooEarly', 'early', 'late'];

function parseCountingInput(value) {
  if (value == null) return { state: 'empty' };
  const text = String(value).trim();
  if (text === '') return { state: 'empty' };
  if (!/^\d+$/.test(text)) return { state: 'invalid' };
  return { state: 'filled', count: parseInt(text, 10) };
}

/**
 * The one blank judgement whose count is fixed by the achievable tilecount
 * minus judgements already entered. Misses do not count, so a blank `tooEarly`
 * neither receives the fill nor blocks it. Returns null when that difference
 * is not uniquely determined (unknown tilecount, more than one blank counting
 * field, a non-numeric entry, or a negative remainder).
 *
 * @returns {{ field: string, value: number } | null}
 */
export function getJudgementRemainderFill(values, achievableCount, { includeXPerfect = false } = {}) {
  if (achievableCount == null || achievableCount === '') return null;
  const target = typeof achievableCount === 'number' ? achievableCount : Number(achievableCount);
  if (!Number.isFinite(target) || target < 0) return null;
  const achievable = Math.floor(target);
  const fields = includeXPerfect ? XPERFECT_TILECOUNT_JUDGEMENT_FIELDS : TILECOUNT_JUDGEMENT_FIELDS;

  let emptyField = null;
  let filledSum = 0;
  for (const field of fields) {
    const parsed = parseCountingInput(values?.[field]);
    if (parsed.state === 'invalid') return null;
    if (parsed.state === 'empty') {
      if (emptyField != null) return null;
      emptyField = field;
      continue;
    }
    filledSum += parsed.count;
  }

  if (emptyField == null) return null;
  const value = achievable - filledSum;
  if (value < 0) return null;
  return { field: emptyField, value };
}

/**
 * Empty counting judgements (not misses) when the filled ones already equal
 * the achievable tilecount. A click should zero every returned field.
 *
 * @returns {string[] | null}
 */
export function getJudgementZeroRemainderFields(values, achievableCount, { includeXPerfect = false } = {}) {
  if (achievableCount == null || achievableCount === '') return null;
  const target = typeof achievableCount === 'number' ? achievableCount : Number(achievableCount);
  if (!Number.isFinite(target) || target < 0) return null;
  const achievable = Math.floor(target);
  const fields = includeXPerfect ? XPERFECT_TILECOUNT_JUDGEMENT_FIELDS : TILECOUNT_JUDGEMENT_FIELDS;

  const emptyFields = [];
  let filledSum = 0;
  for (const field of fields) {
    const parsed = parseCountingInput(values?.[field]);
    if (parsed.state === 'invalid') return null;
    if (parsed.state === 'empty') {
      emptyFields.push(field);
      continue;
    }
    filledSum += parsed.count;
  }

  if (emptyFields.length === 0) return null;
  if (filledSum !== achievable) return null;
  return emptyFields;
}

/**
 * Pure Perfect shortcut is only useful on a blank Perfect with no other hits.
 * A filled Perfect (including 0) or any other non-zero judgement hides it.
 */
export function shouldShowPurePerfectAutofill(values, { includeXPerfect = false } = {}) {
  if (String(values?.perfect ?? '').trim() !== '') return false;
  const others = includeXPerfect ? XPERFECT_OTHER_PURE_PERFECT_FIELDS : OTHER_PURE_PERFECT_FIELDS;
  for (const field of others) {
    const parsed = parseCountingInput(values?.[field]);
    if (parsed.state === 'filled' && parsed.count !== 0) return false;
  }
  return true;
}
