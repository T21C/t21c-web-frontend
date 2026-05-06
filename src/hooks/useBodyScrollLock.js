// tuf-search: #useBodyScrollLock
import { useEffect } from 'react';

/**
 * Lock vertical scroll on `document.body` while `active` is true.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
    };
  }, [active]);
}
