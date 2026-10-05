// tuf-search: #useNavProfileCycle #layout #navigation
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_DROPDOWN_CLICK_MODE_CYCLE } from "@/hooks/useNavDropdownClickModePreference";
import {
  NAV_CYCLE_HOVER_OFF_MS,
  NAV_CYCLE_RESET_MS,
} from "./NavDropdown/NavDropdown";

function isModifiedClick(event) {
  return Boolean(
    event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey,
  );
}

/**
 * Round-robin through profile destinations.
 * Same timing as section dropdowns: 5s reset, 750ms after the pointer leaves.
 */
export function useNavProfileCycle(cycleTos, { pin, dismiss, clickMode } = {}) {
  const navigate = useNavigate();
  const cycleIndexRef = useRef(0);
  const cycleTimerRef = useRef(null);
  const cycleTosRef = useRef(cycleTos);
  const clickModeRef = useRef(clickMode);
  cycleTosRef.current = cycleTos;

  const armCycleTimer = useCallback(
    (delayMs) => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = setTimeout(() => {
        cycleIndexRef.current = 0;
        cycleTimerRef.current = null;
        dismiss?.();
      }, delayMs);
    },
    [dismiss],
  );

  const advance = useCallback(
    (event) => {
      if (isModifiedClick(event)) return false;
      event?.preventDefault?.();
      const tos = cycleTosRef.current;
      const len = tos.length;
      if (!len) return false;
      const index = ((cycleIndexRef.current % len) + len) % len;
      const to = tos[index];
      cycleIndexRef.current = (index + 1) % len;
      armCycleTimer(NAV_CYCLE_RESET_MS);
      pin?.();
      navigate(to);
      return true;
    },
    [armCycleTimer, navigate, pin],
  );

  const isTimerArmed = useCallback(() => Boolean(cycleTimerRef.current), []);

  const notePointerEnter = useCallback(() => {
    if (
      clickMode === NAV_DROPDOWN_CLICK_MODE_CYCLE &&
      cycleTimerRef.current
    ) {
      armCycleTimer(NAV_CYCLE_RESET_MS);
    }
  }, [armCycleTimer, clickMode]);

  const shortenOnLeave = useCallback(() => {
    if (
      clickMode !== NAV_DROPDOWN_CLICK_MODE_CYCLE ||
      !cycleTimerRef.current
    ) {
      return false;
    }
    armCycleTimer(NAV_CYCLE_HOVER_OFF_MS);
    return true;
  }, [armCycleTimer, clickMode]);

  useEffect(() => {
    if (clickModeRef.current === clickMode) return;
    clickModeRef.current = clickMode;
    cycleIndexRef.current = 0;
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
      dismiss?.();
    }
  }, [clickMode, dismiss]);

  useEffect(() => {
    return () => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    };
  }, []);

  return {
    advance,
    isTimerArmed,
    notePointerEnter,
    shortenOnLeave,
  };
}
