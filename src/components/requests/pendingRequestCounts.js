import { useCallback, useEffect, useState } from 'react';
import { routes } from '@/api/routes';
import api from '@/utils/api';

export function usePendingRequestCounts(enabled = true) {
  const [counts, setCounts] = useState({});
  const refresh = useCallback(() => {
    if (!enabled) return;
    api.get(routes.database.levelRequests.openCounts())
      .then((response) => setCounts(response.data?.counts || {}))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, refresh };
}

export function pendingRequestTotal(counts, types) {
  return types.reduce((sum, type) => sum + (Number(counts?.[type]) || 0), 0);
}

export function formatRequestCount(count) {
  const value = Number(count) || 0;
  if (value <= 0) return '';
  return value > 99 ? '99+' : String(value);
}
