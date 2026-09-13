// tuf-search: #ParseJudgements #parseJudgements
import { emptyJudgements, tilecount } from './CalcAcc';
import { ADOFAI_VERSION, canUseXPerfectMode, parseAdofaiVersion } from './adofaiVersion';
import { applyMidspinPerfectDecrement } from './midspinPerfectDecrement';

function parseField(value) {
  if (value === '' || value == null) return null;
  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

/**
 * Form fields → named judgements. Incomplete fields are null.
 */
export const parseJudgements = (updatedForm) => {
  const form = updatedForm || {};
  return {
    earlyDouble: parseField(form.tooEarly ?? form.earlyDouble),
    earlySingle: parseField(form.early ?? form.earlySingle),
    ePerfect: parseField(form.ePerfect),
    perfectMinus: parseField(form.perfectMinus) ?? 0,
    perfect: parseField(form.perfect),
    perfectPlus: parseField(form.perfectPlus) ?? 0,
    lPerfect: parseField(form.lPerfect),
    lateSingle: parseField(form.late ?? form.lateSingle),
    lateDouble: parseField(form.lateDouble) ?? 0,
  };
};

export function judgementsAreComplete(j, { requireXPerfectFields = false } = {}) {
  if (!j || typeof j !== 'object') return false;
  const keys = ['earlyDouble', 'earlySingle', 'ePerfect', 'perfect', 'lPerfect', 'lateSingle'];
  if (requireXPerfectFields) {
    keys.push('perfectMinus', 'perfectPlus');
  }
  return keys.every((k) => Number.isInteger(j[k]));
}

export function formToScoringJudgements(form) {
  const parsed = parseJudgements(form);
  const out = emptyJudgements();
  for (const key of Object.keys(out)) {
    out[key] = Number.isInteger(parsed[key]) ? parsed[key] : 0;
  }
  const adofaiVersion = parseAdofaiVersion(form?.adofaiVersion, ADOFAI_VERSION.V3_4_0);
  if (!form?.isXPerfectMode || !canUseXPerfectMode(adofaiVersion)) {
    out.perfectMinus = 0;
    out.perfectPlus = 0;
  }
  return out;
}

/**
 * Preview scoring: subtract midspins locally for eras 1|2. Does not mutate the form.
 */
export function previewPassFormScoring(form, level) {
  const adofaiVersion = parseAdofaiVersion(form?.adofaiVersion, ADOFAI_VERSION.V3_4_0);
  return applyMidspinPerfectDecrement({
    judgements: formToScoringJudgements(form),
    adofaiVersion,
    passMetaFlags: form?.passMetaFlags,
    midspinCount: level?.midspinCount,
  });
}

export function previewPassFormHitCount(form, level) {
  return tilecount(previewPassFormScoring(form, level).judgements);
}
