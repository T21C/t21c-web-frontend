// tuf-search: #passJudgementHitCount #judgements #tilecount
// Mirrors server CalcAcc.tilecount / auditPassJudgements totalHits (excludes earlyDouble, lateDouble).

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
    num(form.perfect) +
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
    num(j.perfect) +
    num(j.lPerfect) +
    num(j.lateSingle)
  );
}

/**
 * Achievable manual judgements: chart tilecount minus auto-play tiles.
 */
export function getEffectiveTilecount(levelTilecount, autoTileCount = 0) {
  if (levelTilecount == null) return null;
  const tc = typeof levelTilecount === 'number' ? levelTilecount : Number(levelTilecount);
  if (!Number.isFinite(tc)) return null;
  const tileInt = Math.floor(tc);
  const autoInt = Math.floor(num(autoTileCount));
  return Math.max(tileInt - autoInt, 0);
}

/**
 * When to warn: level has a positive achievable tilecount and it does not equal hit sum.
 */
export function isTilecountJudgementMismatch(levelTilecount, hitCount, autoTileCount = 0) {
  const effective = getEffectiveTilecount(levelTilecount, autoTileCount);
  if (effective == null || effective <= 0) return false;
  const hits = typeof hitCount === 'number' && Number.isFinite(hitCount) ? Math.floor(hitCount) : 0;
  return hits !== effective;
}
