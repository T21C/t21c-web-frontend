import { useCallback, useState } from 'react';

/**
 * Captures a scroll-container DOM node for Virtuoso `customScrollParent`.
 * Ref is null on first render; Virtuoso mounts once `scrollParent` is set.
 */
export function useScrollParent() {
  const [scrollParent, setScrollParent] = useState(null);

  const scrollRef = useCallback((node) => {
    setScrollParent(node ?? null);
  }, []);

  return { scrollRef, scrollParent };
}
