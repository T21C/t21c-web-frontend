// tuf-search: #PathnameChangeBridge #pathnameChangeBridge #routing
import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { emitPathnameChange } from "@/utils/pathnameChange";

/**
 * Must render outside the route <Suspense> boundary (see App.jsx) so it
 * commits as soon as the location changes, even while the next lazy page
 * is still loading.
 */
export function PathnameChangeBridge() {
  const { pathname } = useLocation();
  const isFirst = useRef(true);

  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    emitPathnameChange(pathname);
  }, [pathname]);

  return null;
}
