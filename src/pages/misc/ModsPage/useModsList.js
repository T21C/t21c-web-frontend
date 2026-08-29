import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { DEFAULT_MOD_SORT } from './modListSort';

export const MODS_PAGE_SIZE = 30;

function applyList(data) {
  return Array.isArray(data?.mods) ? data.mods : [];
}

export function useModsList({ path, enabled = true }) {
  const runSearch = useDebouncedRequest(300);
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(DEFAULT_MOD_SORT);

  const modsRef = useRef(mods);
  const queryRef = useRef(query);
  const sortRef = useRef(sort);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  modsRef.current = mods;
  queryRef.current = query;
  sortRef.current = sort;

  const fetchPage = useCallback(
    async ({ reset = false, immediate = false } = {}) => {
      if (!enabled) return;
      const q = queryRef.current.trim();
      if (reset) {
        setLoadError(false);
        setLoading(true);
        setHasMore(false);
        hasMoreRef.current = false;
      } else {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      const params = {
        offset: reset ? 0 : modsRef.current.length,
        limit: MODS_PAGE_SIZE,
        sort: sortRef.current,
      };
      if (q) params.q = q;
      const runner = reset && q && !immediate ? runSearch : runSearch.flush;

      try {
        const { data } = await runner(({ signal }) => api.get(path, { params, signal }));
        const page = applyList(data);
        const nextTotal = typeof data?.total === 'number' ? data.total : page.length;
        setTotal(nextTotal);
        if (reset) {
          setMods(page);
        } else {
          setMods((prev) => {
            const seen = new Set(prev.map((mod) => mod.id));
            return [...prev, ...page.filter((mod) => !seen.has(mod.id))];
          });
        }
        const nextHasMore = Boolean(data?.hasMore);
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
        setLoadError(false);
      } catch (error) {
        if (api.isCancel(error)) return;
        setLoadError(true);
        if (reset) {
          setMods([]);
          setTotal(0);
          hasMoreRef.current = false;
          setHasMore(false);
        }
      } finally {
        if (reset) setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [enabled, path, runSearch],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchPage({ reset: true });
  }, [enabled, query, sort, fetchPage]);

  const loadMore = useCallback(() => {
    void fetchPage({ reset: false, immediate: true });
  }, [fetchPage]);

  const reload = useCallback(() => fetchPage({ reset: true, immediate: true }), [fetchPage]);

  return {
    mods,
    setMods,
    loading,
    loadingMore,
    loadError,
    hasMore,
    total,
    query,
    setQuery,
    sort,
    setSort,
    loadMore,
    reload,
  };
}
