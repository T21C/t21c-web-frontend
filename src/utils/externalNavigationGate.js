// tuf-search: #externalNavigationGate #linkConfirm
import {
  isApprovedNavigationUrl,
  resolveNavigationUrl,
} from '@/utils/externalNavigation';
import { parseSafeUrl } from '@/utils/bioCanvas/urls';

/** Set by LinkConfirmProvider while mounted. */
let confirmer = null;

let bypassCount = 0;

/** Native open captured before any app patch. */
export const nativeWindowOpen =
  typeof window !== 'undefined' && typeof window.open === 'function'
    ? window.open.bind(window)
    : () => null;

export const nativeLocationAssign =
  typeof window !== 'undefined'
    ? window.location.assign.bind(window.location)
    : () => {};

export const nativeLocationReplace =
  typeof window !== 'undefined'
    ? window.location.replace.bind(window.location)
    : () => {};

export function registerExternalNavigationConfirmer(fn) {
  confirmer = typeof fn === 'function' ? fn : null;
  return () => {
    if (confirmer === fn) confirmer = null;
  };
}

export function withExternalNavigationBypass(fn) {
  bypassCount += 1;
  try {
    return fn();
  } finally {
    bypassCount -= 1;
  }
}

export function isExternalNavigationBypassActive() {
  return bypassCount > 0;
}

/**
 * Ask the exit-warning modal when needed. Approved / same-origin URLs resolve true.
 * Returns false when the URL is invalid or the user cancels.
 */
export async function confirmExternalNavigation(rawUrl, { force = false } = {}) {
  const safe = parseSafeUrl(resolveNavigationUrl(rawUrl) || '');
  if (!safe) return false;
  if (!force && isApprovedNavigationUrl(safe)) return true;
  if (!confirmer) return false;
  return confirmer(safe, { force });
}

/**
 * Confirm (if needed) then navigate. Prefer this over raw location.href for user-content URLs.
 * `skipWarning` is for flows that already disclosed the destination (OAuth provider hops
 * and the consent redirect). Unsafe schemes are still rejected.
 */
export async function navigateExternal(rawUrl, { newTab = false, skipWarning = false, forceWarning = false } = {}) {
  const absolute = resolveNavigationUrl(rawUrl);
  if (!absolute) return false;
  const safe = parseSafeUrl(absolute);
  if (!safe) return false;

  const needsWarning = !skipWarning && (forceWarning || !isApprovedNavigationUrl(safe));
  if (needsWarning) {
    const ok = await confirmExternalNavigation(safe, { force: true });
    if (!ok) return false;
  }

  withExternalNavigationBypass(() => {
    if (newTab) {
      nativeWindowOpen(safe, '_blank', 'noopener,noreferrer');
    } else {
      nativeLocationAssign(safe);
    }
  });
  return true;
}
