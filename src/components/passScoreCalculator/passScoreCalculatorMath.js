// tuf-search: #passScoreCalculatorMath #passScoreCalculator
import calcAcc from '@/utils/CalcAcc';
import {
  getScoreV2,
  getSpeedMtp,
  resolveScoreBase,
  scoreV2MtpFromMisses,
  SCORE_V2_ZERO_MISS_MULTIPLIER,
} from '@/utils/CalcScore';
import { computePassScoreV2, buildLevelScoreContext } from '@/utils/scoreService';
import {
  resolveXaccCurveForLevelData,
  xaccMultiplier,
} from '@/utils/scoreV2XaccCurve';
import { getEffectiveTilecount } from '@/utils/passJudgementHitCount';

const MISS_BUDGET_CAP = 10;
const RANKED_TOP_N = 20;
const RANKED_DECAY = 0.9;

function formatLevelNum(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

/**
 * Display values for scoring override fields, taken from the selected level.
 */
export function scoringDefaultsFromLevel(level, difficultyDict = {}) {
  if (!level) {
    return {
      baseScore: '',
      ppBaseScore: '',
      tilecount: '',
    };
  }
  const diff = difficultyDict?.[level.diffId] || level.difficulty || {};
  const resolvedBase =
    Number(level.baseScore) > 0 ? level.baseScore : diff.baseScore;
  const effectiveTc = getEffectiveTilecount(level.tilecount, level.autoTileCount);
  return {
    baseScore: formatLevelNum(resolvedBase),
    ppBaseScore: formatLevelNum(level.ppBaseScore),
    tilecount: effectiveTc == null ? '' : String(effectiveTc),
  };
}

export function overrideInputValue(override, fallback) {
  if (override != null && String(override).trim() !== '') return override;
  return fallback ?? '';
}

function numericOverrideDiffers(override, fallback) {
  if (override == null || String(override).trim() === '') return false;
  if (fallback !== '' && Number(override) === Number(fallback)) return false;
  return true;
}

/** Speed steps for the speed × accuracy heatmap (inclusive). */
const SPEED_GRID_MIN = 1;
const SPEED_GRID_MAX = 2;
const SPEED_GRID_STEP = 0.01;

/** Accuracy sample count for heatmap (denser near 100%). */
const SPEED_GRID_ACC_COUNT = 36;
const SPEED_GRID_ACC_CUTOFF = 0.95;
/** >1 packs samples toward 100% (hyperbolic xacc region). */
const SPEED_GRID_ACC_POWER = 2.15;

/**
 * Accuracies from cutoff → 1 with denser spacing near 100%.
 * @param {number} count
 * @param {number} [cutoff]
 * @param {number} [power]
 */
export function buildLogishAccuracySteps(
  count = SPEED_GRID_ACC_COUNT,
  cutoff = SPEED_GRID_ACC_CUTOFF,
  power = SPEED_GRID_ACC_POWER,
) {
  const n = Math.max(2, Math.floor(count));
  const span = 1 - cutoff;
  /** Non-PP samples must stay strictly below 100%; only the final step is exact PP. */
  const nonPpCap = 1 - 1e-6;
  const out = [];
  for (let i = 0; i < n - 1; i += 1) {
    const t = i / (n - 1);
    const u = 1 - Math.pow(1 - t, power);
    out.push(Math.min(cutoff + span * u, nonPpCap));
  }
  out.push(1);
  return out;
}

/**
 * @param {number} [min]
 * @param {number} [max]
 * @param {number} [step]
 */
export function buildSpeedSteps(
  min = SPEED_GRID_MIN,
  max = SPEED_GRID_MAX,
  step = SPEED_GRID_STEP,
) {
  const out = [];
  const s = Math.max(0.01, step);
  for (let v = min; v <= max + s * 0.25; v += s) {
    out.push(Math.round(v * 1000) / 1000);
  }
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}

/**
 * @param {object} overrides
 * @param {object|null} level
 * @param {object} difficultyDict
 */
export function buildCalculatorLevelContext(level, overrides = {}, difficultyDict = {}) {
  const baseOverrides = {};
  const rawBaseScore =
    overrides.baseScore != null && String(overrides.baseScore).trim() !== ''
      ? overrides.baseScore
      : overrides.difficultyBaseScore;
  if (rawBaseScore !== undefined && rawBaseScore !== '' && Number.isFinite(Number(rawBaseScore))) {
    baseOverrides.baseScore = Number(rawBaseScore);
  }
  if (overrides.ppBaseScore !== undefined && overrides.ppBaseScore !== '' && Number.isFinite(Number(overrides.ppBaseScore))) {
    baseOverrides.ppBaseScore = Number(overrides.ppBaseScore);
  }
  if (overrides.diffId != null && overrides.diffId !== '') {
    baseOverrides.diffId = Number(overrides.diffId);
  }

  const hasLegacyCurveOverride =
    (overrides.cutoff != null && String(overrides.cutoff).trim() !== '') ||
    (overrides.poleOffset != null && String(overrides.poleOffset).trim() !== '') ||
    (overrides.topMultiplier != null && String(overrides.topMultiplier).trim() !== '');

  if (overrides.xaccCurveMeta || hasLegacyCurveOverride) {
    const existing = resolveXaccCurveForLevelData(level || {});
    baseOverrides.xaccCurveMeta = overrides.xaccCurveMeta || {
      cutoff: overrides.cutoff != null && overrides.cutoff !== '' ? Number(overrides.cutoff) : existing.cutoff,
      poleOffset:
        overrides.poleOffset != null && overrides.poleOffset !== ''
          ? Number(overrides.poleOffset)
          : existing.poleOffset,
      topMultiplier:
        overrides.topMultiplier != null && overrides.topMultiplier !== ''
          ? Number(overrides.topMultiplier)
          : existing.topMultiplier,
    };
  }

  const sandboxBase =
    Number(overrides.baseScore) || Number(overrides.difficultyBaseScore) || 0;
  const sandboxLevel = level || {
    baseScore: sandboxBase || null,
    ppBaseScore: null,
    difficulty: {
      baseScore: sandboxBase,
    },
    xaccCurveMeta: null,
    tilecount: overrides.tilecount != null && overrides.tilecount !== '' ? Number(overrides.tilecount) : null,
    autoTileCount: 0,
  };

  return buildLevelScoreContext(sandboxLevel, baseOverrides, difficultyDict);
}

/**
 * True when overrides change scoring away from the stored level (placement invalid).
 * Values that match the level are not treated as custom.
 */
export function isCustomScoring(level, overrides = {}, difficultyDict = {}) {
  if (!level?.id) return true;
  const o = overrides || {};
  const defaults = scoringDefaultsFromLevel(level, difficultyDict);
  if (numericOverrideDiffers(o.baseScore, defaults.baseScore)) return true;
  if (numericOverrideDiffers(o.ppBaseScore, defaults.ppBaseScore)) return true;
  if (numericOverrideDiffers(o.tilecount, defaults.tilecount)) return true;
  if (o.diffId != null && String(o.diffId).trim() !== '' && Number(o.diffId) !== Number(level.diffId)) {
    return true;
  }
  const keys = ['cutoff', 'poleOffset', 'topMultiplier'];
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') {
      return true;
    }
  }
  if (o.xaccCurveMeta) return true;
  return false;
}

