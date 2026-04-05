import { useEffect } from 'react';

/**
 * Lock vertical scroll on `document.body` while `active` is true.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    document.body.style.overflowY = 'hidden';
    document.body.style.paddingRight = '17px';
    document.getElementsByTagName('nav')[0].style.paddingRight = '17px';
    return () => {
      document.body.style.overflowY = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.paddingRight = '';
      document.getElementsByTagName('nav')[0].style.paddingRight = '';
    };
  }, [active]);
}
