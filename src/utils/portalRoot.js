/**
 * Portal mount target: app shell uses `<div class="body">` inside `document.body`.
 * Falls back to `document.body` if the shell is not mounted yet.
 */
export function getPortalRoot() {
  return document.body.querySelector('.body') ?? document.body;
}
