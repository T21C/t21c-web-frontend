// tuf-search: #useNavHoverMenu #layout #navigation
import { useCallback, useEffect, useId, useRef, useState } from "react";

export const NAV_DROP_DURATION_MS = 280;

let navMenuZ = 1;

export function nextNavMenuZ() {
  navMenuZ += 1;
  if (navMenuZ > 9) navMenuZ = 1;
  return navMenuZ;
}

export function sanitizeDomId(id) {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function isModifiedClick(event) {
  return Boolean(
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
  );
}

/**
 * Independent open/closing/closed state for one nav panel.
 * Several menus may be animating at once while sweeping the bar.
 * A click on the trigger pins the panel so mouseleave will not close it
 * until a click outside (or Escape / another trigger click).
 */
export function useNavHoverMenu({
  reducedMotion = false,
  enabled = true,
  rootRef = null,
} = {}) {
  const reactId = useId();
  const panelId = `nav-drop-${sanitizeDomId(reactId) || "panel"}`;
  const [phase, setPhase] = useState("closed");
  const [zIndex, setZIndex] = useState(1);
  const [isPinned, setIsPinned] = useState(false);
  const phaseRef = useRef(phase);
  const pinnedRef = useRef(false);

  phaseRef.current = phase;

  const unpin = useCallback(() => {
    pinnedRef.current = false;
    setIsPinned(false);
  }, []);

  const beginClose = useCallback(() => {
    if (phaseRef.current === "closed") return;
    if (reducedMotion) {
      setPhase("closed");
      return;
    }
    setPhase("closing");
  }, [reducedMotion]);

  const open = useCallback(() => {
    if (!enabled) return;
    setZIndex(nextNavMenuZ());
    setPhase("open");
  }, [enabled]);

  const close = useCallback(() => {
    if (pinnedRef.current) return;
    beginClose();
  }, [beginClose]);

  const closeNow = useCallback(() => {
    unpin();
    setPhase("closed");
  }, [unpin]);

  const dismiss = useCallback(() => {
    unpin();
    beginClose();
  }, [beginClose, unpin]);

  const pin = useCallback(() => {
    if (!enabled) return;
    pinnedRef.current = true;
    setIsPinned(true);
    open();
  }, [enabled, open]);

  const scheduleOpen = useCallback(() => {
    if (!enabled) return;
    if (phaseRef.current === "open") return;
    open();
  }, [enabled, open]);

  const scheduleClose = useCallback(() => {
    if (!enabled) return;
    close();
  }, [close, enabled]);

  const handleTriggerClick = useCallback(
    (event) => {
      if (!enabled) return;
      if (isModifiedClick(event)) return;
      event.preventDefault();
      if (pinnedRef.current) {
        dismiss();
        return;
      }
      pin();
    },
    [dismiss, enabled, pin],
  );

  const handleRootBlur = useCallback(
    (event) => {
      if (pinnedRef.current) return;
      const next = event.relatedTarget;
      const root = rootRef?.current;
      if (root && next && root.contains(next)) return;
      close();
    },
    [close, rootRef],
  );

  const handleCloseAnimationEnd = useCallback(() => {
    if (phaseRef.current === "closing") {
      setPhase("closed");
    }
  }, []);

  useEffect(() => {
    if (!isPinned) return undefined;

    const onPointerDown = (event) => {
      const root = rootRef?.current;
      if (root && root.contains(event.target)) return;
      dismiss();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [dismiss, isPinned, rootRef]);

  return {
    phase,
    isVisible: phase === "open" || phase === "closing",
    isOpen: phase === "open",
    isPinned,
    zIndex,
    panelId,
    open,
    close,
    closeNow,
    dismiss,
    pin,
    scheduleOpen,
    scheduleClose,
    handleTriggerClick,
    handleRootBlur,
    handleCloseAnimationEnd,
  };
}
