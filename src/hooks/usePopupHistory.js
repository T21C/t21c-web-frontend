// tuf-search: #usePopupHistory
import { useEffect, useRef } from 'react';

const POPUP_STATE_KEY = '__tufPopup';

/**
 * Push one session-history entry while a popup is mounted so browser Back
 * closes it. Removes that entry on unmount when closed programmatically so
 * the stack does not accumulate duplicate same-URL rows.
 *
 * Call from a component that only mounts while the popup is open (or pass a
 * stable `isOpen` that flips once per open cycle). Do not key this on props
 * that change identity every render.
 *
 * @param {boolean} isOpen
 * @param {() => void} onBack - invoked when the user presses Back
 */
export function usePopupHistory(isOpen, onBack) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const ownedEntryRef = useRef(false);
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    window.history.pushState({ [POPUP_STATE_KEY]: true }, '');
    ownedEntryRef.current = true;
    ignoreNextPopRef.current = false;

    const onPopState = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      if (!ownedEntryRef.current) return;
      ownedEntryRef.current = false;
      onBackRef.current?.();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!ownedEntryRef.current) return;
      ownedEntryRef.current = false;
      // Drop our entry without leaving it on the stack. Listener is already
      // removed; ignore flag covers any overlapping router popstate handlers.
      if (window.history.state?.[POPUP_STATE_KEY]) {
        ignoreNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [isOpen]);
}
