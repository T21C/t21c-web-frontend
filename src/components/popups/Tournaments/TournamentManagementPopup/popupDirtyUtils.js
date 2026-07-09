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

/** @param {any} placement */
export function resolvePlacementLinkedLevel(placement) {
  if (!placement?.levelId) return null;
  const level = placement.level;
  return {
    id: placement.levelId,
    song: level?.song || placement.displayName || `Level #${placement.levelId}`,
    artist: level?.artist || "",
  };
}

/** @param {any} placement @param {'player' | 'creator'} track */
export function mapPlacementToRow(placement, track) {
  return {
    key: `p-${placement.id}`,
    id: placement.id,
    tierCode: placement.tier?.code || "",
    displayName: placement.displayName || "",
    withdrew: Boolean(placement.withdrew),
    isPending: Boolean(placement.isPending),
    teamName: placement.teamName || "",
    playerId: placement.playerId,
    creatorId: placement.creatorId,
    rowMode: placement.rowMode ?? null,
    levelId: placement.levelId ?? null,
    creditedCreatorIds: Array.isArray(placement.creditedCreatorIds)
      ? [...placement.creditedCreatorIds]
      : null,
    linkedProfile: resolvePlacementLinkedProfile(placement, track),
    linkedLevel: resolvePlacementLinkedLevel(placement),
  };
}

/** @param {any} row @param {string | null} tournamentPlacementMode */
export function resolveEffectiveRowMode(row, tournamentPlacementMode = "profile") {
  if (row.rowMode === "profile" || row.rowMode === "level") return row.rowMode;
  return tournamentPlacementMode === "level" ? "level" : "profile";
}

/** @param {Array<any>} rows @param {string} track @param {string} placementMode */
export function serializePlacements(rows, track, placementMode = "profile") {
  const normalized = rows
    .filter((r) => r.displayName?.trim() || resolveEffectiveRowMode(r, placementMode) === "level")
    .map((r) => {
      const effectiveMode = resolveEffectiveRowMode(r, placementMode);
      return {
        id: r.id ?? null,
        tierCode: r.tierCode,
        displayName: r.displayName.trim(),
        withdrew: Boolean(r.withdrew),
        teamName: r.teamName || null,
        rowMode: r.rowMode ?? null,
        levelId: r.levelId ?? null,
        creditedCreatorIds: Array.isArray(r.creditedCreatorIds)
          ? r.creditedCreatorIds
          : null,
        playerId:
          effectiveMode === "profile" && track === "player"
            ? r.linkedProfile?.id ?? r.playerId ?? null
            : null,
        creatorId:
          effectiveMode === "profile" && track === "creator"
            ? r.linkedProfile?.id ?? r.creatorId ?? null
            : null,
      };
    });
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

/** Sort placement rows by tier rank weight, then id. */
export function sortPlacementRowsByTier(rows, tierOptions) {
  const weightForCode = (code) => {
    const tier = tierOptions.find(
      (t) => t.code?.toUpperCase() === String(code || "").toUpperCase(),
    );
    return tier?.rankWeight ?? 9999;
  };

  return [...rows].sort((a, b) => {
    const weightDiff = weightForCode(a.tierCode) - weightForCode(b.tierCode);
    if (weightDiff !== 0) return weightDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}
