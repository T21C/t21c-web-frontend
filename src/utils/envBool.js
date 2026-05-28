// tuf-search: #envBool
export function envBool(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const s = value.trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  return fallback;
}
