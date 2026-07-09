// tuf-search: #tournamentPlacements
/**
 * Client helpers for consuming tournament placement credit DTOs
 * and profile display preferences.
 */
import { getSongDisplayName } from "@/utils/levelHelpers";

export const UNSERIESED_SORT_WEIGHT = 100;

/**
 * @param {any} credit
 * @returns {number | null}
 */
export function getCreditId(credit) {
  const id = credit?.creditId ?? credit?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

/**
 * @param {{ frame?: { url?: string | null, config?: Record<string, unknown> | null } | null } | null | undefined} equipped
 * @returns {{ url: string, config: Record<string, unknown> | null } | null}
 */
export function resolveAvatarFrame(equipped) {
  const frame = equipped?.frame;
  if (!frame?.url) return null;
  return {
    url: frame.url,
    config: frame.config && typeof frame.config === "object" ? frame.config : null,
  };
}

/**
 * @param {unknown} value
 * @returns {'classic' | 'evidence' | 'levelStyle'}
 */
export function normalizePlacementCardLayout(value) {
  if (value === "evidence" || value === "levelStyle") return value;
  if (value === "iconRail" || value === "default") return "classic";
  return "classic";
}

/**
 * @param {any} credit
 * @param {string} [fallback]
 * @returns {'classic' | 'evidence' | 'levelStyle'}
 */
export function resolveEffectiveCardLayout(credit, fallback = "classic") {
  return normalizePlacementCardLayout(credit?.cardLayout ?? fallback);
}

/**
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listPublicPlacements(placements) {
  if (!Array.isArray(placements)) return [];
  return placements.filter((p) => p && !p.isPending && !p.withdrew);
}

/**
 * All non-pending, non-withdrew credits for editor management (includes profile-hidden).
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listEditablePlacements(placements) {
  return listPublicPlacements(placements);
}

/**
 * Credits shown on public profile (excludes user-hidden).
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listVisiblePlacements(placements) {
  return listPublicPlacements(placements).filter((p) => !p.isProfileHidden);
}

/**
 * @param {any} credit
 * @returns {string}
 */
export function resolveLevelDisplayName(credit) {
  if (!credit?.level) return "";
  return getSongDisplayName(credit.level) || credit.level?.name || "";
}

/**
 * @param {any} credit
 * @returns {string}
 */
export function resolvePlacementListLabel(credit) {
  const layout = resolveEffectiveCardLayout(credit);
  if (layout === "levelStyle" || layout === "evidence") {
    const levelName = resolveLevelDisplayName(credit);
    if (levelName) return levelName;
  }
  const tier = credit?.tier?.label || credit?.tier?.code || "";
  const event = credit?.tournament?.shortName || credit?.tournament?.fullName || "";
  if (tier && event) return `${tier} — ${event}`;
  return tier || event || credit?.displayName || "";
}

function seriesSortWeight(credit) {
  return credit?.tournament?.series?.sortWeight ?? UNSERIESED_SORT_WEIGHT;
}

function tournamentSortWeight(credit) {
  return credit?.tournament?.sortWeight ?? 0;
}

function sortCreditsDefault(a, b) {
  const seriesA = seriesSortWeight(a);
  const seriesB = seriesSortWeight(b);
  if (seriesA !== seriesB) return seriesA - seriesB;

  const tournamentA = tournamentSortWeight(a);
  const tournamentB = tournamentSortWeight(b);
  if (tournamentA !== tournamentB) return tournamentA - tournamentB;

  if ((a.tier?.rankWeight ?? 0) !== (b.tier?.rankWeight ?? 0)) {
    return (a.tier?.rankWeight ?? 0) - (b.tier?.rankWeight ?? 0);
  }

  const yearA = a.tournament?.sortYear ?? 0;
  const yearB = b.tournament?.sortYear ?? 0;
  if (yearA !== yearB) return yearB - yearA;

  return (getCreditId(b) ?? 0) - (getCreditId(a) ?? 0);
}

/**
 * @param {Array<any>} placements
 * @param {number[]} orderIds credit ids
 * @returns {Array<any>}
 */
export function sortPlacementsByOrder(placements, orderIds = []) {
  const list = [...placements];
  if (!orderIds.length) {
    list.sort(sortCreditsDefault);
    return list;
  }
  const orderMap = new Map(orderIds.map((id, index) => [id, index]));
  list.sort((a, b) => {
    const aId = getCreditId(a);
    const bId = getCreditId(b);
    const aOrder = aId != null ? orderMap.get(aId) : undefined;
    const bOrder = bId != null ? orderMap.get(bId) : undefined;
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    return sortCreditsDefault(a, b);
  });
  return list;
}

/**
 * @param {Array<any> | null | undefined} placements
 * @returns {any | null}
 */
export function bestPlacement(placements) {
  const list = listPublicPlacements(placements);
  return list[0] ?? null;
}

/**
 * @param {Array<any> | null | undefined} placements
 * @param {{ tournamentId?: number, tierCodes?: string[], maxRankWeight?: number }} options
 */
export function hasPlacement(placements, options = {}) {
  return listPublicPlacements(placements).some((p) => {
    if (options.tournamentId != null && p.tournament?.id !== options.tournamentId) {
      return false;
    }
    if (options.tierCodes?.length && !options.tierCodes.includes(p.tier?.code)) {
      return false;
    }
    if (
      options.maxRankWeight != null &&
      (p.tier?.rankWeight ?? Infinity) > options.maxRankWeight
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Card background: tier override, then tournament default.
 * @param {any} credit
 * @returns {string | null}
 */
export function resolvePlacementCardBackground(credit) {
  if (!credit) return null;
  if (credit.resolvedCardBackgroundUrl) return credit.resolvedCardBackgroundUrl;
  return (
    credit.tier?.cardBackgroundUrl ??
    credit.tournament?.cardBackgroundUrl ??
    null
  );
}

/**
 * @param {any} credit
 * @returns {string | null}
 */
export function resolveTierIcon(credit) {
  return credit?.tier?.iconUrl ?? null;
}

/**
 * Tournament branding icon with series logo fallback.
 * @param {any} credit
 * @returns {string | null}
 */
export function resolveTournamentIcon(credit) {
  if (!credit) return null;
  if (credit.resolvedTournamentIconUrl) return credit.resolvedTournamentIconUrl;
  return (
    credit.tournament?.iconUrl ??
    credit.tournament?.series?.logoUrl ??
    null
  );
}

/** Primary visual for compact lists: tier icon, then tournament icon. */
export function resolvePlacementRailIcon(credit) {
  return resolveTierIcon(credit) ?? resolveTournamentIcon(credit);
}

/**
 * @param {string | null | undefined} packRef
 * @returns {string | null}
 */
export function resolvePackHref(packRef) {
  if (!packRef) return null;
  return `/packs/${encodeURIComponent(String(packRef))}`;
}

/**
 * @param {number | null | undefined} levelId
 * @returns {string | null}
 */
export function resolveLevelHref(levelId) {
  if (levelId == null || !Number.isFinite(Number(levelId))) return null;
  return `/levels/${levelId}`;
}

/**
 * @param {any} credit
 * @returns {string | null}
 */
export function resolveCreditPackRef(credit) {
  return credit?.packRef ?? credit?.tournament?.packRef ?? null;
}

/**
 * @param {any} credit
 * @returns {number}
 */
export function resolveCoCreditCount(credit) {
  const count = Number(credit?.coCreditCount ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * Group visible credits into series → tournament hierarchy.
 * @param {Array<any>} placements sorted credits
 * @returns {Array<{
 *   key: string,
 *   series: any | null,
 *   sortWeight: number,
 *   tournaments: Array<{ key: string, tournament: any, packRef: string | null, credits: any[] }>
 * }>}
 */
export function groupPlacementsByHierarchy(placements) {
  const seriesMap = new Map();

  for (const credit of placements) {
    const series = credit?.tournament?.series ?? null;
    const seriesKey = series?.id != null ? `series-${series.id}` : "unseriesed";
    const tournament = credit?.tournament;
    const tournamentKey =
      tournament?.id != null ? `tournament-${tournament.id}` : `tournament-unknown`;

    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, {
        key: seriesKey,
        series,
        sortWeight: series?.sortWeight ?? UNSERIESED_SORT_WEIGHT,
        tournaments: new Map(),
      });
    }

    const seriesGroup = seriesMap.get(seriesKey);
    if (!seriesGroup.tournaments.has(tournamentKey)) {
      seriesGroup.tournaments.set(tournamentKey, {
        key: tournamentKey,
        tournament,
        packRef: resolveCreditPackRef(credit),
        credits: [],
      });
    }

    seriesGroup.tournaments.get(tournamentKey).credits.push(credit);
  }

  return [...seriesMap.values()]
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((seriesGroup) => ({
      key: seriesGroup.key,
      series: seriesGroup.series,
      sortWeight: seriesGroup.sortWeight,
      tournaments: [...seriesGroup.tournaments.values()].sort(
        (a, b) => (a.tournament?.sortWeight ?? 0) - (b.tournament?.sortWeight ?? 0),
      ),
    }));
}

/**
 * @param {unknown} value
 * @returns {'defaultHierarchy' | 'customLayers'}
 */
export function normalizePlacementDisplayMode(value) {
  return value === "customLayers" ? "customLayers" : "defaultHierarchy";
}
