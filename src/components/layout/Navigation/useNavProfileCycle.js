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
 * Round-robin through each dual-target row on its own.
 * Same timing as section dropdowns: 5s reset, 750ms after the pointer leaves.
 * `groups` is an array of destination lists, one per menu row.
 */
export function useNavProfileCycles(groups, { pin, dismiss, clickMode } = {}) {
  const navigate = useNavigate();
  const indexesRef = useRef([]);
  const timersRef = useRef([]);
  const groupsRef = useRef(groups);
  const clickModeRef = useRef(clickMode);
  groupsRef.current = groups;

  const armCycleTimer = useCallback(
    (groupIndex, delayMs) => {
      if (timersRef.current[groupIndex]) clearTimeout(timersRef.current[groupIndex]);
      timersRef.current[groupIndex] = setTimeout(() => {
        indexesRef.current[groupIndex] = 0;
        timersRef.current[groupIndex] = null;
        dismiss?.();
      }, delayMs);
    },
    [dismiss],
  );

  const advance = useCallback(
    (groupIndex, event) => {
      if (isModifiedClick(event)) return false;
      event?.preventDefault?.();
      const tos = groupsRef.current[groupIndex] || [];
      const len = tos.length;
      if (!len) return false;
      const index = (((indexesRef.current[groupIndex] || 0) % len) + len) % len;
      const to = tos[index];
      indexesRef.current[groupIndex] = (index + 1) % len;
      armCycleTimer(groupIndex, NAV_CYCLE_RESET_MS);
      pin?.();
      navigate(to);
      return true;
    },
    [armCycleTimer, navigate, pin],
  );

  const isTimerArmed = useCallback(
    () => timersRef.current.some((timer) => Boolean(timer)),
    [],
  );

  const notePointerEnter = useCallback(() => {
    if (clickMode !== NAV_DROPDOWN_CLICK_MODE_CYCLE) return;
    timersRef.current.forEach((timer, groupIndex) => {
      if (timer) armCycleTimer(groupIndex, NAV_CYCLE_RESET_MS);
    });
  }, [armCycleTimer, clickMode]);

  const shortenOnLeave = useCallback(() => {
    if (clickMode !== NAV_DROPDOWN_CLICK_MODE_CYCLE) return false;
    let held = false;
    timersRef.current.forEach((timer, groupIndex) => {
      if (!timer) return;
      armCycleTimer(groupIndex, NAV_CYCLE_HOVER_OFF_MS);
      held = true;
    });
    return held;
  }, [armCycleTimer, clickMode]);

  useEffect(() => {
    if (clickModeRef.current === clickMode) return;
    clickModeRef.current = clickMode;
    indexesRef.current = [];
    const hadTimer = timersRef.current.some(Boolean);
    timersRef.current.forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    timersRef.current = [];
    if (hadTimer) dismiss?.();
  }, [clickMode, dismiss]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return {
    advance,
    isTimerArmed,
    notePointerEnter,
    shortenOnLeave,
  };
}

/**
 * Round-robin through one destination list.
 * Same timing as section dropdowns: 5s reset, 750ms after the pointer leaves.
 */
export function useNavProfileCycle(cycleTos, options) {
  const cycles = useNavProfileCycles([cycleTos], options);
  const advance = useCallback(
    (event) => cycles.advance(0, event),
    [cycles.advance],
  );

  return {
    advance,
    isTimerArmed: cycles.isTimerArmed,
    notePointerEnter: cycles.notePointerEnter,
    shortenOnLeave: cycles.shortenOnLeave,
  };
}