function scoreBreakdown(passData, levelCtx, difficultyDict) {
  const judgements = passData.judgements;
  const accuracy = calcAcc(judgements);
  const base = resolveScoreBase(levelCtx, accuracy, difficultyDict);
  const curve = resolveXaccCurveForLevelData(levelCtx);
  const xaccMtp = xaccMultiplier(accuracy, base, curve);
  const speed = Number.isFinite(passData.speed) ? passData.speed : 1;
  const speedMtp = getSpeedMtp(speed);
  const missMtpRaw = scoreV2MtpFromMisses(
    Array.isArray(judgements) ? judgements[0] : 0,
    Array.isArray(judgements) ? judgements.slice(1).reduce((a, b) => a + (Number(b) || 0), 0) : 0,
  );
  const noHoldFactor = passData.isNoHoldTap ? 0.95 : 1;
  const missMtp = missMtpRaw * noHoldFactor;
  const scoreV2 = getScoreV2(passData, levelCtx, difficultyDict);
  return {
    scoreV2,
    accuracy,
    base,
    xaccMtp,
    speedMtp,
    missMtp: missMtpRaw,
    noHoldFactor,
    combinedMissMtp: missMtp,
  };
}

function withJudgements(basePass, judgements, patch = {}) {
  return {
    speed: basePass.speed,
    isNoHoldTap: basePass.isNoHoldTap,
    judgements,
    ...patch,
  };
}

/**
 * ScoreV2 at an exact accuracy fraction — does not round through integer judgements.
 * PP base / PP xacc branch only when accuracy is exactly 1.
 */
function scoreV2AtExactAccuracy({
  accuracy,
  speed,
  hitTiles,
  misses = 0,
  isNoHoldTap = false,
  levelCtx,
  difficultyDict,
}) {
  const acc = Number(accuracy) === 1 ? 1 : Number(accuracy);
  const base = resolveScoreBase(levelCtx, acc, difficultyDict);
  const curve = resolveXaccCurveForLevelData(levelCtx);
  const xaccMtp = xaccMultiplier(acc, base, curve);
  const speedMtp = getSpeedMtp(Number.isFinite(speed) ? speed : 1);
  const missMtp =
    scoreV2MtpFromMisses(misses, hitTiles) * (isNoHoldTap ? 0.95 : 1);
  return base * xaccMtp * speedMtp * missMtp;
}

