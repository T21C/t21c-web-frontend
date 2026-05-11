// tuf-search: #TUFStellar #featureFlag — mirrors server `tufStellarEnabled` on auth user
/**
 * @param {{ tufStellarEnabled?: boolean } | null | undefined} user
 * @returns {boolean}
 */
export function isTufStellarEnabledForUser(user) {
  return Boolean(user?.tufStellarEnabled);
}
