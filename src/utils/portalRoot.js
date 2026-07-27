// tuf-search: #portalRoot
/**
 * Portal mount target: app shell uses `<div class="body">` inside `document.body`.
 * Falls back to `document.body` if the shell is not mounted yet.
 * Returns null when `document.body` is unavailable (teardown / odd browsing contexts).
 */
export function getPortalRoot(selector = '.body') {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body) return null;
  return body.querySelector(selector) ?? body;
}
