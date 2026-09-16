// tuf-search: #useBodyScrollLock
import { useEffect } from 'react';
import { subscribePathnameChange } from '@/utils/pathnameChange';

/**
 * Lock vertical scroll on `document.body` while `active` is true.
 * Preserves window.scrollY across lock/unlock so locking a popup does not
 * yank window-scrolled lists (e.g. Virtuoso useWindowScroll) back to top.
 * Releases immediately on pathname change so a hidden-but-still-mounted
 * popup (lazy route Suspense) does not keep the next page unscrollable.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const scrollY = window.scrollY;
    const mountPath = window.location.pathname;
    let navigatedAway = false;
    document.body.style.overflowY = 'hidden';

    const unsub = subscribePathnameChange((pathname) => {
      if (pathname === mountPath) return;
      navigatedAway = true;
      document.body.style.overflowY = '';
    });

    return () => {
      unsub();
      document.body.style.overflowY = '';
      if (!navigatedAway && window.scrollY !== scrollY) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [active]);
}
