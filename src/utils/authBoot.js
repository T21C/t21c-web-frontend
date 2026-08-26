// tuf-search: #authBoot
/**
 * Single in-flight SPA session bootstrap shared by the HTML prefetch, AuthProvider
 * and the axios 401 interceptor. Two concurrent refresh rotations invalidate each
 * other's token, so everything on boot funnels through one promise.
 *
 * The promise only settles once GET /session returns an explicit payload
 * (`csrfToken` + `user` or `user: null`). Transient failures keep retrying.
 */

import { readCachedUser } from '@/utils/authUserCache';

let earlyBoot = null;
let bootPromise = null;
let bootPending = false;
let bootSettled = false;
let resolveBoot = null;
let settledPayload = null;

const MAX_BACKOFF_MS = 15000;
const INITIAL_BACKOFF_MS = 1000;

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

function settleAuthBoot(data) {
  if (bootSettled || !isSessionPayload(data)) return false;
  bootSettled = true;
  bootPending = false;
  settledPayload = data;
  if (resolveBoot) {
    resolveBoot(data);
    resolveBoot = null;
  }
  return true;
}

function waitForRetry(ms) {
  return new Promise((resolve) => {
    if (ms <= 0 || typeof window === 'undefined') {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener('online', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, ms);
    window.addEventListener('online', finish);
  });
}

async function readPrefetch() {
  const early = takeEarlyBoot();
  if (!early) return null;
  return early.catch(() => null);
}

/**
 * Stop the retry loop when login/logout already produced an explicit session.
 * @param {object} data
 */
export function completeAuthBoot(data) {
  settleAuthBoot(data);
}

/**
 * @param {() => Promise<object | null>} fetcher Used when the HTML prefetch is absent or failed.
 * @returns {Promise<object>} Explicit session payload (`user` or `user: null`).
 */
export function ensureAuthBoot(fetcher) {
  if (bootPromise) return bootPromise;

  bootPromise = new Promise((resolve) => {
    resolveBoot = resolve;
  });

  if (settledPayload) {
    bootPending = false;
    resolveBoot(settledPayload);
    resolveBoot = null;
    return bootPromise;
  }

  bootPending = true;

  void (async () => {
    const cachedUser = readCachedUser();
    const prefetch = await readPrefetch();
    if (bootSettled) return;

    if (isSessionPayload(prefetch) && prefetch.user) {
      settleAuthBoot(prefetch);
      return;
    }
    // Prefetch `{ user: null }` is only trusted when we have no cached session.
    // A dying instance can still emit anonymous 200s during a rolling deploy.
    if (isSessionPayload(prefetch) && !prefetch.user && !cachedUser) {
      settleAuthBoot(prefetch);
      return;
    }

    let backoffMs = 0;
    while (!bootSettled) {
      if (backoffMs > 0) {
        await waitForRetry(backoffMs);
        if (bootSettled) return;
      }
      try {
        const retry = await fetcher();
        if (bootSettled) return;
        if (isSessionPayload(retry)) {
          settleAuthBoot(retry);
          return;
        }
      } catch {
        // 5xx / network / parse — not an explicit no; retry.
      }
      backoffMs = backoffMs === 0 ? INITIAL_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    }
  })();

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
