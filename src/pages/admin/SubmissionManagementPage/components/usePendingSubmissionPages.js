// tuf-search: #usePendingSubmissionPages #admin #submissionManagement
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import {
  PENDING_SUBMISSION_PAGE_SIZE,
  encodePendingSubmissionCursor,
} from './pendingSubmissionCursor';

const SEARCH_DEBOUNCE_MS = 300;
const FILL_GUARD = 8;

export function usePendingSubmissionPages({
  url,
  kind,
  searchQuery = '',
  filterKey = '',
  acceptItem,
}) {
  const { t } = useTranslation('common');
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [queueDrift, setQueueDrift] = useState(false);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState(() => String(searchQuery ?? '').trim());

  const acceptRef = useRef(acceptItem);
  acceptRef.current = acceptItem;
  const hasNextRef = useRef(false);
  const pagingRef = useRef(false);
  const reqRef = useRef(0);
  const nextCursorRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const baseRevisionRef = useRef(null);
  const localLocksRef = useRef(new Set());
  const queryRef = useRef(debouncedQuery);
  queryRef.current = debouncedQuery;

  const finishLoading = useCallback((reqId, notify) => {
    if (reqId !== reqRef.current) return;
    pagingRef.current = false;
    setIsLoading(false);
    setIsPaging(false);
    if (notify) window.dispatchEvent(new Event('submissionsLoadingComplete'));
  }, []);

  const fetchQueue = useCallback(async ({ replace = false, resetRevision = false } = {}) => {
    if (pagingRef.current && !replace) return;
    if (!replace && !hasNextRef.current) return;
    const reqId = ++reqRef.current;
    pagingRef.current = true;
    if (replace) {
      seenIdsRef.current = new Set();
      nextCursorRef.current = null;
      baseRevisionRef.current = null;
      hasNextRef.current = false;
      setQueueDrift(false);
      setHasNext(false);
      setIsLoading(true);
      setSubmissions([]);
      setLoadEpoch((epoch) => epoch + 1);
    } else {
      setIsPaging(true);
    }

    const seen = new Set(seenIdsRef.current);
    let cursor = replace ? null : nextCursorRef.current;
    const collected = [];
    let hasMore = false;
    let continuation = null;
    let revision = null;
    let pageTotal = 0;
    let guard = 0;

    try {
      while (collected.length < PENDING_SUBMISSION_PAGE_SIZE && guard < FILL_GUARD) {
        guard += 1;
        const response = await api.get(url, {
          params: {
            limit: PENDING_SUBMISSION_PAGE_SIZE,
            cursor: cursor || undefined,
            q: queryRef.current || undefined,
          },
        });
        if (reqId !== reqRef.current) return;

        const batch = Array.isArray(response.data?.items) ? response.data.items : [];
        const pageInfo = response.data?.page || {};
        revision = typeof pageInfo.revision === 'string' ? pageInfo.revision : revision;
        pageTotal = Number.isFinite(pageInfo.total) ? pageInfo.total : pageTotal;
        const accept = acceptRef.current;
        let leftAcceptedBehind = false;
        let lastTaken = null;

        for (const item of batch) {
          if (!item || seen.has(item.id)) continue;
          if (accept && !accept(item)) continue;
          seen.add(item.id);
          if (collected.length < PENDING_SUBMISSION_PAGE_SIZE) {
            collected.push(item);
            lastTaken = item;
          } else {
            leftAcceptedBehind = true;
          }
        }

        const serverHasMore = Boolean(pageInfo.hasMore && pageInfo.nextCursor);
        if (leftAcceptedBehind && lastTaken) {
          continuation = encodePendingSubmissionCursor(lastTaken);
          hasMore = true;
          break;
        }

        continuation = pageInfo.nextCursor || null;
        hasMore = serverHasMore;
        if (!hasMore || collected.length >= PENDING_SUBMISSION_PAGE_SIZE) break;
        cursor = continuation;
      }

      if (reqId !== reqRef.current) return;

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

      if (resetRevision || baseRevisionRef.current == null) {
        baseRevisionRef.current = revision;
      } else if (revision && revision !== baseRevisionRef.current) {
        setQueueDrift(true);
      }
    } catch (error) {
      if (reqId !== reqRef.current) return;
      console.error('Error fetching pending submissions:', error);
      toast.error(t('errors.generic'));
    } finally {
      finishLoading(reqId, replace);
    }
  }, [finishLoading, t, url]);

  const reload = useCallback(() => {
    fetchQueue({ replace: true, resetRevision: true });
  }, [fetchQueue]);

  const loadMore = useCallback(() => {
    if (!hasNextRef.current || pagingRef.current) return;
    fetchQueue();
  }, [fetchQueue]);

  const reloadByIds = useCallback(async (ids) => {
    const unique = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!unique.length) return;
    try {
      const response = await api.get(url, { params: { ids: unique.join(',') } });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      const byId = new Map(items.map((item) => [item.id, item]));
      setSubmissions((prev) => prev.map((row) => byId.get(row.id) ?? row));
    } catch (error) {
      console.error('Error reloading submissions:', error);
      toast.error(t('errors.generic'));
    }
  }, [t, url]);

  const noteLocalLock = useCallback((id) => {
    localLocksRef.current.add(id);
    window.setTimeout(() => {
      localLocksRef.current.delete(id);
    }, 4000);
  }, []);

  const releaseSeenId = useCallback((id) => {
    seenIdsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const next = String(searchQuery ?? '').trim();
    const handle = window.setTimeout(() => setDebouncedQuery(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    reload();
  }, [debouncedQuery, filterKey, reload]);

  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener('refreshSubmissions', onRefresh);
    return () => window.removeEventListener('refreshSubmissions', onRefresh);
  }, [reload]);

  useEffect(() => {
    const onQueue = (event) => {
      const { type, data } = event.detail || {};
      if (type === 'submission.queue.changed') {
        if (!data || data.kind !== kind) return;
        if (data.change === 'created') {
          setQueueDrift(true);
          return;
        }
        if (data.change === 'locked' || data.change === 'unlocked') {
          if (localLocksRef.current.has(data.id)) return;
          setQueueDrift(true);
          setSubmissions((prev) => prev.map((row) => (
            row.id === data.id ? { ...row, isLocked: Boolean(data.isLocked) } : row
          )));
        }
      }
    };
    window.addEventListener('submissionQueueEvent', onQueue);
    return () => window.removeEventListener('submissionQueueEvent', onQueue);
  }, [kind]);

  return {
    submissions,
    setSubmissions,
    isLoading,
    isPaging,
    total,
    hasNext,
    queueDrift,
    loadEpoch,
    loadMore,
    reload,
    reloadByIds,
    noteLocalLock,
    releaseSeenId,
    markQueueDrift: () => setQueueDrift(true),
  };
}
