// tuf-search: #useNavHoverMenu #layout #navigation
import { useCallback, useId, useRef, useState } from "react";

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

/**
 * Independent open/closing/closed state for one nav panel.
 * Several menus may be animating at once while sweeping the bar.
 */
export function useNavHoverMenu({ reducedMotion = false, enabled = true } = {}) {
  const reactId = useId();
  const panelId = `nav-drop-${sanitizeDomId(reactId) || "panel"}`;
  const [phase, setPhase] = useState("closed");
  const [zIndex, setZIndex] = useState(1);
  const phaseRef = useRef(phase);

  phaseRef.current = phase;

  const open = useCallback(() => {
    if (!enabled) return;
    setZIndex(nextNavMenuZ());
    setPhase("open");
  }, [enabled]);

  const close = useCallback(() => {
    if (phaseRef.current === "closed") return;
    if (reducedMotion) {
      setPhase("closed");
      return;
    }
    setPhase("closing");
  }, [reducedMotion]);

  const closeNow = useCallback(() => {
    setPhase("closed");
  }, []);

  const scheduleOpen = useCallback(() => {
    if (!enabled) return;
    if (phaseRef.current === "open") return;
    open();
  }, [enabled, open]);

  const scheduleClose = useCallback(() => {
    if (!enabled) return;
    close();
  }, [close, enabled]);

  const handleCloseAnimationEnd = useCallback(() => {
    if (phaseRef.current === "closing") {
      setPhase("closed");
    }
  }, []);

  return {
    phase,
    isVisible: phase === "open" || phase === "closing",
    isOpen: phase === "open",
    zIndex,
    panelId,
    open,
    close,
    closeNow,
    scheduleOpen,
    scheduleClose,
    handleCloseAnimationEnd,
  };
}
