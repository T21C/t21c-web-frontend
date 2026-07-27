// tuf-search: #externalNavigation #linkConfirm
import { API_BASE, CDN_BASE, OWN_URL_BASES } from '@/config/env';
import { parseSafeUrl } from '@/utils/bioCanvas/urls';

/**
 * First-party / intentionally linked partner hosts (no exit warning).
 * Subdomains match (e.g. `checkout.stripe.com` via `stripe.com`).
 * User-generated destinations (YouTube, Steam, Drive, arbitrary sites) stay unapproved.
 */
export const APPROVED_EXTERNAL_HOSTS = Object.freeze([
  'tuforums.com',
  'api.tuforums.com',
  'stripe.com',
  'ko-fi.com',
  'discord.com',
  'discord.gg',
  'github.com',
  'chromewebstore.google.com',
  'addons.mozilla.org',
  'accounts.google.com',
]);

function hostMatches(hostname, allowed) {
  const host = String(hostname || '').toLowerCase();
  const needle = String(allowed || '').toLowerCase();
  if (!host || !needle) return false;
  return host === needle || host.endsWith(`.${needle}`);
}

function hostnameFromBase(base) {
  const raw = String(base || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${raw}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
}

function collectApprovedHostnames() {
  const hosts = new Set();
  for (const allowed of APPROVED_EXTERNAL_HOSTS) {
    hosts.add(allowed.toLowerCase());
  }
  for (const base of OWN_URL_BASES) {
    const host = hostnameFromBase(base);
    if (host) hosts.add(host);
  }
  for (const base of [CDN_BASE, API_BASE]) {
    const host = hostnameFromBase(base);
    if (host) hosts.add(host);
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    hosts.add(window.location.hostname.toLowerCase());
  }
  return hosts;
}

/** Resolve a URL string against the current location when possible. */
export function resolveNavigationUrl(rawUrl) {
  if (rawUrl == null) return null;
  const asString = String(rawUrl).trim();
  if (!asString) return null;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : undefined;
    return new URL(asString, base).href;
  } catch {
    return null;
  }
}

/**
 * True when navigation should skip the exit warning:
 * same origin, configured OWN/CDN/API hosts, or allowlisted partner domains.
 */
export function isApprovedNavigationUrl(rawUrl) {
  const absolute = resolveNavigationUrl(rawUrl);
  if (!absolute) return false;

  let parsed;
  try {
    parsed = new URL(absolute);
  } catch {
    return false;
  }

  if (parsed.protocol === 'blob:' || parsed.protocol === 'about:') {
    return true;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();
  for (const allowed of collectApprovedHostnames()) {
    if (hostMatches(hostname, allowed)) return true;
  }
  return false;
}

/**
 * Safe http(s) URL that still needs the exit warning (not approved / same-origin).
 * Returns normalized href or null when navigation should not be intercepted.
 */
export function getUnapprovedExternalUrl(rawUrl) {
  const absolute = resolveNavigationUrl(rawUrl);
  if (!absolute) return null;
  const safe = parseSafeUrl(absolute);
  if (!safe) return null;
  if (isApprovedNavigationUrl(safe)) return null;
  return safe;
}
