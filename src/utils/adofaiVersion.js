// tuf-search: #adofaiVersion #passEra
export const ADOFAI_VERSION = {
  V2: 1,
  PRE_3_4_0: 2,
  V3_4_0: 3,
};

export const ADOFAI_V3_RELEASE_UTC = Date.UTC(2026, 4, 1);
export const ADOFAI_V3_4_0_RELEASE_UTC = Date.UTC(2026, 8, 11, 8, 0, 0);

export const ADOFAI_VERSION_SELECT_VALUES = [
  ADOFAI_VERSION.V3_4_0,
  ADOFAI_VERSION.PRE_3_4_0,
  ADOFAI_VERSION.V2,
];

export function isAdofaiVersion(value) {
  return (
    value === ADOFAI_VERSION.V2 ||
    value === ADOFAI_VERSION.PRE_3_4_0 ||
    value === ADOFAI_VERSION.V3_4_0
  );
}

export function parseAdofaiVersion(raw, fallback = ADOFAI_VERSION.PRE_3_4_0) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return isAdofaiVersion(n) ? n : fallback;
}

export function isLegacyAdofaiVersion(version) {
  return version === ADOFAI_VERSION.V2 || version === ADOFAI_VERSION.PRE_3_4_0;
}

export function canUseXPerfectMode(version) {
  return version === ADOFAI_VERSION.V3_4_0;
}

export function isAdofaiV2FromVersion(version) {
  return version === ADOFAI_VERSION.V2;
}

export function resolveAdofaiVersionFromTimestamp(timestamp) {
  if (timestamp == null || timestamp === '') {
    return ADOFAI_VERSION.V3_4_0;
  }
  const ms = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) {
    return ADOFAI_VERSION.V3_4_0;
  }
  if (ms < ADOFAI_V3_RELEASE_UTC) {
    return ADOFAI_VERSION.V2;
  }
  if (ms < ADOFAI_V3_4_0_RELEASE_UTC) {
    return ADOFAI_VERSION.PRE_3_4_0;
  }
  return ADOFAI_VERSION.V3_4_0;
}

export function adofaiVersionFromLegacyFlag(isAdofaiV2) {
  return isAdofaiV2 ? ADOFAI_VERSION.V2 : ADOFAI_VERSION.PRE_3_4_0;
}

export function filterValueToAdofaiVersion(filter) {
  switch (filter) {
    case 'v2':
      return ADOFAI_VERSION.V2;
    case 'pre340':
      return ADOFAI_VERSION.PRE_3_4_0;
    case 'latest':
      return ADOFAI_VERSION.V3_4_0;
    default:
      return null;
  }
}

export function adofaiVersionFromPass(pass) {
  if (pass == null) return ADOFAI_VERSION.PRE_3_4_0;
  if (pass.adofaiVersion != null && pass.adofaiVersion !== '') {
    return parseAdofaiVersion(pass.adofaiVersion);
  }
  const flags = pass.flags || {};
  if (flags.adofaiVersion != null && flags.adofaiVersion !== '') {
    return parseAdofaiVersion(flags.adofaiVersion);
  }
  return adofaiVersionFromLegacyFlag(!!(pass.isAdofaiV2 ?? flags.isAdofaiV2));
}

export function shouldShowXPerfectJudgements(pass, judgements) {
  if (pass?.isXPerfectMode || pass?.flags?.isXPerfectMode) return true;
  const j = judgements || pass?.judgements;
  return Number(j?.perfectMinus) > 0 || Number(j?.perfectPlus) > 0;
}
