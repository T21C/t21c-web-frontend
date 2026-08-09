// tuf-search: #useBodyScrollLock
import { useEffect } from 'react';

/**
 * Lock vertical scroll on `document.body` while `active` is true.
 * Preserves window.scrollY across lock/unlock so locking a popup does not
 * yank window-scrolled lists (e.g. Virtuoso useWindowScroll) back to top.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const scrollY = window.scrollY;
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
      if (window.scrollY !== scrollY) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [active]);
}
