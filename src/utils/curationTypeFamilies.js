// tuf-search: #curationTypeFamilies
/**
 * C / V / O / H name families: one tier per family (highest numeric suffix wins).
 */

const FAMILY_LETTERS = "CVOH";

/**
 * @param {unknown} name
 * @returns {{ letter: string, tier: number } | null}
 */
export function parseCurationFamilyTier(name) {
  const s = String(name ?? "").trim();
  if (!s.length) return null;
  const letter = s[0].toUpperCase();
  if (!FAMILY_LETTERS.includes(letter)) return null;
  const rest = s.slice(1);
  if (rest !== "" && !/^\d+$/.test(rest)) return null;
  const tier = rest === "" ? 0 : parseInt(rest, 10);
  if (!Number.isFinite(tier) || tier < 0) return null;
  return { letter, tier };
}

/**
 * Collapse a selected type-id list so each C/V/O/H family keeps only the highest tier.
 * Existing selection order is preserved (winners replace in place). Misc names stay additive.
 *
 * @param {number[]} selectedIds
 * @param {{ id: number, name?: string }[]} types
 * @returns {number[]}
 */
export function collapseCurationTypeIdsByFamilyTier(selectedIds, types) {
  const byId = new Map((types || []).map((t) => [t.id, t]));
  const refs = [];
  for (const id of selectedIds || []) {
    const t = byId.get(id);
    if (!t) continue;
    refs.push({ id: t.id, name: t.name });
  }

  const bestByFamily = new Map();
  for (const ref of refs) {
    const parsed = parseCurationFamilyTier(ref.name);
    if (!parsed) continue;
    const current = bestByFamily.get(parsed.letter);
    if (!current || parsed.tier > current.tier) {
      bestByFamily.set(parsed.letter, { id: ref.id, tier: parsed.tier });
    }
  }

  const out = [];
  const seen = new Set();
  const emittedFamily = new Set();
  for (const ref of refs) {
    const parsed = parseCurationFamilyTier(ref.name);
    if (!parsed) {
      if (!seen.has(ref.id)) {
        seen.add(ref.id);
        out.push(ref.id);
      }
      continue;
    }
    if (emittedFamily.has(parsed.letter)) continue;
    emittedFamily.add(parsed.letter);
    const winnerId = bestByFamily.get(parsed.letter)?.id ?? ref.id;
    if (seen.has(winnerId)) continue;
    seen.add(winnerId);
    out.push(winnerId);
  }
  return out;
}

/** C0/V0 are internal placeholders — never shown in curation announcements. */
export function isSilentCurationAnnouncementName(name) {
  const normalized = String(name ?? '').trim().toUpperCase();
  return normalized === 'C0' || normalized === 'V0';
}

export function announcedCurationTypeIds(ids, typesById) {
  const dict = typesById || {};
  const out = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    const type = dict[id] || dict.get?.(id);
    if (isSilentCurationAnnouncementName(type?.name)) continue;
    out.push(id);
  }
  return out;
}

/**
 * Chart = C/O, VFX = V, everything else (including H and Epic) is misc.
 * @param {unknown} name
 * @returns {'chart' | 'vfx' | 'misc'}
 */
export function curationTypeRatingBucket(name) {
  const parsed = parseCurationFamilyTier(name);
  if (!parsed) return 'misc';
  if (parsed.letter === 'C' || parsed.letter === 'O') return 'chart';
  if (parsed.letter === 'V') return 'vfx';
  return 'misc';
}

/**
 * @param {{ id: number, name?: string, sortOrder?: number, groupSortOrder?: number }[]} types
 * @returns {{ chart: object[], vfx: object[], misc: object[] }}
 */
export function groupCurationTypesForRating(types) {
  const chart = [];
  const vfx = [];
  const misc = [];
  const sorted = [...(types || [])].sort((a, b) => {
    const groupDelta = (a.groupSortOrder ?? 0) - (b.groupSortOrder ?? 0);
    if (groupDelta !== 0) return groupDelta;
    const sortDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortDelta !== 0) return sortDelta;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  for (const type of sorted) {
    const bucket = curationTypeRatingBucket(type?.name);
    if (bucket === 'chart') chart.push(type);
    else if (bucket === 'vfx') vfx.push(type);
    else misc.push(type);
  }
  return { chart, vfx, misc };
}

/**
 * @param {{ chartTypeId?: number | null, vfxTypeId?: number | null, miscTypeIds?: number[] } | null | undefined} detail
 * @param {Record<number, { name?: string }>} curationTypesDict
 * @returns {string}
 */
export function emptyCurationPicks() {
  return {chartTypeId: null, vfxTypeId: null, miscTypeIds: []};
}

export function picksAreEmpty(picks) {
  return !picks || (picks.chartTypeId == null && picks.vfxTypeId == null && (!picks.miscTypeIds || picks.miscTypeIds.length === 0));
}

export function picksFromCurationTypes(types) {
  const picks = emptyCurationPicks();
  for (const type of types || []) {
    const id = Number(type?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const bucket = curationTypeRatingBucket(type?.name);
    if (bucket === 'chart' && picks.chartTypeId == null) picks.chartTypeId = id;
    else if (bucket === 'vfx' && picks.vfxTypeId == null) picks.vfxTypeId = id;
    else if (bucket === 'misc' && !picks.miscTypeIds.includes(id)) picks.miscTypeIds.push(id);
  }
  return picks;
}

export function collectCurationPickIds(detail) {
  if (!detail) return [];
  const ids = [];
  if (detail.chartTypeId) ids.push(Number(detail.chartTypeId));
  if (detail.vfxTypeId) ids.push(Number(detail.vfxTypeId));
  for (const id of Array.isArray(detail.miscTypeIds) ? detail.miscTypeIds : []) {
    const n = Number(id);
    if (Number.isInteger(n) && n > 0) ids.push(n);
  }
  return ids;
}

export function formatCurationPickLabel(detail, curationTypesDict) {
  if (!detail) return '';
  const dict = curationTypesDict || {};
  return collectCurationPickIds(detail)
    .map((id) => dict[id]?.name)
    .filter(Boolean)
    .join(' · ');
}
