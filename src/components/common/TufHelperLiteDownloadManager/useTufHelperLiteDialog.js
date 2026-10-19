import { useEffect } from 'react';
import { getPortalRoot } from '@/utils/portalRoot';

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export const useTufHelperLiteDialog = (dialogRef, enabled = true) => {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!enabled || !dialog) return undefined;
    dialog?.focus();
    const roots = Array.from(new Set([
      getPortalRoot(), document.documentElement, document.body,
    ].filter(Boolean)));
    const previous = roots.map((root) => ({
      root,
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
      scrollbarGutter: root.style.scrollbarGutter,
    }));
    roots.forEach((root) => {
      root.style.overflow = 'hidden';
      root.style.overscrollBehavior = 'none';
      root.style.scrollbarGutter = 'stable';
    });
    const containFocus = (event) => {
      if (event.key !== 'Tab' || !dialog) return;
      const confirmation = dialog.querySelector('[role="alertdialog"]');
      const scope = confirmation || dialog;
      const elements = Array.from(scope.querySelectorAll(FOCUSABLE))
        .filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !scope.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', containFocus);
    return () => {
      document.removeEventListener('keydown', containFocus);
      previous.forEach(({ root, overflow, overscrollBehavior, scrollbarGutter }) => {
        root.style.overflow = overflow;
        root.style.overscrollBehavior = overscrollBehavior;
        root.style.scrollbarGutter = scrollbarGutter;
      });
    };
  }, [dialogRef, enabled]);
};
