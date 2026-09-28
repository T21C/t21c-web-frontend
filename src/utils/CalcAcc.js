// tuf-search: #CalcAcc #calcAcc

export const JUDGEMENT_KEYS = [
  'earlyDouble',
  'earlySingle',
  'ePerfect',
  'perfectMinus',
  'perfect',
  'perfectPlus',
  'lPerfect',
  'lateSingle',
  'lateDouble',
];

export function emptyJudgements() {
  return {
    earlyDouble: 0,
    earlySingle: 0,
    ePerfect: 0,
    perfectMinus: 0,
    perfect: 0,
    perfectPlus: 0,
    lPerfect: 0,
    lateSingle: 0,
    lateDouble: 0,
  };
}

function n(v) {
  const num = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

export function unwrapJudgements(inp) {
  if (!inp || typeof inp !== 'object') {
    return emptyJudgements();
  }
  if (Array.isArray(inp)) {
    return {
      earlyDouble: n(inp[0]),
      earlySingle: n(inp[1]),
      ePerfect: n(inp[2]),
      perfectMinus: 0,
      perfect: n(inp[3]),
      perfectPlus: 0,
      lPerfect: n(inp[4]),
      lateSingle: n(inp[5]),
      lateDouble: n(inp[6]),
    };
  }
  const raw = inp.dataValues && typeof inp.dataValues === 'object' ? inp.dataValues : inp;
  return {
    earlyDouble: n(raw.earlyDouble),
    earlySingle: n(raw.earlySingle),
    ePerfect: n(raw.ePerfect),
    perfectMinus: n(raw.perfectMinus),
    perfect: n(raw.perfect),
    perfectPlus: n(raw.perfectPlus),
    lPerfect: n(raw.lPerfect),
    lateSingle: n(raw.lateSingle),
    lateDouble: n(raw.lateDouble),
  };
}

export function sumJudgements(inp) {
  const j = unwrapJudgements(inp);
  return (
    j.earlyDouble +
    j.earlySingle +
    j.ePerfect +
    j.perfectMinus +
    j.perfect +
    j.perfectPlus +
    j.lPerfect +
    j.lateDouble +
    j.lateSingle
  );
}

export function tilecount(inp) {
  const j = unwrapJudgements(inp);
  return (
    j.earlySingle +
    j.ePerfect +
    j.perfectMinus +
    j.perfect +
    j.perfectPlus +
    j.lPerfect +
    j.lateSingle
  );
}

/**
 * Tilecount buckets other than center Perfect. Excludes too-early / too-late.
 */
export function nonPerfectHitCount(inp) {
  const j = unwrapJudgements(inp);
  return (
    j.earlySingle +
    j.ePerfect +
    j.perfectMinus +
    j.perfectPlus +
    j.lPerfect +
    j.lateSingle
  );
}

export function getEffectiveTilecount(levelTilecount, autoTileCount = 0) {
  if (levelTilecount == null || levelTilecount === '') return null;
  const tc = typeof levelTilecount === 'number' ? levelTilecount : Number(levelTilecount);
  if (!Number.isFinite(tc)) return null;
  const tileInt = Math.floor(tc);
  const autoRaw = typeof autoTileCount === 'number' ? autoTileCount : Number(autoTileCount);
  const autoInt = Number.isFinite(autoRaw) ? Math.floor(autoRaw) : 0;
  return Math.max(tileInt - autoInt, 0);
}

/** Ancient placeholder judgements (no results screen): 5 / 40 / 5 with other hit buckets 0. */
export function isAncient5405Pattern(inp) {
  const j = unwrapJudgements(inp);
  return (
    j.ePerfect === 5 &&
    j.perfect === 40 &&
    j.lPerfect === 5 &&
    j.earlySingle === 0 &&
    j.perfectMinus === 0 &&
    j.perfectPlus === 0 &&
    j.lateSingle === 0
  );
}

/**
 * `perfects = achievable - nonPerfects`. Overwrites Perfect when non-perfects exist.
 */
export function applyDerivedPerfects({judgements, tilecount: levelTilecount, autoTileCount = 0} = {}) {
  const next = unwrapJudgements(judgements);
  if (isAncient5405Pattern(next)) {
    return {
      judgements: next,
      applied: false,
      skippedReason: 'ancient_5405',
      perfect: next.perfect,
    };
  }
  const achievable = getEffectiveTilecount(levelTilecount, autoTileCount);
  if (achievable == null || achievable <= 0) {
    return {
      judgements: next,
      applied: false,
      skippedReason: 'achievable_missing',
      perfect: next.perfect,
    };
  }
  const nonPerfects = nonPerfectHitCount(next);
  if (nonPerfects <= 0) {
    return {
      judgements: next,
      applied: false,
      skippedReason: 'nonperfects_zero',
      perfect: next.perfect,
    };
  }
  const derived = achievable - nonPerfects;
  if (derived < 0) {
    return {
      judgements: next,
      applied: false,
      skippedReason: 'would_go_negative',
      perfect: next.perfect,
    };
  }
  next.perfect = derived;
  return {
    judgements: next,
    applied: true,
    skippedReason: null,
    perfect: derived,
  };
}

/** Every hit is an x-perfect (center perfect). Perfect− / Perfect+ still score 1.0, so accuracy alone is not enough. */
export function isPureXPerfect(judgements, isXPerfectMode) {
  if (!isXPerfectMode) return false;
  const j = unwrapJudgements(judgements);
  const total = sumJudgements(j);
  return total > 0 && j.perfect === total;
}

/** Weighted xacc. Perfect− / Perfect+ count as 1.0 like Perfect (keep in sync with server CalcAcc / MySQL calculate_accuracy). */
export default function calcAcc(inp, raw = true) {
  if (!inp) return 0;
  const judgements = unwrapJudgements(inp);
  const total = sumJudgements(judgements);
  if (!total) return 0;
  const perfectBand = judgements.perfectMinus + judgements.perfect + judgements.perfectPlus;
  const result =
    (perfectBand +
      (judgements.ePerfect + judgements.lPerfect) * 0.75 +
      (judgements.earlySingle + judgements.lateSingle) * 0.4 +
      (judgements.earlyDouble + judgements.lateDouble) * 0.2) /
    total;
  if (raw) return result;
  const digits = 4;
  return Math.round(result * Math.pow(10, digits)) / Math.pow(10, digits);
}