/** Synthetic judgements at target accuracy with given miss count (for miss budget / inverse). */
function judgementsAtAccuracy(accuracy, hitTiles, misses = 0) {
  const hits = Math.max(0, Math.floor(hitTiles));
  const m = Math.max(0, Math.floor(misses));
  if (hits <= 0) {
    return [m, 0, 0, 0, 0, 0];
  }
  // Perfect-weighted: accuracy ≈ perfect/hits when only perfects; mix early for lower acc.
  // Use: perfect + 0.75*ep + 0.4*early = accuracy * (hits)  with ep=0, late=0, lPerfect=0
  // early + perfect = hits; perfect + 0.4*early = accuracy * hits
  // perfect + 0.4*(hits-perfect) = acc*hits
  // 0.6*perfect = acc*hits - 0.4*hits
  // perfect = hits*(acc - 0.4)/0.6
  const acc = Math.min(1, Math.max(0, accuracy));
  const wantPp = acc === 1;
  let perfect = Math.round((hits * (acc - 0.4)) / 0.6);
  perfect = Math.min(hits, Math.max(0, perfect));
  let early = hits - perfect;
  // Refine with ePerfect if needed for mid-band
  let ePerfect = 0;
  let lPerfect = 0;
  let late = 0;
  if (acc >= 0.95 && early > 0) {
    // Prefer ePerfect/lPerfect over early for high acc
    const convert = Math.min(early, Math.round(early * 0.7));
    ePerfect = Math.floor(convert / 2);
    lPerfect = convert - ePerfect;
    early -= convert;
  }
  // Integer counts snap near-100% to all-perfects; keep a non-PP row below 100%.
  if (!wantPp && hits > 0 && perfect >= hits && ePerfect === 0 && lPerfect === 0 && early === 0 && late === 0) {
    perfect = hits - 1;
    ePerfect = 1;
  }
  return [m, early, ePerfect, perfect, lPerfect, late];
}

function hitTilesFromJudgements(judgements) {
  if (!Array.isArray(judgements)) return 0;
  return (judgements[1] || 0) + (judgements[2] || 0) + (judgements[3] || 0) + (judgements[4] || 0) + (judgements[5] || 0);
}

/**
 * Compute ranked score from best-per-level list with optional simulated pass.
 * @param {{ levelId: number, scoreV2: number }[]} top20
 * @param {number|null} levelId
 * @param {number} simulatedScore
 */
export function computeRankedImpact(top20, levelId, simulatedScore) {
  const list = (top20 || []).map((p) => ({
    levelId: Number(p.levelId),
    scoreV2: Number(p.scoreV2) || 0,
  }));

  const without = list.filter((p) => p.levelId !== Number(levelId));
  const currentBest = list.find((p) => p.levelId === Number(levelId));
  const currentBestScore = currentBest?.scoreV2 ?? 0;

  const before = [...list]
    .sort((a, b) => b.scoreV2 - a.scoreV2)
    .slice(0, RANKED_TOP_N);
  const beforeSum = before.reduce((sum, p, i) => sum + p.scoreV2 * Math.pow(RANKED_DECAY, i), 0);

  const nextScore = Math.max(simulatedScore, currentBestScore);
  const afterList = [...without, { levelId: Number(levelId), scoreV2: nextScore }]
    .sort((a, b) => b.scoreV2 - a.scoreV2)
    .slice(0, RANKED_TOP_N);
  const afterSum = afterList.reduce((sum, p, i) => sum + p.scoreV2 * Math.pow(RANKED_DECAY, i), 0);

  const entersTop20 = afterList.some((p) => p.levelId === Number(levelId));
  const slotIndex = afterList.findIndex((p) => p.levelId === Number(levelId));

  return {
    beforeRanked: beforeSum,
    afterRanked: afterSum,
    delta: afterSum - beforeSum,
    currentBestOnLevel: currentBestScore,
    beatsBest: simulatedScore > currentBestScore,
    entersTop20,
    slotIndex: slotIndex >= 0 ? slotIndex + 1 : null,
    generalDelta: Math.max(0, simulatedScore - currentBestScore),
  };
}

/**
 * Full local calculator snapshot.
 * @param {{
 *   form: object,
 *   judgements: number[],
 *   level: object|null,
 *   overrides: object,
 *   difficultyDict: object,
 *   targetScore?: number|null,
 *   compareJudgements?: number[]|null,
 *   playerContext?: object|null,
 * }} input
 */
