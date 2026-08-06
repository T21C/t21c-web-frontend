// tuf-search: #viewDurationTracker #viewDuration
import { useCallback, useEffect, useRef } from 'react';

/**
 * Format view duration for display (aligned with levelHelpers.formatDuration /
 * rateLimitError.formatRetryAfter — no leading zero hours/minutes).
 *
 * - under 1 minute → `{ mode: 'seconds', count }`
 * - under 1 hour → `{ mode: 'clock', duration: 'M:SS' }`
 * - otherwise → `{ mode: 'clock', duration: 'H:MM:SS' }`
 *
 * @param {number} totalSeconds
 * @returns {{ mode: 'seconds', count: number } | { mode: 'clock', duration: string }}
 */
export function formatViewDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad2 = (n) => String(n).padStart(2, '0');
  if (h > 0) {
    return { mode: 'clock', duration: `${h}:${pad2(m)}:${pad2(s)}` };
  }
  if (m > 0) {
    return { mode: 'clock', duration: `${m}:${pad2(s)}` };
  }
  return { mode: 'seconds', count: sec };
}

/**
 * Imperative accumulator for one continuous viewing lifecycle.
 * Pauses while the document is hidden.
 * @param {number} [initialSeconds=0]
 */
export function createViewDurationTracker(initialSeconds = 0) {
  let accumulatedMs = Math.max(0, Math.floor(Number(initialSeconds) || 0)) * 1000;
  let segmentStartedAt = null;
  let running = false;

  function isVisible() {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
  }

  function flushSegment() {
    if (segmentStartedAt == null) return;
    accumulatedMs += Math.max(0, performance.now() - segmentStartedAt);
    segmentStartedAt = null;
  }

  function startSegmentIfNeeded() {
    if (!running || !isVisible() || segmentStartedAt != null) return;
    segmentStartedAt = performance.now();
  }

  function onVisibilityChange() {
    if (!running) return;
    if (isVisible()) {
      startSegmentIfNeeded();
    } else {
      flushSegment();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  return {
    /** Begin or resume tracking. */
    start() {
      running = true;
      startSegmentIfNeeded();
    },
    /** Pause without resetting accumulated time. */
    pause() {
      flushSegment();
      running = false;
    },
    /** Total seconds accumulated so far (does not reset). */
    peekSeconds() {
      let total = accumulatedMs;
      if (segmentStartedAt != null) {
        total += Math.max(0, performance.now() - segmentStartedAt);
      }
      return Math.floor(total / 1000);
    },
    /** Return total seconds and keep tracking from a fresh segment. */
    snapshotSeconds() {
      flushSegment();
      const seconds = Math.floor(accumulatedMs / 1000);
      startSegmentIfNeeded();
      return seconds;
    },
    /** Reset accumulator; keep running state. */
    reset() {
      accumulatedMs = 0;
      segmentStartedAt = null;
      if (running) startSegmentIfNeeded();
    },
    dispose() {
      flushSegment();
      running = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    },
  };
}

/**
 * React hook: tracks view duration for the active `key` (e.g. rating id).
 * Restarts when `key` changes. Disabled when `key` is null/undefined/false.
 */
export function useViewDurationTracker(key) {
  const trackerRef = useRef(null);

  useEffect(() => {
    if (key == null || key === false) {
      trackerRef.current?.dispose();
      trackerRef.current = null;
      return undefined;
    }
    const tracker = createViewDurationTracker();
    tracker.start();
    trackerRef.current = tracker;
    return () => {
      tracker.dispose();
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, [key]);

  const peekSeconds = useCallback(() => trackerRef.current?.peekSeconds() ?? 0, []);
  const snapshotSeconds = useCallback(() => trackerRef.current?.snapshotSeconds() ?? 0, []);

  return { peekSeconds, snapshotSeconds };
}
