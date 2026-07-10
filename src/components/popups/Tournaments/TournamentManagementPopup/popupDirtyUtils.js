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

/** @param {Array<any>} rows @param {string} placementMode */
export function serializePlacements(rows, placementMode = "profile") {
  const normalized = rows
    .filter((r) => r.displayName?.trim() || resolveEffectiveRowMode(r, placementMode) === "level")
    .map((r, index) => {
      const effectiveMode = resolveEffectiveRowMode(r, placementMode);
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
          effectiveMode === "profile"
            ? r.linkedProfile?.id ?? r.playerId ?? null
            : null,
        creatorId: null,
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
  const weightForCode = (code) => {
    const tier = tierOptions.find(
      (t) => t.code?.toUpperCase() === String(code || "").toUpperCase(),
    );
    return tier?.rankWeight ?? 9999;
  };

  return [...rows].sort((a, b) => {
    const weightDiff = weightForCode(a.tierCode) - weightForCode(b.tierCode);
    if (weightDiff !== 0) return weightDiff;
    const posDiff = (a.positionInTier ?? 0) - (b.positionInTier ?? 0);
    if (posDiff !== 0) return posDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

/** Assign positionInTier from row order, grouped by tier code. */
export function assignPlacementPositions(rows) {
  const positionCounters = new Map();
  return rows.map((row) => {
    const code = String(row.tierCode || "").trim().toUpperCase();
    const positionInTier = (positionCounters.get(code) ?? 0) + 1;
    positionCounters.set(code, positionInTier);
    return {...row, positionInTier};
  });
}

/** @param {string} tierCode */
export function normalizePlacementTierCode(tierCode) {
  return String(tierCode || "").trim().toUpperCase();
}

/** @param {Array<any>} rows */
export function countPlacementsByTier(rows) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const row of rows) {
    const code = normalizePlacementTierCode(row.tierCode);
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

/** Reorder rows inside a contiguous tier segment. */
export function reorderPlacementSegment(rows, segmentId, fromIndex, toIndex) {
  if (fromIndex === toIndex) return rows;

  const segments = segmentPlacementRowsByContiguousTier(rows);
  const segment = segments.find((entry) => entry.segmentId === segmentId);
  if (!segment) return rows;

  const nextSegmentRows = segment.items.map((item) => item.row);
  const [moved] = nextSegmentRows.splice(fromIndex, 1);
  nextSegmentRows.splice(toIndex, 0, moved);

  const next = [...rows];
  segment.items.forEach((item, index) => {
    next[item.globalIndex] = nextSegmentRows[index];
  });

  return assignPlacementPositions(next);
}

/** Group rows into contiguous same-tier segments for scoped drag zones. */
export function segmentPlacementRowsByContiguousTier(rows) {
  /** @type {Array<{ segmentId: string, tierCode: string, items: Array<{ row: any, globalIndex: number }> }>} */
  const segments = [];
  let segmentCounter = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tierCode = normalizePlacementTierCode(row.tierCode) || "__EMPTY__";
    const last = segments[segments.length - 1];

    if (!last || last.tierCode !== tierCode) {
      segments.push({
        segmentId: `placement-seg-${segmentCounter++}`,
        tierCode,
        items: [{ row, globalIndex: i }],
      });
      continue;
    }

    last.items.push({ row, globalIndex: i });
  }

  return segments;
}
