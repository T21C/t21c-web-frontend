// tuf-search: #usePackSearch
import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import {
  normalizePackSearchQuery,
  parseHashtagPackQuery,
} from '@/utils/normalizeEntitySearchQuery';

/**
 * Debounced pack search using the same list endpoint as the Pack page.
 *
 * @param {string} searchQuery Raw search input (normalized internally).
 */
export function usePackSearch(searchQuery) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const runRequest = useDebouncedRequest(500);

  useEffect(() => {
    const trimmed = normalizePackSearchQuery(searchQuery).trim();

    if (!trimmed) {
      setPacks([]);
      setLoading(false);
      setError(false);
      return undefined;
    }

    setLoading(true);
    setError(false);

    const packLookupId = parseHashtagPackQuery(trimmed);

    runRequest(async ({ signal }) => {
      if (packLookupId) {
        try {
          const response = await api.get(routes.database.levels.packs.byId(packLookupId), {
            signal,
          });
          return response.data ? [response.data] : [];
        } catch (err) {
          if (axios.isCancel(err)) throw err;
          if (err.response?.status === 404) return [];
          throw err;
        }
      }

      const params = {
        offset: 0,
        limit: 30,
        sort: 'RECENT',
        order: 'DESC',
        query: trimmed,
      };
      const response = await api.get(routes.database.levels.packs.root(), { params, signal });
      return response.data?.packs || [];
    })
      .then((results) => {
        setPacks(results);
        setLoading(false);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        console.error('Pack search failed:', err);
        setError(true);
        setPacks([]);
        setLoading(false);
      });

    return () => {
      runRequest.cancel();
    };
  }, [searchQuery, runRequest]);

  return { packs, loading, error };
}

export default usePackSearch;
