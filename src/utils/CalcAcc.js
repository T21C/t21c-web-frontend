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

export function isPureXPerfect(judgements, isXPerfectMode, accuracy) {
  if (!isXPerfectMode) return false;
  const acc = accuracy == null ? calcAcc(judgements) : accuracy;
  return acc === 1;
}

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
