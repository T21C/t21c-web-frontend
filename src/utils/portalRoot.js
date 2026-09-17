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

const popupShellStack = [];

/** Register an open PopupShell overlay node. Returns an unregister function. */
export function registerPopupShell(el) {
  if (!el) return () => {};
  popupShellStack.push(el);
  return () => {
    const idx = popupShellStack.lastIndexOf(el);
    if (idx !== -1) popupShellStack.splice(idx, 1);
  };
}

/**
 * Dropdowns / pickers that must paint above the current popup: mount inside that
 * shell (same stacking context). Nested shells are later siblings, so they cover
 * these floats. With no popup open, this is `.body` like getPortalRoot().
 */
export function getFloatPortalRoot() {
  return popupShellStack[popupShellStack.length - 1] ?? getPortalRoot();
}
