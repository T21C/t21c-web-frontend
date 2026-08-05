// tuf-search: #collectCreatorLevelExport #creatorProfile #export
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { buildFacetQueryParam } from '@/utils/facetQueryCodec';

/** Server ES level-search hard cap (see levelSearch.ts). */
export const LEVEL_EXPORT_PAGE_SIZE = 100;

/**
 * Build GET /v2/database/levels params from LevelContext-shaped state + extras.
 * Mirrors LevelPage search param assembly so export matches the visible query.
 */
export function buildCreatorLevelExportParams({
  query = '',
  sort = 'RECENT',
  order = 'DESC',
  deletedFilter = 'hide',
  clearedFilter = 'show',
  availableDlFilter = 'show',
  selectedLowFilterDiff = 'P1',
  selectedHighFilterDiff = 'U20',
  selectedSpecialDiffs = [],
  sliderQRange = [],
  qSliderVisible = false,
  levelFacetFilters = null,
  onlyMyLikes = false,
  user = null,
  hiddenFilters = null,
} = {}) {
  const allSpecialDiffs = [
    ...(qSliderVisible ? sliderQRange : []),
    ...(selectedSpecialDiffs || []),
  ].filter(Boolean);
  const uniqueSpecialDiffs = [...new Set(allSpecialDiffs)];
  const facetQuery = buildFacetQueryParam(levelFacetFilters);

  return {
    query: query || '',
    sort: `${sort}_${order}`,
    deletedFilter: deletedFilter || 'hide',
    clearedFilter: clearedFilter || 'show',
    pguRange: `${selectedLowFilterDiff},${selectedHighFilterDiff}`,
    specialDifficulties:
      uniqueSpecialDiffs.length > 0 ? uniqueSpecialDiffs.join(',') : undefined,
    onlyMyLikes: user && onlyMyLikes ? true : undefined,
    // Likes state is unused in spreadsheets; skip to keep payload lean.
    withLikeState: undefined,
    availableDlFilter: availableDlFilter || 'show',
    ...(facetQuery ? { facetQuery } : {}),
    ...(hiddenFilters || {}),
  };
}

/**
 * Headless paginated fetch of every level matching the provided query params.
 * Does not touch React or LevelPage — caller supplies a ready-made params object
 * (typically from buildCreatorLevelExportParams).
 *
 * @param {object} options
 * @param {object} options.params - Search params (without limit/offset; those are set here)
 * @param {AbortSignal} [options.signal]
 * @param {(progress: { fetched: number, total: number | null }) => void} [options.onProgress]
 * @returns {Promise<object[]>}
 */
export async function collectLevelsForExport({
  params = {},
  signal,
  onProgress,
} = {}) {
  const collected = [];
  const seen = new Set();
  let offset = 0;
  let total = null;
  let hasMore = true;

  while (hasMore) {
    if (signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    const response = await api.get(routes.database.levels.root(), {
      params: {
        ...params,
        limit: LEVEL_EXPORT_PAGE_SIZE,
        offset,
      },
      signal,
    });

    const page = Array.isArray(response.data?.results) ? response.data.results : [];
    if (typeof response.data?.total === 'number') {
      total = response.data.total;
    }

    for (const level of page) {
      const id = level?.id;
      if (id != null) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      collected.push(level);
    }

    onProgress?.({
      fetched: collected.length,
      total: total ?? collected.length,
    });

    hasMore = Boolean(response.data?.hasMore) && page.length > 0;
    if (!hasMore) break;

    offset += LEVEL_EXPORT_PAGE_SIZE;
  }

  return collected;
}
