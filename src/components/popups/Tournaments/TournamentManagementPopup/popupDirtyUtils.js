/** @param {Record<string, unknown>} form */
export function serializeForm(form) {
  return JSON.stringify(form);
}

/**
 * @param {any} placement
 * @param {'player' | 'creator'} track
 */
export function resolvePlacementLinkedProfile(placement, track) {
  if (track === "player" && placement?.playerId != null) {
    return {
      id: placement.playerId,
      name: placement.player?.name || placement.displayName || "",
      type: "player",
      isNewRequest: false,
    };
  }
  if (track === "creator" && placement?.creatorId != null) {
    return {
      id: placement.creatorId,
      name: placement.creator?.name || placement.displayName || "",
      type: "charter",
      isNewRequest: false,
    };
  }
  return null;
}

/** @param {any} placement @param {'player' | 'creator'} track */
export function mapPlacementToRow(placement, track) {
  return {
    key: `p-${placement.id}`,
    tierCode: placement.tier?.code || "",
    displayName: placement.displayName || "",
    withdrew: Boolean(placement.withdrew),
    isPending: Boolean(placement.isPending),
    teamName: placement.teamName || "",
    playerId: placement.playerId,
    creatorId: placement.creatorId,
    linkedProfile: resolvePlacementLinkedProfile(placement, track),
  };
}

/** @param {Array<any>} rows @param {string} track */
export function serializePlacements(rows, track) {
  const normalized = rows
    .filter((r) => r.displayName?.trim())
    .map((r) => ({
      tierCode: r.tierCode,
      displayName: r.displayName.trim(),
      withdrew: Boolean(r.withdrew),
      teamName: r.teamName || null,
      playerId:
        track === "player" ? r.linkedProfile?.id ?? r.playerId ?? null : null,
      creatorId:
        track === "creator" ? r.linkedProfile?.id ?? r.creatorId ?? null : null,
    }));
  return JSON.stringify(normalized);
}

/** Tier rows for PUT payload comparison (asset URLs excluded — uploads are immediate). */
export function serializeTierRows(rows) {
  const tiers = rows
    .filter((r) => r.code?.trim())
    .map((r, index) => ({
      id: r.id ?? null,
      code: r.code.trim().toUpperCase(),
      label: r.label.trim() || r.code.trim().toUpperCase(),
      kind: r.kind,
      rankWeight: Number(r.rankWeight) || 100,
      isPodium: Boolean(r.isPodium),
      isShowcaseEligible: r.isShowcaseEligible !== false,
      color: r.color?.trim() || null,
      sortOrder: Number(r.sortOrder) || index,
    }));
  return JSON.stringify(tiers);
}

/** @param {{ label: string, tierId: string, maxRankWeight: string, priority: string }} form */
export function isRewardFormDirty(form) {
  return (
    Boolean(form.label.trim()) ||
    Boolean(form.tierId) ||
    Boolean(form.maxRankWeight.trim()) ||
    form.priority !== "0"
  );
}

export const EMPTY_REWARD_FORM = {
  label: "",
  tierId: "",
  maxRankWeight: "",
  priority: "0",
};
