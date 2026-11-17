// tuf-search: #useDismissOnOutsidePointer #selectors
import { useEffect } from 'react';

/**
 * Close an open select/menu when the pointer goes down outside it.
 * Listens in the capture phase so an ancestor `stopPropagation` cannot leave it open.
 * `containsTarget` keeps a portaled menu (not under `rootRef`) from counting as outside.
 */
export function useDismissOnOutsidePointer(open, onDismiss, { rootRef, containsTarget } = {}) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef?.current?.contains(target)) return;
      if (containsTarget?.(target)) return;
      onDismiss(event);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, onDismiss, rootRef, containsTarget]);
}
