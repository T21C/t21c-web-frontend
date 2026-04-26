/**
 * Normalize creator leaderboard / ES `curationTypeCountPairs` into the
 * `Record<typeId string, count>` shape expected by {@link buildCreatorIconSlots}.
 *
 * @param {Record<string, unknown> | null | undefined} creator
 * @returns {Record<string, number>}
 */
export function curationCountsRecordFromLeaderboardHit(creator) {
  const pairs = creator?.curationTypeCountPairs;
  if (Array.isArray(pairs) && pairs.length > 0) {
    const out = {};
    for (const p of pairs) {
      if (p?.typeId == null) continue;
      out[String(p.typeId)] = Number(p.count) || 0;
    }
    return out;
  }
  const flat = creator?.curationTypeCounts;
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) {
    return { ...flat };
  }
  return {};
}

/**
 * @param {Record<string, unknown> | null | undefined} creator
 * @returns {number[]}
 */
export function displayCurationTypeIdsFromHit(creator) {
  const raw = creator?.displayCurationTypeIds;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 5);
}
