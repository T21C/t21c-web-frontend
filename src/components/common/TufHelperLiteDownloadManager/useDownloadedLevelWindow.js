import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getTufHelperLiteDownloadedLevelPage,
  getTufHelperLiteDownloadedLevelSummary,
  useTufHelperLiteSummary,
} from '@/hooks/useTufHelperLiteIpc';
import {
  mergeDownloadedLevelPage,
  mergePositionedDownloadedLevelPage,
  removeDownloadedLevel,
} from './downloadLevelWindowState';

const PAGE_SIZE = 20;
const INITIAL_ITEM_INDEX = 1_000_000;
const field = (value, name) => value?.[name] ?? value?.[name.charAt(0).toLowerCase() + name.slice(1)];

const normalizeItem = (item) => ({
  id: Number(field(item, 'Id')),
  diffId: Number(field(item, 'DiffId')) || 0,
  artist: field(item, 'Artist') || '—',
  levelName: field(item, 'LevelName') || `#${field(item, 'Id')}`,
  creator: field(item, 'Creator') || '—',
  sizeBytes: Number(field(item, 'SizeBytes')) || 0,
  downloadedAtUtc: field(item, 'DownloadedAtUtc') || null,
  metadataState: String(field(item, 'MetadataState') || 'partial').toLowerCase(),
  updateState: String(field(item, 'UpdateState') || 'idle').toLowerCase(),
  updateStateExpiresAtUtc: field(item, 'UpdateStateExpiresAtUtc') || null,
});

const normalizePage = (value, request = { cursor: null, direction: 'next' }) => {
  const items = (field(value, 'Items') || []).map(normalizeItem).filter((item) => item.id > 0);
  if (items.some((item) => item.metadataState !== 'ready' || item.diffId <= 0)) {
    const error = new Error('Downloaded level metadata is not ready.');
    error.code = 'downloaded_level_metadata_incomplete';
    throw error;
  }

  const rawStartIndex = field(value, 'StartIndex');
  const rawTotalCount = field(value, 'TotalCount');
  return {
    revision: Number(field(value, 'Revision')) || 0,
    startIndex: rawStartIndex == null ? null : Math.max(0, Number(rawStartIndex) || 0),
    totalCount: rawTotalCount == null ? null : Math.max(0, Number(rawTotalCount) || 0),
    items,
    nextCursor: field(value, 'NextCursor') || null,
    previousCursor: field(value, 'PreviousCursor') || null,
    hasNext: Boolean(field(value, 'HasNext')),
    hasPrevious: Boolean(field(value, 'HasPrevious')),
    requestCursor: request.cursor || null,
    requestDirection: request.direction || 'next',
  };
};

const normalizeSummary = (value) => ({
  state: String(field(value, 'State') || 'calculating').toLowerCase(),
  revision: Number(field(value, 'Revision')) || 0,
  levelCount: Number(field(value, 'LevelCount')) || 0,
  totalSizeBytes: Number(field(value, 'TotalSizeBytes')) || 0,
  errorCode: field(value, 'ErrorCode') || null,
  message: field(value, 'Message') || null,
});

const errorCode = (error) => error?.code || error?.error?.code || null;
const isStaleCursor = (error) => (
  errorCode(error) === 'download_library_cursor_stale' ||
  String(error?.message || '').includes('download_library_cursor_stale')
);

