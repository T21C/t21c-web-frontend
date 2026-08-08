// tuf-search: #ScrollToTopOnNavigate #scrollToTopOnNavigate #routing
import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Resets window scroll on SPA navigations. Without this, scroll position is
 * preserved across <Link> / navigate() route changes (e.g. mid-page on /levels
 * ➔ same scroll on /creator/:id).
 *
 * Skips reset on POP (back/forward) so VirtualList can restore via Virtuoso
 * restoreStateFrom without fighting this or browser scroll restoration.
 *
 * Skips when the navigated location sets `state.preserveScroll` (soft overlays
 * like /rating → /rating/:levelId that keep the same list mounted).
 */
export function ScrollToTopOnNavigate() {
  const { key, state } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    if (state && typeof state === "object" && state.preserveScroll) return;
    window.scrollTo(0, 0);
  }, [key, navigationType, state]);

  return null;
}
