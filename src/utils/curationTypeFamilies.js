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

const REQUESTED_BUCKET_ORDER = ['chart', 'vfx', 'misc'];

export function curationRequestHasTypes(request) {
  if (!request) return false;
  return (
    (request.curationTypeIds || []).length > 0 ||
    (request.addCurationTypeIds || []).length > 0 ||
    (request.removeCurationTypeIds || []).length > 0
  );
}

export function visibleCurationRequests(requests) {
  return (requests || []).filter(curationRequestHasTypes);
}

export function collectRequestedCurationTypeIds(requests) {
  const ids = [];
  const seen = new Set();
  for (const request of requests || []) {
    for (const raw of [
      ...(request.curationTypeIds || []),
      ...(request.addCurationTypeIds || []),
      ...(request.removeCurationTypeIds || []),
    ]) {
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function requestedCurationBuckets(requests, typesDict) {
  const buckets = new Set();
  const dict = typesDict || {};
  for (const id of collectRequestedCurationTypeIds(requests)) {
    const type = dict[id] || dict[String(id)];
    if (!type) continue;
    buckets.add(curationTypeRatingBucket(type.name));
  }
  return buckets;
}

export function orderedRequestedCurationBuckets(requests, typesDict) {
  const buckets = requestedCurationBuckets(requests, typesDict);
  return REQUESTED_BUCKET_ORDER.filter((bucket) => buckets.has(bucket));
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
  return {
    chartTypeId: null,
    chartTypeHighId: null,
    vfxTypeId: null,
    vfxTypeHighId: null,
    chartRating: '',
    vfxRating: '',
    miscTypeIds: [],
  };
}

export function updateCurationPicks(picks, patch) {
  const current = {
    ...emptyCurationPicks(),
    ...(picks || {}),
    miscTypeIds: Array.isArray(picks?.miscTypeIds) ? [...picks.miscTypeIds] : [],
  };
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'miscToggle')) {
    const id = Number(patch.miscToggle);
    const has = current.miscTypeIds.includes(id);
    return {
      ...current,
      miscTypeIds: has
        ? current.miscTypeIds.filter((item) => item !== id)
        : [...current.miscTypeIds, id],
    };
  }
  return { ...current, ...(patch || {}) };
}

function ratingTextEmpty(value) {
  return value == null || String(value).trim() === '';
}

export function picksAreEmpty(picks) {
  return !picks || (
    picks.chartTypeId == null &&
    picks.chartTypeHighId == null &&
    picks.vfxTypeId == null &&
    picks.vfxTypeHighId == null &&
    ratingTextEmpty(picks.chartRating) &&
    ratingTextEmpty(picks.vfxRating) &&
    (!picks.miscTypeIds || picks.miscTypeIds.length === 0)
  );
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
  if (detail.chartTypeHighId) ids.push(Number(detail.chartTypeHighId));
  if (detail.vfxTypeId) ids.push(Number(detail.vfxTypeId));
  if (detail.vfxTypeHighId) ids.push(Number(detail.vfxTypeHighId));
  for (const id of Array.isArray(detail.miscTypeIds) ? detail.miscTypeIds : []) {
    const n = Number(id);
    if (Number.isInteger(n) && n > 0) ids.push(n);
  }
  return ids;
}

export function formatCurationRangeLabel(lowId, highId, curationTypesDict) {
  const dict = curationTypesDict || {};
  const lowName = dict[lowId]?.name;
  if (!lowName) return '';
  const highName = highId && Number(highId) !== Number(lowId) ? dict[highId]?.name : '';
  if (!highName) return lowName;
  const lowParsed = parseCurationFamilyTier(lowName);
  const highParsed = parseCurationFamilyTier(highName);
  if (lowParsed && highParsed && lowParsed.letter === highParsed.letter) {
    return `${lowName}-${highParsed.tier}`;
  }
  return `${lowName}-${highName}`;
}

function sortedMiscTypeIds(picks) {
  return [...new Set((picks?.miscTypeIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b);
}

/** Typed `C0-1` and saved `{chartTypeId: C0, chartTypeHighId: C1}` are the same pick. */
export function effectiveCurationRating(picks, bucket, curationTypesDict) {
  const current = picks || emptyCurationPicks();
  if (bucket === 'vfx') {
    return String(
      current.vfxRating
        || formatCurationRangeLabel(current.vfxTypeId, current.vfxTypeHighId, curationTypesDict)
        || '',
    ).trim();
  }
  return String(
    current.chartRating
      || formatCurationRangeLabel(current.chartTypeId, current.chartTypeHighId, curationTypesDict)
      || '',
  ).trim();
}

export function picksEqual(a, b, curationTypesDict) {
  if (effectiveCurationRating(a, 'chart', curationTypesDict) !== effectiveCurationRating(b, 'chart', curationTypesDict)) {
    return false;
  }
  if (effectiveCurationRating(a, 'vfx', curationTypesDict) !== effectiveCurationRating(b, 'vfx', curationTypesDict)) {
    return false;
  }
  const aMisc = sortedMiscTypeIds(a);
  const bMisc = sortedMiscTypeIds(b);
  if (aMisc.length !== bMisc.length) return false;
  return aMisc.every((id, index) => id === bMisc[index]);
}

export function curationRatingPayload(picks, curationTypesDict) {
  const current = picks || emptyCurationPicks();
  return {
    chartRating: current.chartRating || formatCurationRangeLabel(
      current.chartTypeId,
      current.chartTypeHighId,
      curationTypesDict,
    ),
    vfxRating: current.vfxRating || formatCurationRangeLabel(
      current.vfxTypeId,
      current.vfxTypeHighId,
      curationTypesDict,
    ),
    miscTypeIds: Array.isArray(current.miscTypeIds) ? current.miscTypeIds : [],
  };
}

export function picksFromRatingDetail(detail, curationTypesDict) {
  const picks = emptyCurationPicks();
  if (!detail) return picks;
  picks.chartTypeId = detail.chartTypeId ?? null;
  picks.chartTypeHighId = detail.chartTypeHighId ?? null;
  picks.vfxTypeId = detail.vfxTypeId ?? null;
  picks.vfxTypeHighId = detail.vfxTypeHighId ?? null;
  picks.chartRating = formatCurationRangeLabel(
    picks.chartTypeId,
    picks.chartTypeHighId,
    curationTypesDict,
  );
  picks.vfxRating = formatCurationRangeLabel(
    picks.vfxTypeId,
    picks.vfxTypeHighId,
    curationTypesDict,
  );
  picks.miscTypeIds = Array.isArray(detail.miscTypeIds) ? detail.miscTypeIds.map(Number) : [];
  return picks;
}

export function formatCurationPickLabel(detail, curationTypesDict) {
  if (!detail) return '';
  const dict = curationTypesDict || {};
  const parts = [
    formatCurationRangeLabel(detail.chartTypeId, detail.chartTypeHighId, dict),
    formatCurationRangeLabel(detail.vfxTypeId, detail.vfxTypeHighId, dict),
  ];
  for (const id of Array.isArray(detail.miscTypeIds) ? detail.miscTypeIds : []) {
    const name = dict[id]?.name;
    if (name) parts.push(name);
  }
  return parts.filter(Boolean).join(' · ');
}

export function curationTypesInFamily(types, typeId, dict) {
  const selected = dict?.[typeId] || (types || []).find((type) => type.id === typeId);
  const letter = parseCurationFamilyTier(selected?.name)?.letter;
  if (!letter) return [];
  return (types || []).filter((type) => parseCurationFamilyTier(type.name)?.letter === letter);
}
