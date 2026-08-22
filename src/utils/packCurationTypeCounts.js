// tuf-search: #packCurationTypeCounts #pack #curation
const LEVEL_TYPE = 'level';
const FOLDER_TYPE = 'folder';

function addTypeId(into, rawId) {
  const n = Number(rawId);
  if (!Number.isFinite(n) || n <= 0) return;
  into.add(n);
}

function collectTypeIdsFromCuration(curation, into) {
  if (!curation || typeof curation !== 'object') return;
  if (Array.isArray(curation.typeIds)) {
    for (const id of curation.typeIds) addTypeId(into, id);
  }
  if (Array.isArray(curation.types)) {
    for (const type of curation.types) addTypeId(into, type?.id);
  }
  if (curation.type?.id != null) addTypeId(into, curation.type.id);
}

function curationsFromLevel(level) {
  if (!level) return [];
  if (Array.isArray(level.curations) && level.curations.length > 0) return level.curations;
  if (level.curation) return [level.curation];
  return [];
}

function walkPackItems(items, seenLevelIds, counts) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item) continue;

    if (item.type === FOLDER_TYPE && Array.isArray(item.children)) {
      walkPackItems(item.children, seenLevelIds, counts);
      continue;
    }

    if (item.type !== LEVEL_TYPE) continue;

    const level = item.referencedLevel;
    const levelId = item.levelId ?? level?.id;
    if (levelId == null) continue;
    const idKey = String(levelId);
    if (seenLevelIds.has(idKey)) continue;
    seenLevelIds.add(idKey);

    const typeIds = new Set();
    for (const curation of curationsFromLevel(level)) {
      collectTypeIdsFromCuration(curation, typeIds);
    }
    for (const typeId of typeIds) {
      const key = String(typeId);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
}

/**
 * Distinct pack levels per curation type id (string keys), same shape as creator
 * `curationTypeCounts`. Duplicate pack entries of the same level count once.
 *
 * @param {unknown[]} items
 * @returns {Record<string, number>}
 */
export function curationTypeCountsFromPackItems(items = []) {
  const counts = {};
  walkPackItems(items, new Set(), counts);
  return counts;
}
