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

export const POPUP_STACK_ID = 'tuf-popup-stack';

function getAppRoot() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root') ?? document.body;
}

/**
 * Dedicated stacking root on `#root` (same tree as the toaster), above nav / `.body`.
 * Nested PopupShells are siblings here so later DOM order (and assigned layers)
 * paints the newest dialog on top. Must stay inside `#root` so `--z-toast` on
 * `.app-notifications` can paint above `--z-popup`.
 */
export function getPopupStackRoot() {
  const root = getAppRoot();
  if (!root) return null;
  let stack = document.getElementById(POPUP_STACK_ID);
  if (!stack) {
    stack = document.createElement('div');
    stack.id = POPUP_STACK_ID;
    stack.className = 'tuf-popup-stack';
    stack.setAttribute('data-tuf-popup-stack', '');
    root.appendChild(stack);
  } else if (stack.parentElement !== root) {
    root.appendChild(stack);
  }
  return stack;
}

const popupShellStack = [];

function documentOrder(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

function orderedPopupShells() {
  return popupShellStack.filter(Boolean).sort(documentOrder);
}

function syncPopupShellLayers() {
  orderedPopupShells().forEach((node, index) => {
    node.style.setProperty('z-index', String(index + 1), 'important');
  });
}

/** Visually topmost open PopupShell overlay, or null. */
export function getTopPopupShell() {
  const ordered = orderedPopupShells();
  return ordered[ordered.length - 1] ?? null;
}

/** Register an open PopupShell overlay node. Returns an unregister function. */
export function registerPopupShell(el) {
  if (!el) return () => {};
  const stack = getPopupStackRoot();
  const root = getAppRoot();
  if (stack && root && root.lastElementChild !== stack) {
    root.appendChild(stack);
  }
  popupShellStack.push(el);
  syncPopupShellLayers();
  return () => {
    const idx = popupShellStack.lastIndexOf(el);
    if (idx !== -1) popupShellStack.splice(idx, 1);
    el.style.removeProperty('z-index');
    syncPopupShellLayers();
  };
}

/**
 * Dropdowns / pickers that must paint above the current popup: mount inside that
 * shell (same stacking context). Nested shells are later siblings on the popup
 * stack, so they cover these floats. With no popup open, this is `.body`.
 */
export function getFloatPortalRoot() {
  return getTopPopupShell() ?? getPortalRoot();
}
