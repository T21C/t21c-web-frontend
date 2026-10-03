// tuf-search: #usePendingSubmissionSearch #admin #submissionManagement
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';

const SEARCH_DEBOUNCE_MS = 300;

export function usePendingSubmissionSearch(searchQuery, searchUrl, reloadKey = 0) {
  const { t } = useTranslation('common');
  const [matchedIds, setMatchedIds] = useState(null);
  const runSearch = useDebouncedRequest(SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const q = String(searchQuery ?? '').trim();
    if (!q) {
      runSearch.cancel();
      setMatchedIds(null);
      return undefined;
    }

    runSearch(({ signal }) => api.get(searchUrl, { params: { q }, signal }))
      .then((response) => {
        setMatchedIds(Array.isArray(response.data?.ids) ? response.data.ids : []);
      })
      .catch((error) => {
        if (api.isCancel(error)) return;
        console.error('Error searching pending submissions:', error);
        toast.error(t('errors.generic'));
      });

    return () => runSearch.cancel();
  }, [searchQuery, searchUrl, reloadKey, runSearch, t]);

  return matchedIds;
}