export const useDownloadedLevelWindow = (enabled, positionedPagesEnabled = false) => {
  const generationRef = useRef(0);
  const requestRef = useRef({ next: false, previous: false });
  const deletionRef = useRef({ pending: false, revision: 0 });
  const cursorsDirtyRef = useRef(false);
  const [deletionVersion, setDeletionVersion] = useState(0);
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });
  const [windowState, setWindowState] = useState({
    pages: [],
    revision: 0,
    firstItemIndex: INITIAL_ITEM_INDEX,
    totalCount: 0,
    positioned: false,
  });
  const [retainedWindow, setRetainedWindow] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reportedSummary, setReportedSummary] = useState(null);
  const observedSummary = useTufHelperLiteSummary();
  const [loading, setLoading] = useState({ initial: false, next: false, previous: false });
  const [errors, setErrors] = useState({ initial: null, next: null, previous: null });

  const loadSummary = useCallback(async (generation) => {
    try {
      const next = normalizeSummary(await getTufHelperLiteDownloadedLevelSummary());
      if (generationRef.current === generation) setReportedSummary(next);
    } catch (error) {
      if (generationRef.current === generation) {
        setSummary({ state: 'failed', errorCode: errorCode(error), message: error?.message });
      }
    }
  }, []);

  const loadInitial = useCallback(async () => {
    const generation = generationRef.current;
    if (!enabled || requestRef.current.next) return;
    requestRef.current.next = true;
    setLoading((current) => ({ ...current, initial: true }));
    setErrors({ initial: null, next: null, previous: null });
    try {
      const request = { cursor: null, direction: 'next' };
      const page = normalizePage(await getTufHelperLiteDownloadedLevelPage({ limit: PAGE_SIZE }), request);
      if (generationRef.current !== generation) return;
      const positioned = positionedPagesEnabled && page.startIndex != null && page.totalCount != null;
      cursorsDirtyRef.current = false;
      setSummary((current) => current && current.revision !== page.revision
        ? { ...current, revision: page.revision } : current);
      setWindowState({
        pages: [page],
        revision: page.revision,
        firstItemIndex: INITIAL_ITEM_INDEX,
        totalCount: positioned ? page.totalCount : page.items.length,
        positioned,
      });
    } catch (error) {
      if (generationRef.current === generation) {
        setErrors((current) => ({ ...current, initial: error }));
      }
    } finally {
      if (generationRef.current === generation) {
        requestRef.current.next = false;
        requestRef.current.refresh = false;
        setLoading((current) => ({ ...current, initial: false }));
      }
    }
  }, [enabled, positionedPagesEnabled]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    requestRef.current = { next: false, previous: false };
    deletionRef.current = { pending: false, revision: 0 };
    cursorsDirtyRef.current = false;
    setWindowState({
      pages: [], revision: 0, firstItemIndex: INITIAL_ITEM_INDEX, totalCount: 0, positioned: false,
    });
    setRetainedWindow(null);
    visibleRangeRef.current = { startIndex: 0, endIndex: 0 };
    setSummary(null);
    setReportedSummary(null);
    setErrors({ initial: null, next: null, previous: null });
    if (enabled) {
      void loadInitial();
      void loadSummary(generation);
    }
    return () => { generationRef.current += 1; };
  }, [enabled, loadInitial, loadSummary]);

  useEffect(() => {
    if (enabled && observedSummary) setReportedSummary(normalizeSummary(observedSummary));
  }, [enabled, observedSummary]);

  useEffect(() => {
    if (!enabled || !reportedSummary || deletionRef.current.pending) return;
    const localRevision = deletionRef.current.revision;
    // Deletion notifications can precede the RPC response. A calculating
    // snapshot still contains the old totals; retain our confirmed local edit
    // until its ready snapshot arrives, without reloading any loaded pages.
    if (localRevision && reportedSummary.revision < localRevision) return;
    if (localRevision === reportedSummary.revision && reportedSummary.state === 'calculating') return;
    setSummary(reportedSummary);
  }, [deletionVersion, enabled, reportedSummary]);

  const resetForStaleCursor = useCallback(() => {
    if (windowState.positioned) setRetainedWindow((current) => current || windowState);
    generationRef.current += 1;
    // Retain the current rows while renewing invalid cursors. Clearing them here
    // unmounts Virtuoso and flashes an empty/loading view after every deletion.
    requestRef.current = { next: false, previous: false, refresh: true };
    setLoading({ initial: true, next: false, previous: false });
    setErrors({ initial: null, next: null, previous: null });
    void loadInitial();
    void loadSummary(generationRef.current);
  }, [loadInitial, loadSummary, windowState]);

  const loadDirection = useCallback(async (direction) => {
    const pages = windowState.pages;
    const boundaryPage = direction === 'previous' ? pages[0] : pages[pages.length - 1];
    const hasMore = direction === 'previous' ? boundaryPage?.hasPrevious : boundaryPage?.hasNext;
    const cursor = direction === 'previous' ? boundaryPage?.previousCursor : boundaryPage?.nextCursor;
    if (!enabled || deletionRef.current.pending || !boundaryPage || !hasMore || !cursor || requestRef.current[direction] || requestRef.current.refresh) return;
    if (cursorsDirtyRef.current) {
      resetForStaleCursor();
      return;
    }

    const generation = generationRef.current;
    requestRef.current[direction] = true;
    setLoading((current) => ({ ...current, [direction]: true }));
    setErrors((current) => ({ ...current, [direction]: null }));
    try {
      const request = {
        cursor,
        direction,
        limit: PAGE_SIZE,
      };
      const page = normalizePage(await getTufHelperLiteDownloadedLevelPage(request), request);
      if (generationRef.current !== generation) return;
      if (page.revision !== windowState.revision) {
        resetForStaleCursor();
        return;
      }
      if (windowState.positioned && page.totalCount !== windowState.totalCount) {
        resetForStaleCursor();
        return;
      }

      setWindowState((current) => {
        return current.positioned
          ? mergePositionedDownloadedLevelPage(current, page, direction)
          : mergeDownloadedLevelPage(current, page, direction);
      });
    } catch (error) {
      if (generationRef.current !== generation) return;
      if (isStaleCursor(error)) resetForStaleCursor();
      else setErrors((current) => ({ ...current, [direction]: error }));
    } finally {
      if (generationRef.current === generation) {
        requestRef.current[direction] = false;
        setLoading((current) => ({ ...current, [direction]: false }));
      }
    }
  }, [
    enabled,
    resetForStaleCursor,
    windowState.pages,
    windowState.positioned,
    windowState.revision,
    windowState.totalCount,
  ]);

  const levels = useMemo(() => windowState.pages.flatMap((page) => page.items), [windowState.pages]);
  const itemsByIndex = useMemo(() => {
    const items = new Map();
    if (!windowState.positioned) return items;
    const freshIds = new Set(windowState.pages.flatMap((page) => page.items.map((item) => item.id)));
    // Keep only the previous bounded window while fresh cursors walk back to
    // the visible range; rows do not turn into skeletons during that renewal.
    retainedWindow?.pages.forEach((page) => {
      page.items.forEach((item, offset) => {
        const index = page.startIndex + offset;
        if (index < windowState.totalCount && !freshIds.has(item.id)) items.set(index, item);
      });
    });
    windowState.pages.forEach((page) => {
      page.items.forEach((item, offset) => items.set(page.startIndex + offset, item));
    });
    return items;
  }, [retainedWindow, windowState.pages, windowState.positioned, windowState.totalCount]);
  useEffect(() => {
    if (!retainedWindow || requestRef.current.refresh) return;
    const fresh = new Set(windowState.pages.flatMap((page) => page.items.map((_, offset) => page.startIndex + offset)));
    const range = visibleRangeRef.current;
    const end = Math.min(range.endIndex, windowState.totalCount - 1);
    for (let index = range.startIndex; index <= end; index++) if (!fresh.has(index)) return;
    setRetainedWindow(null);
  }, [retainedWindow, windowState.pages, windowState.revision, windowState.totalCount]);
  useEffect(() => {
    if (enabled && !deletionRef.current.pending && summary?.revision > windowState.revision && windowState.revision) resetForStaleCursor();
  }, [enabled, resetForStaleCursor, summary?.revision, windowState.revision]);

  const loadNext = useCallback(() => loadDirection('next'), [loadDirection]);
  const loadPrevious = useCallback(() => loadDirection('previous'), [loadDirection]);
  const hasNext = Boolean(windowState.pages[windowState.pages.length - 1]?.hasNext);
  const hasPrevious = Boolean(windowState.pages[0]?.hasPrevious);
  const loadForVisibleRange = useCallback((range) => {
    if (!windowState.positioned || windowState.pages.length === 0) return;
    const firstPage = windowState.pages[0];
    const lastPage = windowState.pages[windowState.pages.length - 1];
    const loadedStartIndex = firstPage.startIndex;
    const loadedEndIndex = lastPage.startIndex + lastPage.items.length - 1;

    // After a local deletion the cached rows remain valid, but their opaque
    // cursors do not. Renew them only when the viewport needs an uncached row.
    const margin = cursorsDirtyRef.current ? -1 : 5;
    if (hasPrevious && !errors.previous && range.startIndex <= loadedStartIndex + margin) {
      void loadPrevious();
    } else if (hasNext && !errors.next && range.endIndex >= loadedEndIndex - margin) {
      void loadNext();
    }
  }, [
    deletionVersion,
    errors.next,
    errors.previous,
    hasNext,
    hasPrevious,
    loadNext,
    loadPrevious,
    windowState.pages,
    windowState.positioned,
  ]);
  const updateVisibleRange = useCallback((range) => {
    visibleRangeRef.current = range;
    loadForVisibleRange(range);
  }, [loadForVisibleRange]);

  useEffect(() => {
    loadForVisibleRange(visibleRangeRef.current);
  }, [loadForVisibleRange]);
  const refreshSummary = useCallback(
    () => loadSummary(generationRef.current),
    [loadSummary],
  );
  const refreshLoadedPages = useCallback(async () => {
    if (!enabled || requestRef.current.refresh) return;
    const pages = windowState.pages;
    if (pages.length === 0) {
      void loadInitial();
      return;
    }

    generationRef.current += 1;
    const generation = generationRef.current;
    requestRef.current = { next: false, previous: false, refresh: true };
    setLoading({ initial: false, next: false, previous: false });
    try {
      const refreshed = await Promise.all(pages.map(async (page) => {
        const request = {
          cursor: page.requestCursor,
          direction: page.requestDirection,
          limit: PAGE_SIZE,
        };
        return normalizePage(await getTufHelperLiteDownloadedLevelPage(request), request);
      }));
      if (generationRef.current !== generation) return;
      if (refreshed.some((page) => page.revision !== refreshed[0].revision)) {
        resetForStaleCursor();
        return;
      }
      // An initial page can be replaced directly across revisions; subsequent
      // pages with stale opaque cursors fall back to the non-clearing refresh.
      if (refreshed[0].revision !== windowState.revision && pages.some((page) => page.requestCursor)) {
        resetForStaleCursor();
        return;
      }
      requestRef.current.refresh = false;
      setSummary((current) => current && current.revision !== refreshed[0].revision
        ? { ...current, revision: refreshed[0].revision } : current);
      setWindowState((current) => ({
        ...current,
        revision: refreshed[0].revision,
        totalCount: current.positioned ? refreshed[0].totalCount : current.totalCount,
        pages: current.positioned
          ? [...refreshed].sort((left, right) => left.startIndex - right.startIndex)
          : refreshed,
      }));
    } catch (error) {
      if (generationRef.current !== generation) return;
      if (isStaleCursor(error)) resetForStaleCursor();
      else setErrors((current) => ({ ...current, initial: error }));
    } finally {
      if (generationRef.current === generation) requestRef.current.refresh = false;
    }
  }, [enabled, loadInitial, resetForStaleCursor, windowState.pages, windowState.revision]);
  const patchLevel = useCallback((id, patch) => {
    setWindowState((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => item.id === Number(id) ? { ...item, ...patch } : item),
      })),
    }));
  }, []);
  const beginDeletion = useCallback(() => {
    deletionRef.current.pending = true;
    // Ignore page responses started before the deletion, which could otherwise
    // restore the deleted row or renew stale cursors as the RPC completes.
    generationRef.current += 1;
    requestRef.current = { next: false, previous: false };
    setLoading({ initial: false, next: false, previous: false });
  }, []);
  const finishDeletion = useCallback((level) => {
    deletionRef.current.pending = false;
    if (level) {
      const revision = Math.max(windowState.revision, deletionRef.current.revision) + 1;
      deletionRef.current.revision = revision;
      cursorsDirtyRef.current = true;
      setWindowState((current) => ({ ...removeDownloadedLevel(current, level.id), revision }));
      setRetainedWindow((current) => current && removeDownloadedLevel(current, level.id));
      setSummary((current) => current && ({
        ...current,
        revision,
        levelCount: Math.max(0, (windowState.positioned ? windowState.totalCount : current.levelCount) - 1),
        totalSizeBytes: Math.max(0, current.totalSizeBytes - level.sizeBytes),
      }));
    }
    setDeletionVersion((current) => current + 1);
  }, [windowState.positioned, windowState.revision, windowState.totalCount]);

  return {
    levels,
    itemsByIndex,
    summary,
    firstItemIndex: windowState.firstItemIndex,
    totalCount: windowState.positioned ? windowState.totalCount : levels.length,
    positioned: windowState.positioned,
    hasNext,
    hasPrevious,
    loading,
    errors,
    loadNext,
    loadPrevious,
    onVisibleRangeChange: updateVisibleRange,
    retryInitial: loadInitial,
    reload: refreshLoadedPages,
    patchLevel,
    beginDeletion,
    finishDeletion,
    refreshSummary,
  };
};

export default useDownloadedLevelWindow;
