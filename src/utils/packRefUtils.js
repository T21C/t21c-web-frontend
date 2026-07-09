/**
 * @param {object | null | undefined} pack
 * @returns {string}
 */
export function getPackLinkCode(pack) {
  if (!pack) return '';
  return String(pack.linkCode ?? pack.id ?? '').trim();
}

/**
 * @param {object | null | undefined} pack
 * @returns {string}
 */
export function formatPackOptionLabel(pack) {
  if (!pack) return '';
  const linkCode = getPackLinkCode(pack);
  return pack.name?.trim() || linkCode;
}
