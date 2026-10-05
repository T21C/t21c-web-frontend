import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * Bidirectional window around the signed-in user.
 * `request({ direction, cursor, signal })` hits the around endpoint.
 * Initial loads debounce; paging up or down runs immediately.
 */
export function useLeaderboardLocate({ active, requestKey, request, debounceMs = 500 }) {
  const [status, setStatus] = useState('idle');
  const [windowState, setWindowState] = useState(null);
  const [loadingBefore, setLoadingBefore] = useState(false);
  const [loadingAfter, setLoadingAfter] = useState(false);
  const [trackedKey, setTrackedKey] = useState(requestKey);
  const [wasActive, setWasActive] = useState(active);
  const requestRef = useRef(request);
  const generation = useRef(0);
  const loadingBeforeRef = useRef(false);
  const loadingAfterRef = useRef(false);

  requestRef.current = request;

  useEffect(() => {
    return () => {
      generation.current += 1;
    };
  }, []);

  if (active && !wasActive) {
    setWasActive(true);
    setTrackedKey(requestKey);
    setStatus('loading');
    setWindowState(null);
    generation.current += 1;
  } else if (active && trackedKey !== requestKey) {
    setTrackedKey(requestKey);
    setStatus('loading');
    setWindowState(null);
    generation.current += 1;
  }

  if (!active && wasActive) {
    setWasActive(false);
    setStatus('idle');
    setWindowState(null);
    setLoadingBefore(false);
    setLoadingAfter(false);
    generation.current += 1;
  }

  useEffect(() => {
    if (!active) return undefined;

    const gen = generation.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requestRef.current({ signal: controller.signal })
        .then((data) => {
          if (gen !== generation.current) return;
          if (!data?.found) {
            setStatus('missing');
            setWindowState({ reason: data?.reason ?? 'filtered-out' });
            return;
          }
          setWindowState({
            items: Array.isArray(data.results) ? data.results : [],
            index: data.index,
            total: data.total,
            startIndex: data.startIndex ?? 0,
            hasBefore: Boolean(data.hasBefore),
            hasAfter: Boolean(data.hasAfter),
            beforeCursor: data.beforeCursor ?? null,
            afterCursor: data.afterCursor ?? null,
          });
          setStatus('ready');
        })
        .catch((error) => {
          if (axios.isCancel(error) || controller.signal.aborted) return;
          if (gen !== generation.current) return;
          console.error('Error locating leaderboard placement:', error);
          setStatus('missing');
          setWindowState({ reason: 'filtered-out' });
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, requestKey, debounceMs]);

  const loadBefore = useCallback(async () => {
    const current = windowState;
    if (!current?.hasBefore || !current.beforeCursor || loadingBeforeRef.current) return;
    const gen = generation.current;
    loadingBeforeRef.current = true;
    setLoadingBefore(true);
    try {
      const data = await requestRef.current({
        direction: 'before',
        cursor: current.beforeCursor,
      });
      if (gen !== generation.current) return;
      const results = Array.isArray(data?.results) ? data.results : [];
      setWindowState((prev) => {
        if (!prev || prev.beforeCursor !== current.beforeCursor) return prev;
        if (results.length === 0) return { ...prev, hasBefore: false };
        return {
          ...prev,
          items: [...results, ...prev.items],
          startIndex: prev.startIndex - results.length,
          hasBefore: Boolean(data.hasMore),
          beforeCursor: data.cursor ?? prev.beforeCursor,
        };
      });
    } catch (error) {
      if (!axios.isCancel(error)) console.error('Error loading leaderboard rows above:', error);
    } finally {
      loadingBeforeRef.current = false;
      setLoadingBefore(false);
    }
  }, [windowState]);

  const loadAfter = useCallback(async () => {
    const current = windowState;
    if (!current?.hasAfter || !current.afterCursor || loadingAfterRef.current) return;
    const gen = generation.current;
    loadingAfterRef.current = true;
    setLoadingAfter(true);
    try {
      const data = await requestRef.current({
        direction: 'after',
        cursor: current.afterCursor,
      });
      if (gen !== generation.current) return;
      const results = Array.isArray(data?.results) ? data.results : [];
      setWindowState((prev) => {
        if (!prev || prev.afterCursor !== current.afterCursor) return prev;
        if (results.length === 0) return { ...prev, hasAfter: false };
        return {
          ...prev,
          items: [...prev.items, ...results],
          hasAfter: Boolean(data.hasMore),
          afterCursor: data.cursor ?? prev.afterCursor,
        };
      });
    } catch (error) {
      if (!axios.isCancel(error)) console.error('Error loading leaderboard rows below:', error);
    } finally {
      loadingAfterRef.current = false;
      setLoadingAfter(false);
    }
  }, [windowState]);

  return {
    status,
    windowState,
    loadingBefore,
    loadingAfter,
    loadBefore,
    loadAfter,
  };
}
