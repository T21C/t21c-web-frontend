import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const ROW_SELECTOR = '[data-downloaded-level-id]';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useDownloadedLevelRemoval = (levels, itemsByIndex, totalCount) => {
  const listRef = useRef(null);
  const pendingRemoval = useRef(null);
  const animations = useRef(new Set());

  const cancelAnimations = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current.clear();
  }, []);

  const prepareRemoval = useCallback(async (id) => {
    const list = listRef.current;
    const row = list?.querySelector(`[data-downloaded-level-id="${Number(id)}"]`);
    if (!row?.animate || reducedMotion()) return;

    // Keep the row's fixed virtual height while its contents fade away.
    const exit = row.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 120, easing: 'ease-out', fill: 'forwards',
    });
    animations.current.add(exit);
    await exit.finished.catch(() => {});
    if (!row.isConnected || reducedMotion()) {
      cancelAnimations();
      return;
    }
    const positions = new Map(Array.from(list.querySelectorAll(ROW_SELECTOR), (element) => (
      [element.dataset.downloadedLevelId, element.getBoundingClientRect().top]
    )));
    // Virtuoso owns the keyed rows and commits them after the parent. Observe
    // that one removal so positions are inverted in the same frame as the
    // actual DOM change, before the updated list is painted.
    pendingRemoval.current?.disconnect();
    const observer = new MutationObserver(() => {
      if (list.querySelector(`[data-downloaded-level-id="${Number(id)}"]`)) return;
      observer.disconnect();
      pendingRemoval.current = null;
      // Positions include any unfinished movement, allowing successive deletes
      // to continue from where the remaining rows are currently displayed.
      cancelAnimations();
      if (reducedMotion()) return;
      const movements = Array.from(list.querySelectorAll(ROW_SELECTOR), (row) => {
        const top = row.getBoundingClientRect().top;
        return { row, offset: (positions.get(row.dataset.downloadedLevelId) ?? top) - top };
      }).filter(({ offset }) => Math.abs(offset) > 0.5);

      // Animate the row contents rather than the wrappers measured by Virtuoso.
      movements.forEach(({ row, offset }) => {
        const animation = row.animate([
          { transform: `translateY(${offset}px)` },
          { transform: 'translateY(0)' },
        ], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        animations.current.add(animation);
        animation.finished.then(
          () => animations.current.delete(animation),
          () => animations.current.delete(animation),
        );
      });
    });
    pendingRemoval.current = observer;
    observer.observe(list, { childList: true, subtree: true });
  }, [cancelAnimations]);

  useLayoutEffect(() => {
    if (listRef.current) return;
    pendingRemoval.current?.disconnect();
    pendingRemoval.current = null;
    cancelAnimations();
  }, [cancelAnimations, itemsByIndex, levels, totalCount]);

  useEffect(() => () => {
    pendingRemoval.current?.disconnect();
    pendingRemoval.current = null;
    cancelAnimations();
  }, [cancelAnimations]);

  return { listRef, prepareRemoval };
};
