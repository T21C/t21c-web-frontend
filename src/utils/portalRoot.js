// tuf-search: #portalRoot
import { createContext, useContext, useLayoutEffect, useState } from 'react';

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
export const POPOVER_SLOT_ATTR = 'data-tuf-popover-slot';

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
 * Nested PopupShells are siblings here so later DOM order paints the newest
 * dialog on top. Popovers mount in a slot immediately after the owning shell.
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
const popoverRootListeners = new Set();
const slotsByShell = new WeakMap();

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

function notifyPopoverRoots() {
  popoverRootListeners.forEach((listener) => listener());
}

/** Subscribe to popup-stack slot changes. Returns an unsubscribe function. */
export function subscribePopoverRoot(listener) {
  popoverRootListeners.add(listener);
  return () => {
    popoverRootListeners.delete(listener);
  };
}

function isPopoverSlot(node) {
  return Boolean(node && node.nodeType === 1 && node.hasAttribute(POPOVER_SLOT_ATTR));
}

function createPopoverSlot() {
  const slot = document.createElement('div');
  slot.className = 'tuf-popover-slot';
  slot.setAttribute(POPOVER_SLOT_ATTR, '');
  return slot;
}

/** React portal wrap is the stack child. Insert the slot after that wrap, not inside it. */
function stackWrapForShell(el) {
  if (!el) return null;
  const parent = el.parentElement;
  if (parent?.hasAttribute('data-tuf-portal')) return parent;
  return el;
}

function ensureSlotAfterShell(shellEl) {
  if (!shellEl) return null;
  const existing = slotsByShell.get(shellEl);
  if (existing?.isConnected) return existing;
  const wrap = stackWrapForShell(shellEl);
  const host = wrap?.parentNode ?? getPopupStackRoot();
  if (!host) return null;
  const after = wrap?.nextElementSibling;
  if (isPopoverSlot(after)) {
    slotsByShell.set(shellEl, after);
    return after;
  }
  const slot = createPopoverSlot();
  if (wrap?.parentNode) {
    wrap.parentNode.insertBefore(slot, wrap.nextSibling);
  } else {
    host.appendChild(slot);
  }
  slotsByShell.set(shellEl, slot);
  return slot;
}

function removeSlotForShell(shellEl) {
  const slot = slotsByShell.get(shellEl);
  slotsByShell.delete(shellEl);
  if (slot && slot.childElementCount === 0) slot.remove();
}

function ensureIdlePopoverSlot(stack) {
  const idle = [...stack.children].find((child) => isPopoverSlot(child));
  if (idle) return idle;
  const slot = createPopoverSlot();
  stack.appendChild(slot);
  return slot;
}

function pruneEmptyOrphanSlots(stack) {
  const keep = new Set();
  orderedPopupShells().forEach((shell) => {
    const slot = slotsByShell.get(shell);
    if (slot) keep.add(slot);
    const wrap = stackWrapForShell(shell);
    const after = wrap?.nextElementSibling;
    if (isPopoverSlot(after)) keep.add(after);
  });
  if (!popupShellStack.length) {
    const idle = [...stack.children].find((child) => isPopoverSlot(child));
    if (idle) keep.add(idle);
  }
  [...stack.querySelectorAll(`[${POPOVER_SLOT_ATTR}]`)].forEach((child) => {
    if (!keep.has(child) && child.childElementCount === 0) {
      child.remove();
    }
  });
}

/** Visually topmost open PopupShell overlay, or null. */
export function getTopPopupShell() {
  const ordered = orderedPopupShells();
  return ordered[ordered.length - 1] ?? null;
}

/**
 * Slot after `shellEl`, or the idle stack slot when no dialog is open.
 * Paint order is DOM order inside `#tuf-popup-stack`; the slot must not use a
 * positive z-index or it would cover later shells.
 */
export function getPopoverRoot(shellEl) {
  if (typeof document === 'undefined') return null;
  const stack = getPopupStackRoot();
  if (!stack) return null;
  if (!shellEl) return ensureIdlePopoverSlot(stack);
  const slot = ensureSlotAfterShell(shellEl) ?? ensureIdlePopoverSlot(stack);
  pruneEmptyOrphanSlots(stack);
  return slot;
}

/** Register an open PopupShell overlay node. Returns an unregister function. */
export function registerPopupShell(el) {
  if (!el) return () => {};
  popupShellStack.push(el);
  ensureSlotAfterShell(el);
  const stack = getPopupStackRoot();
  if (stack) pruneEmptyOrphanSlots(stack);
  notifyPopoverRoots();
  return () => {
    const idx = popupShellStack.lastIndexOf(el);
    if (idx !== -1) popupShellStack.splice(idx, 1);
    removeSlotForShell(el);
    const nextStack = getPopupStackRoot();
    if (nextStack) pruneEmptyOrphanSlots(nextStack);
    notifyPopoverRoots();
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
 * Dropdowns / pickers that must paint above the current popup: mount in the
 * popover slot after that shell. Nested shells are later siblings, so they
 * cover these floats. With no popup open, this is the idle slot on the stack.
 */
export function getFloatPortalRoot() {
  return getPopoverRoot(getTopPopupShell());
}

export const PopupLayerContext = createContext(null);

/**
 * Popover mount node for the nearest PopupShell.
 * Page-level floats stay in the idle slot so later dialogs cover them.
 */
export function usePopoverRoot() {
  const layer = useContext(PopupLayerContext);
  const [, setVersion] = useState(0);
  useLayoutEffect(() => {
    setVersion((value) => value + 1);
    return subscribePopoverRoot(() => setVersion((value) => value + 1));
  }, []);
  const owner = layer ? layer.shell ?? getTopPopupShell() : null;
  return getPopoverRoot(owner);
}
