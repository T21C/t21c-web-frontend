// tuf-search: #authBoot
/**
 * Single in-flight SPA session bootstrap shared by the HTML prefetch, AuthProvider
 * and the axios 401 interceptor. Two concurrent refresh rotations invalidate each
 * other's token, so everything on boot funnels through one promise.
 */

let earlyBoot = null;
let bootPromise = null;
let bootPending = false;

function isSessionPayload(data) {
  return Boolean(data && typeof data === 'object' && 'csrfToken' in data);
}

function takeEarlyBoot() {
  if (earlyBoot) return earlyBoot;
  if (typeof window === 'undefined') return null;
  const early = window.__TUF_AUTH_BOOT__;
  if (!early || typeof early.then !== 'function') return null;
  // The payload holds email and permission flags; don't leave it on a global.
  delete window.__TUF_AUTH_BOOT__;
  earlyBoot = early;
  return early;
}

/**
 * @param {() => Promise<object | null>} fetcher Used when the HTML prefetch is absent or failed.
 * @returns {Promise<object | null>} Session payload, or null when boot could not resolve one.
 */
export function ensureAuthBoot(fetcher) {
  if (bootPromise) return bootPromise;

  const early = takeEarlyBoot();
  bootPending = true;
  bootPromise = (async () => {
    let data = null;
    if (early) {
      data = await early.catch(() => null);
      if (isSessionPayload(data) && data.user) return data;
    }
    try {
      const retry = await fetcher();
      if (isSessionPayload(retry) && (retry.user || !isSessionPayload(data))) {
        return retry;
      }
    } catch {
      // Keep the early csrf-only payload when the follow-up fails.
    }
    return isSessionPayload(data) ? data : null;
  })().finally(() => {
    bootPending = false;
  });

  return bootPromise;
}

/**
 * Boot only while it is still in flight — once it settles, a 401 is a genuine
 * mid-session expiry and must go through the normal refresh path.
 * @returns {Promise<object | null> | null}
 */
export function getPendingAuthBoot() {
  return bootPending ? bootPromise : null;
}
