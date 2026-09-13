// tuf-search: #midspinPerfectDecrement
import { unwrapJudgements } from './CalcAcc';
import { isLegacyAdofaiVersion } from './adofaiVersion';
import { addPassMetaFlag, hasPassMetaFlag, passMetaFlags, toPassMetaFlags } from './passMetaFlags';

function cloneJudgements(inp) {
  return unwrapJudgements(inp);
}

function midspinInt(midspinCount) {
  if (midspinCount == null || midspinCount === '') return null;
  const n = typeof midspinCount === 'number' ? midspinCount : Number(midspinCount);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

export function applyMidspinPerfectDecrement({
  judgements,
  adofaiVersion,
  passMetaFlags: flagsIn = 0,
  midspinCount,
} = {}) {
  const next = cloneJudgements(judgements);
  let flags = toPassMetaFlags(flagsIn);

  if (hasPassMetaFlag(flags, passMetaFlags.MIDSPIN_PERFECTS_REMOVED)) {
    return {
      judgements: next,
      passMetaFlags: flags,
      applied: false,
      skippedReason: 'already_applied',
      subtracted: 0,
    };
  }

  if (!isLegacyAdofaiVersion(adofaiVersion)) {
    return {
      judgements: next,
      passMetaFlags: flags,
      applied: false,
      skippedReason: 'latest_era',
      subtracted: 0,
    };
  }

  const midspin = midspinInt(midspinCount);
  if (midspin == null) {
    return {
      judgements: next,
      passMetaFlags: flags,
      applied: false,
      skippedReason: 'midspin_missing',
      subtracted: 0,
    };
  }

  flags = addPassMetaFlag(flags, passMetaFlags.MIDSPIN_PERFECTS_REMOVED);

  if (midspin === 0) {
    return {
      judgements: next,
      passMetaFlags: flags,
      applied: false,
      skippedReason: null,
      subtracted: 0,
    };
  }

  if (next.perfect < midspin) {
    return {
      judgements: next,
      passMetaFlags: toPassMetaFlags(flagsIn),
      applied: false,
      skippedReason: 'perfect_lt_midspin',
      subtracted: 0,
    };
  }

  next.perfect -= midspin;
  return {
    judgements: next,
    passMetaFlags: flags,
    applied: true,
    skippedReason: null,
    subtracted: midspin,
  };
}

export function willApplyMidspinDecrement({
  adofaiVersion,
  passMetaFlags: flagsIn,
  midspinCount,
  perfect,
} = {}) {
  if (hasPassMetaFlag(flagsIn, passMetaFlags.MIDSPIN_PERFECTS_REMOVED)) return false;
  if (!isLegacyAdofaiVersion(adofaiVersion)) return false;
  const midspin = midspinInt(midspinCount);
  if (midspin == null || midspin === 0) return false;
  if (perfect != null) {
    const p = Number(perfect);
    if (!Number.isFinite(p) || Math.floor(p) < midspin) return false;
  }
  return true;
}
