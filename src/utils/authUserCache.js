// tuf-search: #authUserCache
const STORAGE_KEY = 'tuf.auth.user';

function isCachedUser(value) {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string');
}

/**
 * Last known auth profile, used to keep the SPA signed-in across a failed boot
 * until GET /session returns an explicit anonymous payload or a 401 lands.
 * @returns {object | null}
 */
export function readCachedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCachedUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {object | null | undefined} user
 */
export function writeCachedUser(user) {
  if (!isCachedUser(user)) {
    clearCachedUser();
    return;
  }
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(user, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    );
  } catch {
    // quota / private mode — optimistic restore is best-effort
  }
}

export function clearCachedUser() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
