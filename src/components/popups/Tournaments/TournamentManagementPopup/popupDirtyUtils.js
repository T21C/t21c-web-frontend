/** @param {Record<string, unknown>} form */
export function serializeForm(form) {
  return JSON.stringify(form);
}

/** @param {any} placement */
export function resolvePlacementLinkedProfile(placement) {
  if (placement?.playerId != null) {
    return {
      id: placement.playerId,
      name: placement.player?.name || placement.displayName || "",
      type: "player",
      isNewRequest: false,
    };
  }
  if (placement?.creatorId != null) {
    return {
      id: placement.creatorId,
      name: placement.creator?.name || placement.displayName || "",
      type: "creator",
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
    diffId: level?.diffId ?? null,
    team: level?.team ?? null,
    levelCredits: level?.levelCredits ?? null,
  };
}

/** @param {any} placement */
export function mapPlacementToRow(placement) {
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
    positionInTier: placement.positionInTier ?? 0,
    creditedCreatorIds: Array.isArray(placement.creditedCreatorIds)
      ? [...placement.creditedCreatorIds]
      : null,
    linkedProfile: resolvePlacementLinkedProfile(placement),
    linkedLevel: resolvePlacementLinkedLevel(placement),
  };
}

/** @param {any} row @param {string | null} tournamentPlacementMode */
export function resolveEffectiveRowMode(row, tournamentPlacementMode = "profile") {
  if (row.rowMode === "profile" || row.rowMode === "level") return row.rowMode;
  return tournamentPlacementMode === "level" ? "level" : "profile";
}

/** @param {any} linkedProfile */
export function isCreatorLinkedProfile(linkedProfile) {
  const type = linkedProfile?.type;
  return type === "creator" || type === "charter" || type === "vfx";
}

/** @param {Array<any>} rows @param {string} placementMode */
export function serializePlacements(rows, placementMode = "profile") {
  const normalized = rows
    .filter((r) => r.displayName?.trim() || resolveEffectiveRowMode(r, placementMode) === "level")
    .map((r, index) => {
      const effectiveMode = resolveEffectiveRowMode(r, placementMode);
      const linked = r.linkedProfile;
      const linkedId = linked?.id ?? null;
      const linkAsCreator = isCreatorLinkedProfile(linked);
      return {
        id: r.id ?? null,
        tierCode: r.tierCode,
        displayName: r.displayName.trim(),
        withdrew: Boolean(r.withdrew),
        teamName: r.teamName || null,
        rowMode: r.rowMode ?? null,
        levelId: r.levelId ?? null,
        positionInTier: Number(r.positionInTier) || index + 1,
        creditedCreatorIds: Array.isArray(r.creditedCreatorIds)
          ? r.creditedCreatorIds
          : null,
        playerId:
          effectiveMode === "profile" && !linkAsCreator
            ? linkedId ?? r.playerId ?? null
            : null,
        creatorId:
          effectiveMode === "profile" && linkAsCreator
            ? linkedId ?? r.creatorId ?? null
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

/** Sort placement rows by tier rank weight, then position within tier, then id. */
export function sortPlacementRowsByTier(rows, tierOptions) {
  return [...rows].sort((a, b) => {
    const weightDiff =
      rankWeightForTierCode(a.tierCode, tierOptions) -
      rankWeightForTierCode(b.tierCode, tierOptions);
    if (weightDiff !== 0) return weightDiff;
    const posDiff = (a.positionInTier ?? 0) - (b.positionInTier ?? 0);
    if (posDiff !== 0) return posDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

/** @param {string} tierCode @param {Array<any>} tierOptions */
export function rankWeightForTierCode(tierCode, tierOptions = []) {
  const code = normalizePlacementTierCode(tierCode);
  const tier = tierOptions.find((t) => t.code?.toUpperCase() === code);
  return Number.isFinite(Number(tier?.rankWeight)) ? Number(tier.rankWeight) : 9999;
}

/** @param {string} tierCode */
export function normalizePlacementTierCode(tierCode) {
  return String(tierCode || "").trim().toUpperCase();
}

/**
 * Assign positionInTier from row order within each rankWeight group.
 * Equal-weight tiers share one position sequence so cross-tier order persists.
 */
export function assignPlacementPositions(rows, tierOptions = []) {
  const positionCounters = new Map();
  return rows.map((row) => {
    const weight = rankWeightForTierCode(row.tierCode, tierOptions);
    const positionInTier = (positionCounters.get(weight) ?? 0) + 1;
    positionCounters.set(weight, positionInTier);
    return { ...row, positionInTier };
  });
}

/** @param {Array<any>} rows @param {Array<any>} tierOptions */
export function countPlacementsByRankWeight(rows, tierOptions = []) {
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const row of rows) {
    const weight = rankWeightForTierCode(row.tierCode, tierOptions);
    counts.set(weight, (counts.get(weight) ?? 0) + 1);
  }
  return counts;
}

/** @deprecated use countPlacementsByRankWeight */
export function countPlacementsByTier(rows, tierOptions = []) {
  return countPlacementsByRankWeight(rows, tierOptions);
}

/** Reorder rows inside a contiguous equal-rankWeight segment. */
export function reorderPlacementSegment(
  rows,
  segmentId,
  fromIndex,
  toIndex,
  tierOptions = [],
) {
  if (fromIndex === toIndex) return rows;

  const segments = segmentPlacementRowsByContiguousRankWeight(rows, tierOptions);
  const segment = segments.find((entry) => entry.segmentId === segmentId);
  if (!segment) return rows;

  const nextSegmentRows = segment.items.map((item) => item.row);
  const [moved] = nextSegmentRows.splice(fromIndex, 1);
  nextSegmentRows.splice(toIndex, 0, moved);

  const next = [...rows];
  segment.items.forEach((item, index) => {
    next[item.globalIndex] = nextSegmentRows[index];
  });

  return assignPlacementPositions(next, tierOptions);
}

/** Group rows into contiguous same-rankWeight segments for scoped drag zones. */
export function segmentPlacementRowsByContiguousRankWeight(rows, tierOptions = []) {
  /** @type {Array<{ segmentId: string, rankWeight: number, items: Array<{ row: any, globalIndex: number }> }>} */
  const segments = [];
  let segmentCounter = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rankWeight = rankWeightForTierCode(row.tierCode, tierOptions);
    const last = segments[segments.length - 1];

    if (!last || last.rankWeight !== rankWeight) {
      segments.push({
        segmentId: `placement-seg-${segmentCounter++}`,
        rankWeight,
        items: [{ row, globalIndex: i }],
      });
      continue;
    }

    last.items.push({ row, globalIndex: i });
  }

  return segments;
}

/** @deprecated use segmentPlacementRowsByContiguousRankWeight */
export function segmentPlacementRowsByContiguousTier(rows, tierOptions = []) {
  return segmentPlacementRowsByContiguousRankWeight(rows, tierOptions);
}
