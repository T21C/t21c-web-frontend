// tuf-search: #facetQueryCodec
/**
 * Client helpers for facet query v1 (tags / curation types).
 * Mirrors server/src/misc/utils/search/facetQuery.ts semantics.
 */

export function facetDomainHasFilter(d) {
  if (!d) return false;
  if (d.mode === 'simple') return Array.isArray(d.ids) && d.ids.length > 0;
  if (d.mode === 'advanced') {
    const hasGroup = (d.groups || []).some((g) => (g.ids || []).length > 0);
    const hasEx = (d.excludeIds || []).length > 0;
    return hasGroup || hasEx;
  }
  return false;
}

/**
 * Collapse empty groups and rebuild betweenPairs for the API payload.
 * @param {object} adv
 */
export function normalizeAdvancedForApi(adv) {
  if (!adv || adv.mode !== 'advanced') return adv;
  const rawGroups = adv.groups || [];
  const keptIdx = rawGroups.map((_, i) => i).filter((i) => (rawGroups[i].ids || []).length > 0);
  const groups = keptIdx.map((i) => ({
    quantifier: rawGroups[i].quantifier,
    ids: [...rawGroups[i].ids],
  }));
  const fb = adv.betweenGroups === 'or' ? 'or' : 'and';
  const pairsRaw = adv.betweenPairs || [];
  const betweenPairs = [];
  for (let k = 0; k < keptIdx.length - 1; k++) {
    const a = keptIdx[k];
    const b = keptIdx[k + 1];
    if (b === a + 1) {
      betweenPairs.push(pairsRaw[a] ?? fb);
    } else {
      let op = 'and';
      for (let t = a; t < b; t++) {
        if ((pairsRaw[t] ?? fb) === 'or') op = 'or';
      }
      betweenPairs.push(op);
    }
  }
  const out = {
    mode: 'advanced',
    groups,
    betweenGroups: adv.betweenGroups || 'and',
    excludeIds: [...(adv.excludeIds || [])],
  };
  if (betweenPairs.length > 0) {
    out.betweenPairs = betweenPairs;
  }
  return out;
}

function normalizeDomain(d) {
  if (!d) return d;
  if (d.mode === 'advanced') return normalizeAdvancedForApi(d);
  return d;
}

/**
 * Build JSON string for GET `facetQuery` param, or undefined if nothing to filter.
 * @param {{ tags?: object, curationTypes?: object, combine?: string } | null} facet
 */
export function buildFacetQueryParam(facet) {
  if (!facet) return undefined;
  const combine = facet.combine === 'or' ? 'or' : 'and';
  const payload = { v: 1, combine };
  const tags = normalizeDomain(facet.tags);
  const curationTypes = normalizeDomain(facet.curationTypes);
  if (facetDomainHasFilter(tags)) payload.tags = tags;
  if (facetDomainHasFilter(curationTypes)) payload.curationTypes = curationTypes;
  if (!payload.tags && !payload.curationTypes) return undefined;
  return JSON.stringify(payload);
}

/**
 * Migrate legacy level filter storage (name arrays) to facet domains with numeric ids.
 * @param {string[]} tagNames
 * @param {string[]} curationTypeNames
 * @param {{ id: number, name: string }[]} tags
 * @param {{ id: number, name: string }[]} curationTypes
 */
export function migrateLegacyNamesToFacet(tagNames, curationTypeNames, tags, curationTypes) {
  const tagIds = (tagNames || [])
    .map((n) => tags.find((t) => t.name === n)?.id)
    .filter((id) => id != null);
  const ctIds = (curationTypeNames || [])
    .map((n) => curationTypes.find((t) => t.name === n)?.id)
    .filter((id) => id != null);
  return {
    tags: tagIds.length ? { mode: 'simple', op: 'or', ids: [...new Set(tagIds)] } : null,
    curationTypes: ctIds.length ? { mode: 'simple', op: 'or', ids: [...new Set(ctIds)] } : null,
    combine: 'and',
  };
}
