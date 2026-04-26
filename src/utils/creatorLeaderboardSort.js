/**
 * Leaderboard `sortBy` values — must stay in sync with server `validCreatorSortOptions`.
 * First entry is the default when storage is missing or invalid.
 */
export const CREATOR_LEADERBOARD_DEFAULT_SORT_BY = 'chartsTotal';

export const CREATOR_LEADERBOARD_SORT_OPTIONS = [
  CREATOR_LEADERBOARD_DEFAULT_SORT_BY,
  'chartsCharted',
  'chartsVfxed',
  'chartsTeamed',
  'totalChartClears',
  'totalChartLikes',
  'name',
];

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeCreatorLeaderboardSortBy(raw) {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (v && CREATOR_LEADERBOARD_SORT_OPTIONS.includes(v)) return v;
  return CREATOR_LEADERBOARD_DEFAULT_SORT_BY;
}
