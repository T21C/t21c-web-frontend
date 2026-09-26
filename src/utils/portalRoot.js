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
export const FLOAT_CHROME_ID = 'tuf-float-chrome';
export const APP_NOTIFICATIONS_ID = 'app-notifications';

/**
 * `#app-notifications` must be a direct child of `document.body`.
 * `#root` is `position: relative; z-index: 2`, so a toast host inside it
 * cannot paint above `#tuf-popup-stack` on body.
 * Returns null when the node is not in the document yet.
 */
export function ensureAppNotificationsOnBody() {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body) return null;
  const host = document.getElementById(APP_NOTIFICATIONS_ID);
  if (host && host.parentElement !== body) {
    body.appendChild(host);
  }
  return host;
}

/**
 * Dedicated stacking root on `document.body`, above nav / `.body`.
 * Nested PopupShells are siblings here so later DOM order (and assigned layers)
 * paints the newest dialog on top.
 */
export function getPopupStackRoot() {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body) return null;
  let stack = document.getElementById(POPUP_STACK_ID);
  if (!stack) {
    stack = document.createElement('div');
    stack.id = POPUP_STACK_ID;
    stack.className = 'tuf-popup-stack';
    stack.setAttribute('data-tuf-popup-stack', '');
    body.appendChild(stack);
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
  const body = typeof document !== 'undefined' ? document.body : null;
  if (stack && body && body.lastElementChild !== stack) {
    body.appendChild(stack);
  }
  popupShellStack.push(el);
  syncPopupShellLayers();
  const chrome = document.getElementById(FLOAT_CHROME_ID);
  if (chrome && body && body.lastElementChild !== chrome) {
    body.appendChild(chrome);
  }
  return () => {
    const idx = popupShellStack.lastIndexOf(el);
    if (idx !== -1) popupShellStack.splice(idx, 1);
    el.style.removeProperty('z-index');
    syncPopupShellLayers();
  };
}

/**
 * Persistent page chrome (FABs) that must paint above every PopupShell.
 * Sibling of `#tuf-popup-stack` on `document.body` at `--z-float`.
 * Pointer events are none on the host so popups stay clickable; children opt in.
 */
export function getFloatChromeRoot() {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body) return null;
  let chrome = document.getElementById(FLOAT_CHROME_ID);
  if (!chrome) {
    chrome = document.createElement('div');
    chrome.id = FLOAT_CHROME_ID;
    chrome.className = 'tuf-float-chrome';
    chrome.setAttribute('data-tuf-float-chrome', '');
    body.appendChild(chrome);
  }
  return chrome;
}

/**
 * Dropdowns / pickers that must paint above the current popup: mount inside that
 * shell (same stacking context). Nested shells are later siblings on the popup
 * stack, so they cover these floats. With no popup open, this is `.body`.
 */
export function getFloatPortalRoot() {
  return getTopPopupShell() ?? getPortalRoot();
}
