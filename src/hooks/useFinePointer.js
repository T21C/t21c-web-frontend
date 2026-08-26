// tuf-search: #useFinePointer #layout #navigation
import { useSyncExternalStore } from "react";

export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeFinePointer(onChange) {
  const mq = window.matchMedia(FINE_POINTER_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

/**
 * Primary pointer can hover with precision (mouse / trackpad).
 * Server snapshot assumes desktop so CSS-default chrome stays aligned.
 */
export function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    () => true,
  );
}

export function subscribeFinePointerChange(onChange) {
  return subscribeFinePointer(onChange);
}

export function matchesFinePointer() {
  if (typeof window === "undefined") return true;
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}
