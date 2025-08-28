export const ABILITIES = {
  CUSTOM_CSS: 1n << 0n,
  CURATOR_ASSIGNABLE: 1n << 6n,
  RATER_ASSIGNABLE: 1n << 7n,
  SHOW_ASSIGNER: 1n << 10n,
  FORCE_DESCRIPTION: 1n << 11n,
  FRONT_PAGE_ELIGIBLE: 1n << 13n,
  CUSTOM_COLOR_THEME: 1n << 14n,
  LEVEL_LIST_BASIC_GLOW: 1n << 15n,
  LEVEL_LIST_LEGENDARY_GLOW: 1n << 16n,
};

export function hasBit(input, bit) {
  if (!input || bit === undefined || bit === null) return false;
  return (BigInt(input) & BigInt(bit)) === BigInt(bit);
}
  
export function setBit(input, bit) {
  if (!input || bit === undefined || bit === null) return input ? BigInt(input) : 0n;
  return BigInt(input || 0) | BigInt(bit);
}