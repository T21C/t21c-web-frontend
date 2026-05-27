// tuf-search: #scoreV2Curve #ScoreV2Curve
import calcAcc from "./CalcAcc";
import { getScoreV2 } from "./CalcScore";
import {
  XACC_CURVE_DEFAULTS,
  resolveXaccCurveForLevelData,
} from "./scoreV2XaccCurve.js";

const MAX_CHART_POINTS = 180;
/** Pure ePerfect ladder (PP … PP+NeP); no early substitution in tooltip below this. */
const E_PERFECT_LADDER_MAX = 10;
/** Target early : ePerfect count for substituted display (~1:5). */
const EARLY_TO_EPERFECT_RATIO = 1 / 5;
/** Keep substituted accuracy within ±0.01% of the e-only step (or best effort). */
const ACC_SUBSTITUTION_TOLERANCE = 0.0001;
const WEIGHT_EPERFECT = 0.25;
const WEIGHT_EARLY = 0.6;

/** ScoreV2 xacc curve is only meaningful at/above this accuracy. */
export const SCOREV2_CURVE_ACCURACY_CUTOFF = XACC_CURVE_DEFAULTS.cutoff;

/** Minimum accuracy span for score graph x-axis (% points). */
export const SCOREV2_GRAPH_X_MIN_SPAN = 0.5;
/** Minimum right-side padding beyond data max (% points); span×0.1 can exceed this. */
export const SCOREV2_GRAPH_X_RIGHT_PAD = 0.35;

/**
 * X-axis domain for ScoreV2 graph from accuracy % samples (curve + optional pins).
 * @param {number[]} accuracyPcts Values in [0, 100].
 * @returns {[number, number]}
 */
export function scoreV2GraphXAxisDomain(accuracyPcts) {
  if (!accuracyPcts.length) {
    return [SCOREV2_CURVE_ACCURACY_CUTOFF * 100, 100];
  }
  const dataMin = Math.min(...accuracyPcts);
  const dataMax = Math.max(...accuracyPcts);
  const span = Math.max(dataMax - dataMin, SCOREV2_GRAPH_X_MIN_SPAN);
  return [
    Math.max(SCOREV2_CURVE_ACCURACY_CUTOFF * 100, dataMin - span * 0.02),
    dataMax + Math.max(span * 0.1, SCOREV2_GRAPH_X_RIGHT_PAD),
  ];
}

/**
 * Linear score at an accuracy % from enumerated curve points.
 * @param {{ accuracyPct: number, score: number }[]} points
 * @param {number} accuracyPct
 * @returns {number | null}
 */
export function interpolateCurveScoreAtAccuracy(points, accuracyPct) {
  if (!points?.length || !Number.isFinite(accuracyPct)) return null;
  const sorted = [...points].sort((a, b) => a.accuracyPct - b.accuracyPct);
  if (accuracyPct <= sorted[0].accuracyPct) return sorted[0].score;
  if (accuracyPct >= sorted[sorted.length - 1].accuracyPct) {
    return sorted[sorted.length - 1].score;
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (accuracyPct >= a.accuracyPct && accuracyPct <= b.accuracyPct) {
      const span = b.accuracyPct - a.accuracyPct;
      if (span <= 0) return a.score;
      const t = (accuracyPct - a.accuracyPct) / span;
      return a.score + t * (b.score - a.score);
    }
  }
  return sorted[sorted.length - 1].score;
}

export function isPurePerfectAccuracy(accuracy) {
  return Number(accuracy) >= 1 - 1e-9;
}

const curveCache = new Map();
const CURVE_CACHE_MAX = 48;

function curveCacheKey(hitTiles, misses, levelData, speed, isNoHoldTap) {
  const curve = resolveXaccCurveForLevelData(levelData);
  const curveKey = curve
    ? `${curve.poleOffset}|${curve.topMultiplier}`
    : "default";
  return [
    hitTiles,
    misses,
    levelData?.baseScore ?? "",
    levelData?.ppBaseScore ?? "",
    levelData?.diffId ?? "",
    levelData?.difficulty?.name ?? "",
    curveKey,
    speed,
    isNoHoldTap ? 1 : 0,
  ].join("|");
}

function getCachedCurve(key) {
  const hit = curveCache.get(key);
  if (!hit) return null;
  curveCache.delete(key);
  curveCache.set(key, hit);
  return hit;
}

function setCachedCurve(key, points) {
  if (curveCache.size >= CURVE_CACHE_MAX) {
    const oldest = curveCache.keys().next().value;
    curveCache.delete(oldest);
  }
  curveCache.set(key, points);
}

