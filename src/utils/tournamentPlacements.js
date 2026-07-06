// tuf-search: #tournamentPlacements
/**
 * Client helpers for consuming tournament placement data and cosmetics
 * from profile payloads or dedicated endpoints.
 */

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
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listPublicPlacements(placements) {
  if (!Array.isArray(placements)) return [];
  return placements.filter((p) => p && !p.isPending);
}

/**
 * All non-pending placements for editor management (includes profile-hidden).
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listEditablePlacements(placements) {
  return listPublicPlacements(placements);
}

/**
 * Placements shown on public profile (excludes user-hidden).
 * @param {Array<any> | null | undefined} placements
 * @returns {Array<any>}
 */
export function listVisiblePlacements(placements) {
  return listPublicPlacements(placements).filter((p) => !p.isProfileHidden);
}

/**
 * @param {any} placement
 * @returns {string}
 */
export function resolvePlacementListLabel(placement) {
  const tier = placement?.tier?.label || placement?.tier?.code || "";
  const event =
    placement?.tournament?.shortName || placement?.tournament?.fullName || "";
  if (tier && event) return `${tier} — ${event}`;
  return tier || event || "";
}

function sortPlacementsDefault(a, b) {
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
  if ((a.tier?.rankWeight ?? 0) !== (b.tier?.rankWeight ?? 0)) {
    return (a.tier?.rankWeight ?? 0) - (b.tier?.rankWeight ?? 0);
  }
  const yearA = a.tournament?.sortYear ?? 0;
  const yearB = b.tournament?.sortYear ?? 0;
  if (yearA !== yearB) return yearB - yearA;
  return (b.id ?? 0) - (a.id ?? 0);
}

/**
 * @param {Array<any>} placements
 * @param {number[]} orderIds
 * @returns {Array<any>}
 */
export function sortPlacementsByOrder(placements, orderIds = []) {
  const list = [...placements];
  if (!orderIds.length) {
    list.sort(sortPlacementsDefault);
    return list;
  }
  const orderMap = new Map(orderIds.map((id, index) => [id, index]));
  list.sort((a, b) => {
    const aOrder = orderMap.get(a.id);
    const bOrder = orderMap.get(b.id);
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    return sortPlacementsDefault(a, b);
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
 * @param {any} placement
 * @returns {string | null}
 */
export function resolvePlacementCardBackground(placement) {
  if (!placement) return null;
  if (placement.resolvedCardBackgroundUrl) return placement.resolvedCardBackgroundUrl;
  return (
    placement.tier?.cardBackgroundUrl ??
    placement.tournament?.cardBackgroundUrl ??
    null
  );
}

/**
 * @param {any} placement
 * @returns {string | null}
 */
export function resolveTierIcon(placement) {
  return placement?.tier?.iconUrl ?? null;
}

/**
 * Tournament branding icon with series logo fallback.
 * @param {any} placement
 * @returns {string | null}
 */
export function resolveTournamentIcon(placement) {
  if (!placement) return null;
  if (placement.resolvedTournamentIconUrl) return placement.resolvedTournamentIconUrl;
  return (
    placement.tournament?.iconUrl ??
    placement.tournament?.series?.logoUrl ??
    null
  );
}

/** @param {unknown} value @returns {'default' | 'iconRail'} */
export function normalizePlacementCardLayout(value) {
  return value === "iconRail" ? "iconRail" : "default";
}

/** Primary visual for icon-rail layout: tier icon, then tournament icon. */
export function resolvePlacementRailIcon(placement) {
  return resolveTierIcon(placement) ?? resolveTournamentIcon(placement);
}
