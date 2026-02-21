/**
 * Clears all cookies readable from JS (non-HttpOnly) on every launch except the first.
 * Auth cookies (accessToken, refreshToken) are HttpOnly and are not touched.
 * Stores "first launch done" and "cookies cleared" state in localStorage.
 */

const FIRST_LAUNCH_KEY = 'app_first_launch_done';
const COOKIES_CLEARED_AT_KEY = 'cookies_cleared_at';

/**
 * Clear every cookie that appears in document.cookie (non-HttpOnly only).
 * Auth tokens are HttpOnly so they are not cleared.
 */
function clearAllReadableCookies() {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eq = cookie.indexOf('=');
    const name = eq > -1 ? cookie.substring(0, eq).trim() : cookie.trim();
    if (name) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }
}

/**
 * Run on app load: clear non-auth cookies on every launch except the first.
 * Sets localStorage so we know first launch has happened and when we last cleared.
 */
export function runNonAuthCookieClearOnLaunch() {
  try {
    const firstLaunchDone = localStorage.getItem(FIRST_LAUNCH_KEY);
    if (!firstLaunchDone) {
      localStorage.setItem(FIRST_LAUNCH_KEY, '1');
      return;
    }
    clearAllReadableCookies();
    localStorage.setItem(COOKIES_CLEARED_AT_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[cookieClearUtil] run failed:', e);
  }
}

export { FIRST_LAUNCH_KEY, COOKIES_CLEARED_AT_KEY };
