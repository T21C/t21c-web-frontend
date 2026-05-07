// tuf-search: #portalRoot
/**
 * Portal mount target: app shell uses `<div class="body">` inside `document.body`.
 * Falls back to `document.body` if the shell is not mounted yet.
 */
export function getPortalRoot(selector = '.body') {
  return document.body.querySelector(selector) ?? document.body;
}
