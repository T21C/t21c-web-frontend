// tuf-search: #usePendingSubmissionPages #admin #submissionManagement
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { PENDING_SUBMISSION_PAGE_SIZE } from './pendingSubmissionCursor';
import { itemBelongsInLoadedWindow, sortPendingSubmissions } from './submissionLock';
import { passDifficultySubtype } from './passDifficultySubtype';
import { preserveSubmitterStats } from './SubmitterRecordBadge';

const SEARCH_DEBOUNCE_MS = 300;

export function usePendingSubmissionPages({
  url,
  kind,
  searchQuery = '',
  hide = [],
  sort = 'submitted',
  dir = 'desc',
}) {
  const { t } = useTranslation('common');
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(() => String(searchQuery ?? '').trim());

  const hasNextRef = useRef(false);
  const pagingRef = useRef(false);
  const reqRef = useRef(0);
  const nextCursorRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const localLocksRef = useRef(new Set());
  const queryRef = useRef(debouncedQuery);
  queryRef.current = debouncedQuery;
  const sortRef = useRef(sort);
  sortRef.current = sort;
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const hideRef = useRef(hide);
  hideRef.current = hide;
  const submissionsRef = useRef(submissions);
  submissionsRef.current = submissions;
  const hideKey = Array.isArray(hide) ? hide.join('|') : '';

  const finishLoading = useCallback((reqId, notify) => {
    if (reqId !== reqRef.current) return;
    pagingRef.current = false;
    setIsLoading(false);
    setIsPaging(false);
    if (notify) window.dispatchEvent(new Event('submissionsLoadingComplete'));
  }, []);

  const shouldShowItem = useCallback((item) => {
    if (kind !== 'pass') return true;
    const hidden = hideRef.current;
    if (!hidden?.length) return true;
    const name = item?.level?.difficulty?.name;
    return !hidden.includes(passDifficultySubtype(name));
  }, [kind]);

  const mergeFetchedItems = useCallback((items, { insert = false } = {}) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setSubmissions((prev) => {
      const incoming = new Map(items.map((item) => [item.id, item]));
      const submitterKey = kind === 'pass' ? 'passSubmitter' : 'levelSubmitter';
      let next = prev.map((row) => {
        const updated = incoming.get(row.id);
        return updated ? preserveSubmitterStats(row, updated, submitterKey) : row;
      });
      if (insert) {
        const existing = new Set(next.map((row) => row.id));
        for (const item of items) {
          if (existing.has(item.id)) continue;
          if (!shouldShowItem(item)) continue;
          if (!itemBelongsInLoadedWindow(item, next, hasNextRef.current, dirRef.current)) continue;
          next.push(item);
          seenIdsRef.current.add(item.id);
          existing.add(item.id);
        }
        next = sortPendingSubmissions(next, dirRef.current);
      }
      return next;
    });
  }, [kind, shouldShowItem]);

  const fetchByIds = useCallback(async (ids, { insert = false } = {}) => {
    const unique = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!unique.length) return;
    try {
      const response = await api.get(url, {
        params: {
          ids: unique.join(','),
          sort: sortRef.current,
          dir: dirRef.current,
        },
      });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      mergeFetchedItems(items, { insert });
    } catch (error) {
      console.error('Error reloading submissions:', error);
      toast.error(t('errors.generic'));
    }
  }, [mergeFetchedItems, t, url]);

  const fetchQueue = useCallback(async ({ replace = false } = {}) => {
    if (pagingRef.current && !replace) return;
    if (!replace && !hasNextRef.current) return;
    const reqId = ++reqRef.current;
    pagingRef.current = true;
    if (replace) {
      seenIdsRef.current = new Set();
      nextCursorRef.current = null;
      hasNextRef.current = false;
      setHasNext(false);
      setIsLoading(true);
      setSubmissions([]);
      setLoadEpoch((epoch) => epoch + 1);
    } else {
      setIsPaging(true);
    }

    const seen = new Set(seenIdsRef.current);
    const hideParam = hideRef.current.length ? hideRef.current.join(',') : undefined;

    try {
      const response = await api.get(url, {
        params: {
          limit: PENDING_SUBMISSION_PAGE_SIZE,
          cursor: replace ? undefined : (nextCursorRef.current || undefined),
          q: queryRef.current || undefined,
          sort: sortRef.current,
          dir: dirRef.current,
          hide: hideParam,
        },
      });
      if (reqId !== reqRef.current) return;

      const batch = Array.isArray(response.data?.items) ? response.data.items : [];
      const pageInfo = response.data?.page || {};
      const pageTotal = Number.isFinite(pageInfo.total) ? pageInfo.total : 0;
      const collected = [];
      for (const item of batch) {
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        collected.push(item);
      }

      const continuation = pageInfo.nextCursor || null;
      const hasMore = Boolean(pageInfo.hasMore && continuation);

      collected.forEach((item) => seenIdsRef.current.add(item.id));
      nextCursorRef.current = continuation;
      hasNextRef.current = hasMore;
      if (replace) {
        setSubmissions(collected);
      } else if (collected.length > 0) {
        setSubmissions((prev) => {
          const existing = new Set(prev.map((row) => row.id));
          const next = collected.filter((item) => !existing.has(item.id));
          return next.length > 0 ? [...prev, ...next] : prev;
        });
      }
      setHasNext(hasMore);
      setTotal(pageTotal);
    } catch (error) {
      if (reqId !== reqRef.current) return;
      console.error('Error fetching pending submissions:', error);
      toast.error(t('errors.generic'));
    } finally {
      finishLoading(reqId, replace);
    }
  }, [finishLoading, t, url]);

  const reload = useCallback(() => {
    fetchQueue({ replace: true });
  }, [fetchQueue]);

  const loadMore = useCallback(() => {
    if (!hasNextRef.current || pagingRef.current) return;
    fetchQueue();
  }, [fetchQueue]);

  const reloadByIds = useCallback(async (ids) => {
    await fetchByIds(ids, { insert: false });
  }, [fetchByIds]);

  const noteLocalLock = useCallback((id) => {
    localLocksRef.current.add(id);
    window.setTimeout(() => {
      localLocksRef.current.delete(id);
    }, 4000);
  }, []);

  const releaseSeenId = useCallback((id) => {
    seenIdsRef.current.delete(id);
  }, []);

  const applyRemoteLock = useCallback((id, isLocked) => {
    const exists = submissionsRef.current.some((row) => row.id === id);
    if (exists) {
      setSubmissions((prev) => {
        const updated = prev.map((row) => (
          row.id === id ? { ...row, isLocked: Boolean(isLocked) } : row
        ));
        if (isLocked && hasNextRef.current) {
          seenIdsRef.current.delete(id);
          return updated.filter((row) => row.id !== id);
        }
        return sortPendingSubmissions(updated, dirRef.current);
      });
      return;
    }
    if (!isLocked || !hasNextRef.current) {
      void fetchByIds([id], { insert: true });
    }
  }, [fetchByIds]);

  useEffect(() => {
    const next = String(searchQuery ?? '').trim();
    const handle = window.setTimeout(() => setDebouncedQuery(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    reload();
  }, [debouncedQuery, hideKey, sort, dir, reload]);

  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener('refreshSubmissions', onRefresh);
    return () => window.removeEventListener('refreshSubmissions', onRefresh);
  }, [reload]);

  useEffect(() => {
    const onQueue = (event) => {
      const { type, data } = event.detail || {};
      if (type !== 'submission.queue.changed') return;
      if (!data || data.kind !== kind) return;

      if (data.change === 'created') {
        setTotal((current) => current + 1);
        void fetchByIds([data.id], { insert: true });
        return;
      }

      if (data.change === 'removed') {
        setTotal((current) => Math.max(0, current - 1));
        window.dispatchEvent(new CustomEvent('submissionJobItem', {
          detail: {
            kind,
            itemId: data.id,
            status: 'completed',
            action: data.action === 'decline' ? 'decline' : 'approve',
          },
        }));
        return;
      }

      if (data.change === 'locked' || data.change === 'unlocked') {
        if (localLocksRef.current.has(data.id)) return;
        applyRemoteLock(data.id, Boolean(data.isLocked));
      }
    };
    window.addEventListener('submissionQueueEvent', onQueue);
    return () => window.removeEventListener('submissionQueueEvent', onQueue);
  }, [applyRemoteLock, fetchByIds, kind]);

  return {
    submissions,
    setSubmissions,
    isLoading,
    isPaging,
    total,
    hasNext,
    loadEpoch,
    loadMore,
    reload,
    reloadByIds,
    noteLocalLock,
    releaseSeenId,
  };
}
