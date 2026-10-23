// tuf-search: #collectRequestExport #levelRequests #export
import api from '@/utils/api';
import { routes } from '@/api/routes';

/** List endpoint hard cap (see listLevelRequests). */
export const REQUEST_EXPORT_PAGE_SIZE = 50;

/**
 * Paginated fetch of every request matching the current list filters.
 * @param {object} options
 * @param {'admin' | 'mine'} options.mode
 * @param {string | null} [options.type]
 * @param {string} [options.searchQuery]
 * @param {string} [options.completedFilter]
 * @param {string} [options.status]
 * @param {string} [options.sort]
 * @param {AbortSignal} [options.signal]
 * @param {(progress: { fetched: number, total: number | null }) => void} [options.onProgress]
 */
export function applyAdminRequestListParams(params, { sort, status, completedFilter } = {}) {
  if (sort) params.sort = sort;
  if (status) params.status = status;
  else if (completedFilter && completedFilter !== 'hide') params.completed = completedFilter;
  return params;
}

export async function collectRequestsForExport({
  mode = 'mine',
  type = null,
  searchQuery = '',
  completedFilter = 'hide',
  status = '',
  sort,
  signal,
  onProgress,
} = {}) {
  const collected = [];
  let offset = 0;
  let total = null;

  while (true) {
    if (signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    const params = {
      limit: REQUEST_EXPORT_PAGE_SIZE,
      offset,
      includeCredits: 1,
    };
    if (mode === 'admin') params.type = type;
    if (searchQuery) params.q = searchQuery;
    if (mode === 'admin') {
      applyAdminRequestListParams(params, { sort, status, completedFilter });
    }

    const response = await api.get(
      mode === 'mine' ? routes.database.levelRequests.mine() : routes.database.levelRequests.root(),
      { params, signal },
    );

    const page = Array.isArray(response.data?.results) ? response.data.results : [];
    if (typeof response.data?.total === 'number') {
      total = response.data.total;
    }

    collected.push(...page);
    onProgress?.({
      fetched: collected.length,
      total: total ?? collected.length,
    });

    if (page.length === 0) break;
    if (total != null && collected.length >= total) break;
    offset += page.length;
    if (page.length < REQUEST_EXPORT_PAGE_SIZE) break;
  }

  return collected;
}