/**
 * Build 6-element judgement array: [tooEarly, early, ePerfect, perfect, lPerfect, late].
 */
export function buildJudgements(misses, hitTiles, eCount, earlyCount) {
  const totalDegraded = Math.min(hitTiles, Math.max(0, eCount) + Math.max(0, earlyCount));
  const e = Math.min(Math.max(0, eCount), totalDegraded);
  const early = Math.min(Math.max(0, earlyCount), totalDegraded - e);
  const perfect = Math.max(0, hitTiles - e - early);
  const eHalf = Math.floor(e / 2);
  const eRem = e - eHalf;
  const earlyHalf = Math.floor(early / 2);
  const earlyRem = early - earlyHalf;
  return [misses, earlyHalf, eHalf, perfect, eRem, earlyRem];
}

function accuracyKey(acc) {
  return Math.round(acc * 10000) / 10000;
}

function judgementCountsFromArray(judgements) {
  return {
    miss: judgements[0],
    early: judgements[1],
    ePerfect: judgements[2],
    perfect: judgements[3],
    lPerfect: judgements[4],
    late: judgements[5],
  };
}

/**
 * Accuracy/score use ePerfect+lPerfect only (earlyCount = 0 on the curve).
 * Tooltip counts: ~1/5 of degraded tiles shown as early/late, rest as e/l perfect.
 * Refine early count near that ratio to stay within ±0.01% of the e-only accuracy when possible.
 */
function approximateEarlySubstitution(misses, hitTiles, eDegraded) {
  if (eDegraded <= 0) {
    return { eCount: 0, earlyCount: 0 };
  }
  if (eDegraded <= E_PERFECT_LADDER_MAX) {
    return { eCount: eDegraded, earlyCount: 0 };
  }

  const targetAcc = calcAcc(buildJudgements(misses, hitTiles, eDegraded, 0), true);
  const idealEarly = Math.max(
    1,
    Math.min(eDegraded - 1, Math.round(eDegraded * EARLY_TO_EPERFECT_RATIO)),
  );

  const accDiff = (earlyCount) => {
    const eCount = eDegraded - earlyCount;
    if (eCount < 0) return Infinity;
    return Math.abs(
      calcAcc(buildJudgements(misses, hitTiles, eCount, earlyCount), true) - targetAcc,
    );
  };

  // Start from 1:5 count split — do not use early=0 (it matches target exactly but shows no earlies).
  let bestEarly = idealEarly;
  let bestDiff = accDiff(bestEarly);

  const searchRadius = Math.min(12, eDegraded);
  for (let delta = 1; delta <= searchRadius; delta += 1) {
    let improved = false;
    for (const candidate of [idealEarly - delta, idealEarly + delta]) {
      if (candidate < 1 || candidate >= eDegraded) continue;
      const diff = accDiff(candidate);
      if (diff < bestDiff - 1e-12) {
        bestDiff = diff;
        bestEarly = candidate;
        improved = true;
      }
    }
    if (!improved && bestDiff <= ACC_SUBSTITUTION_TOLERANCE) {
      break;
    }
  }

  return {
    eCount: eDegraded - bestEarly,
    earlyCount: bestEarly,
  };
}

function computePoint(
  misses,
  hitTiles,
  eDegraded,
  levelData,
  difficultyDict,
  speed,
  isNoHoldTap,
) {
  const calcJudgements = buildJudgements(misses, hitTiles, eDegraded, 0);
  const accuracy = calcAcc(calcJudgements, true);
  const score = getScoreV2(
    { speed, judgements: calcJudgements, isNoHoldTap },
    levelData,
    difficultyDict,
  );
  if (!Number.isFinite(accuracy) || !Number.isFinite(score)) {
    return null;
  }

  const split = approximateEarlySubstitution(misses, hitTiles, eDegraded);
  const displayJudgements = buildJudgements(
    misses,
    hitTiles,
    split.eCount,
    split.earlyCount,
  );

  return {
    accuracy,
    accuracyPct: accuracy * 100,
    score,
    misses,
    eDegraded,
    eCount: split.eCount,
    earlyCount: split.earlyCount,
    perfect: hitTiles - eDegraded,
    judgementCounts: judgementCountsFromArray(displayJudgements),
  };
}

function maxEPerfectStepsAboveAccuracyCutoff(hitTiles, misses) {
  const denom = hitTiles + misses;
  if (denom <= 0) return 0;
  const headroom =
    hitTiles * (1 - SCOREV2_CURVE_ACCURACY_CUTOFF) - misses * SCOREV2_CURVE_ACCURACY_CUTOFF;
  return Math.min(hitTiles, Math.max(0, Math.floor(headroom / WEIGHT_EPERFECT)));
}

