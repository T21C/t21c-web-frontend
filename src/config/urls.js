// tuf-search: #urlHelpers
import { API_BASE, CDN_BASE, OWN_BASE } from '@/config/env';

function joinUrl(base, path) {
  const b = String(base ?? '').trim();
  const p = String(path ?? '');
  if (!b) return p.startsWith('/') ? p : `/${p}`;
  return new URL(p.replace(/^\//, ''), `${b}/`).toString();
}

/** Absolute URL for an API path (SSE, window.location, etc.). */
export function apiUrl(path) {
  return joinUrl(API_BASE, path);
}

export function cdnUrl(path) {
  return joinUrl(CDN_BASE, path);
}

export function ownUrl(path) {
  return joinUrl(OWN_BASE, path);
}