export function runLocalCalculatorMath(input) {
  const {
    form,
    judgements,
    level,
    overrides,
    difficultyDict,
    targetScore = null,
    compareJudgements = null,
    playerContext = null,
  } = input;

  const levelCtx = buildCalculatorLevelContext(level, overrides, difficultyDict);
  const speedRaw = form.speed?.trim?.() === '' || form.speed == null ? 1 : Number(form.speed);
  const speed = Number.isFinite(speedRaw) ? speedRaw : 1;
  const basePass = {
    speed,
    judgements,
    isNoHoldTap: Boolean(form.isNoHold),
  };

  const primary = scoreBreakdown(basePass, levelCtx, difficultyDict);
  const hitTiles =
    overrides.tilecount != null && overrides.tilecount !== ''
      ? getEffectiveTilecount(Number(overrides.tilecount), 0)
      : level
        ? getEffectiveTilecount(level.tilecount, level.autoTileCount)
        : hitTilesFromJudgements(judgements);

  // Miss budget
  const missBudget = [];
  const baseHits = Math.max(hitTiles || hitTilesFromJudgements(judgements), 1);
  const accForBudget = Math.max(primary.accuracy, 0.95);
  for (let m = 0; m <= MISS_BUDGET_CAP; m += 1) {
    const j = judgementsAtAccuracy(accForBudget, baseHits, m);
    const { scoreV2 } = computePassScoreV2(
      withJudgements(basePass, j, { isNoHoldTap: false }),
      levelCtx,
      {},
      difficultyDict,
    );
    const mtp = scoreV2MtpFromMisses(m, baseHits);
    missBudget.push({ misses: m, scoreV2, missMtp: mtp });
    if (m > 0 && mtp <= 0.5) break;
  }

  // Inverse: binary search accuracy for target score at entered speed / no-hold
  let inverse = null;
  if (targetScore != null && Number.isFinite(Number(targetScore)) && Number(targetScore) > 0) {
    const target = Number(targetScore);
    let lo = 0.95;
    let hi = 1;
    let best = null;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      const j = judgementsAtAccuracy(mid, baseHits, 0);
      const { scoreV2 } = computePassScoreV2(
        withJudgements(basePass, j),
        levelCtx,
        {},
        difficultyDict,
      );
      best = { accuracy: mid, scoreV2, misses: 0 };
      if (scoreV2 < target) lo = mid;
      else hi = mid;
    }
    inverse = best;
    if (best && best.scoreV2 < target * 0.99) {
      inverse = { ...best, unreachable: true };
    }
  }

  // Speed × accuracy grid (dense speeds; log-ish accuracy toward 100%)
  const accSteps = buildLogishAccuracySteps();
  const speedSteps = buildSpeedSteps();
  const speedGrid = {
    speeds: speedSteps,
    accuracies: accSteps,
    cells: speedSteps.map((s) =>
      accSteps.map((acc) =>
        scoreV2AtExactAccuracy({
          accuracy: acc,
          speed: s,
          hitTiles: baseHits,
          misses: 0,
          isNoHoldTap: false,
          levelCtx,
          difficultyDict,
        }),
      ),
    ),
  };

  let compare = null;
  if (Array.isArray(compareJudgements) && compareJudgements.every(Number.isInteger)) {
    const cmpPass = withJudgements(basePass, compareJudgements);
    const cmp = scoreBreakdown(cmpPass, levelCtx, difficultyDict);
    compare = {
      primary: primary.scoreV2,
      secondary: cmp.scoreV2,
      delta: primary.scoreV2 - cmp.scoreV2,
      secondaryAccuracy: cmp.accuracy,
    };
  }

  let rankedImpact = null;
  let reclear = null;
  if (playerContext && level?.id) {
    rankedImpact = {
      ...computeRankedImpact(playerContext.top20 || [], level.id, primary.scoreV2),
      ppDelta: primary.accuracy === 1 ? Math.max(0, primary.scoreV2 - (playerContext.bestOnLevel?.scoreV2 || 0)) : 0,
    };
    const best = playerContext.bestOnLevel;
    reclear = {
      hasBest: Boolean(best),
      bestScore: best?.scoreV2 ?? null,
      bestPassId: best?.id ?? null,
      beatsBest: best ? primary.scoreV2 > Number(best.scoreV2) : true,
      equalBest: best ? Math.abs(primary.scoreV2 - Number(best.scoreV2)) < 0.005 : false,
    };
  }

  return {
    primary: {
      ...primary,
      speed,
      isNoHoldTap: basePass.isNoHoldTap,
      hitTiles: baseHits,
      zeroMissMultiplier: SCORE_V2_ZERO_MISS_MULTIPLIER,
    },
    missBudget,
    inverse,
    speedGrid,
    compare,
    rankedImpact,
    reclear,
    levelCtx,
    customScoring: isCustomScoring(level, overrides, difficultyDict),
  };
}
