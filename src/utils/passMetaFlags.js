// tuf-search: #passMetaFlags #passProcessing
export const passMetaFlags = {
  MIDSPIN_PERFECTS_REMOVED: 1n << 0n,
};

export function toPassMetaFlags(value) {
  if (value == null || value === '') return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export function hasPassMetaFlag(flags, bit) {
  return (toPassMetaFlags(flags) & BigInt(bit)) === BigInt(bit);
}

export function addPassMetaFlag(flags, bit) {
  return toPassMetaFlags(flags) | BigInt(bit);
}