function collectPoint(map, misses, hitTiles, eDegraded, ctx) {
  const point = computePoint(
    misses,
    hitTiles,
    eDegraded,
    ctx.levelData,
    ctx.difficultyDict,
    ctx.speed,
    ctx.isNoHoldTap,
  );
  if (!point || point.accuracy < SCOREV2_CURVE_ACCURACY_CUTOFF) {
    return;
  }
  const key = accuracyKey(point.accuracy);
  const existing = map.get(key);
  if (!existing || point.eDegraded < existing.eDegraded) {
    map.set(key, point);
  }
}

function subsampleEven(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const sampled = [];
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(points[Math.round(i * step)]);
  }
  return sampled;
}

function subsamplePoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;

  const nearPerfect = points.filter((p) => p.eDegraded <= E_PERFECT_LADDER_MAX);
  const rest = points.filter((p) => p.eDegraded > E_PERFECT_LADDER_MAX);

  if (nearPerfect.length >= maxPoints) {
    return nearPerfect.slice(0, maxPoints);
  }

  const budget = maxPoints - nearPerfect.length;
  const sampledRest = rest.length <= budget ? rest : subsampleEven(rest, budget);
  return [...nearPerfect, ...sampledRest].sort((a, b) => b.accuracy - a.accuracy);
}

function enumerateScoreV2CurvePointsUncached({
  tilecount,
  misses = 0,
  levelData,
  difficultyDict = {},
  speed = 1,
  isNoHoldTap = false,
}) {
  const hitTiles = Math.floor(Number(tilecount));
  const missCount = Math.max(0, Math.floor(Number(misses)) || 0);

  if (!Number.isFinite(hitTiles) || hitTiles <= 0) {
    return [];
  }

  const maxE = maxEPerfectStepsAboveAccuracyCutoff(hitTiles, missCount);
  if (maxE <= 0 && missCount === 0) {
    const pt = computePoint(0, hitTiles, 0, levelData, difficultyDict, speed, isNoHoldTap);
    return pt && pt.accuracy >= SCOREV2_CURVE_ACCURACY_CUTOFF ? [pt] : [];
  }

  const map = new Map();
  const ctx = { levelData, difficultyDict, speed, isNoHoldTap };

  for (let eDegraded = 0; eDegraded <= maxE; eDegraded += 1) {
    collectPoint(map, missCount, hitTiles, eDegraded, ctx);
  }

  const points = Array.from(map.values())
    .filter((p) => p.accuracy >= SCOREV2_CURVE_ACCURACY_CUTOFF)
    .sort((a, b) => b.accuracy - a.accuracy);

  return subsamplePoints(points, MAX_CHART_POINTS);
}

/**
 * Enumerate achievable accuracy → score points for a level tilecount and miss count.
 */
export function enumerateScoreV2CurvePoints(params) {
  const hitTiles = Math.floor(Number(params.tilecount));
  if (!Number.isFinite(hitTiles) || hitTiles <= 0) return [];

  const key = curveCacheKey(
    hitTiles,
    Math.max(0, Math.floor(Number(params.misses)) || 0),
    params.levelData,
    params.speed,
    params.isNoHoldTap,
  );
  const cached = getCachedCurve(key);
  if (cached) return cached;

  const points = enumerateScoreV2CurvePointsUncached(params);
  setCachedCurve(key, points);
  return points;
}

/** Fixed Y-axis top — a few score calls, not a full curve rebuild. */
export function getScoreV2CurveYMax({
  tilecount,
  levelData,
  difficultyDict = {},
  speed = 1,
  isNoHoldTap = false,
  excludePurePerfect = false,
}) {
  const hitTiles = Math.floor(Number(tilecount));
  if (!Number.isFinite(hitTiles) || hitTiles <= 0) return 0;

  let maxScore = 0;
  const startE = excludePurePerfect ? 1 : 0;
  const endE = Math.min(hitTiles, E_PERFECT_LADDER_MAX + 1);

  for (let eDegraded = startE; eDegraded <= endE; eDegraded += 1) {
    const pt = computePoint(0, hitTiles, eDegraded, levelData, difficultyDict, speed, isNoHoldTap);
    if (pt) maxScore = Math.max(maxScore, pt.score);
  }

  if (!excludePurePerfect) {
    return maxScore;
  }

  const pt = computePoint(0, hitTiles, 1, levelData, difficultyDict, speed, isNoHoldTap);
  if (pt) maxScore = Math.max(maxScore, pt.score);

  return maxScore;
}
