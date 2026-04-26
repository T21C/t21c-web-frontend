import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets window scroll on SPA navigations. Without this, scroll position is
 * preserved across <Link> / navigate() route changes (e.g. mid-page on /levels
 * → same scroll on /creator/:id).
 */
export function ScrollToTopOnNavigate() {
  const { key } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  return null;
}
