// tuf-search: #pathnameChange
/**
 * Pathname notifications that fire when the router commits a new location.
 * Used to hide portaled UI immediately: React.lazy + Suspense keeps the
 * previous route mounted (and its portals in `.body`) until the next chunk
 * loads, so React unmount is too late.
 */

const listeners = new Set();

export function emitPathnameChange(pathname) {
  listeners.forEach((listener) => listener(pathname));
}

export function subscribePathnameChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
