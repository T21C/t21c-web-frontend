/**
 * Normalize alias rows from player/creator profile payloads for header tooltips.
 * Order: chronological (oldest first) by `createdAt`, else ascending `id`, else input order.
 * @param {object|null|undefined} source
 * @param {string} [displayName] — excluded from the returned list (case-insensitive)
 * @returns {string[]}
 */
export function normalizeProfileAliasNames(source, displayName = '') {
  if (!source || typeof source !== 'object') return [];

  const displayKey = String(displayName ?? '').trim().toLowerCase();
  const rows = collectAliasRowsFromSource(source);
  rows.sort(compareAliasRowsChronological);

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const trimmed = row.name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (displayKey && key === displayKey) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function compareAliasRowsChronological(a, b) {
  if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
  return a.fallbackIndex - b.fallbackIndex;
}

function aliasRowSortKey(item, fallbackIndex) {
  if (item && typeof item === 'object') {
    const createdAt = item.createdAt;
    if (createdAt != null) {
      const ms = new Date(createdAt).getTime();
      if (Number.isFinite(ms)) return ms;
    }
    if (Number.isFinite(item.id)) return item.id;
  }
  return fallbackIndex;
}

function collectAliasRowsFromSource(source) {
  const rows = [];
  let fallbackIndex = 0;
  const lists = [source.aliases, source.playerAliases, source.creatorAliases];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      let name = '';
      if (typeof item === 'string') {
        name = item;
      } else if (item && typeof item === 'object' && typeof item.name === 'string') {
        name = item.name;
      }
      if (!name.trim()) continue;
      rows.push({
        name,
        sortKey: aliasRowSortKey(item, fallbackIndex),
        fallbackIndex,
      });
      fallbackIndex += 1;
    }
  }
  return rows;
}

function shouldAppendRenameAlias(previousName, nextDisplayName) {
  const prev = String(previousName ?? '').trim();
  const next = String(nextDisplayName ?? '').trim();
  return Boolean(prev) && prev.toLowerCase() !== next.toLowerCase();
}

function aliasRowName(item) {
  if (typeof item === 'string') return item.trim();
  if (item && typeof item === 'object' && typeof item.name === 'string') {
    return item.name.trim();
  }
  return '';
}

function normalizeAliasRowList(list) {
  return (Array.isArray(list) ? list : [])
    .map((item, index) => {
      const name = aliasRowName(item);
      const id =
        item && typeof item === 'object' && Number.isFinite(item.id) ? item.id : index;
      return { id, name, sortKey: aliasRowSortKey(item, index), fallbackIndex: index };
    })
    .filter((r) => r.name)
    .sort(compareAliasRowsChronological);
}

/**
 * After a display-name rename, merge the previous name into alias rows for immediate UI.
 * New rename aliases are appended last (most recent).
 * @param {Array<{ id?: number, name: string }|string>|null|undefined} aliasRows
 * @param {string} previousName
 * @param {string} nextDisplayName
 * @returns {Array<{ id: number, name: string }>}
 */
export function mergeOptimisticAliasRows(aliasRows, previousName, nextDisplayName) {
  const normalized = normalizeAliasRowList(aliasRows).map(({ id, name }) => ({ id, name }));

  if (!shouldAppendRenameAlias(previousName, nextDisplayName)) {
    return normalized;
  }

  const prev = String(previousName).trim();
  const exists = normalized.some((row) => row.name.toLowerCase() === prev.toLowerCase());
  if (exists) return normalized;

  return [...normalized, { id: -Math.abs(Date.now()), name: prev }];
}

/**
 * String-list variant for settings alias chip state (chronological order).
 * @param {string[]} aliasNames
 * @param {string} previousName
 * @param {string} nextDisplayName
 * @returns {string[]}
 */
export function mergeOptimisticAliasNameList(aliasNames, previousName, nextDisplayName) {
  const rows = mergeOptimisticAliasRows(
    (Array.isArray(aliasNames) ? aliasNames : []).map((name, index) => ({ id: index, name })),
    previousName,
    nextDisplayName,
  );
  return rows.map((r) => r.name).filter(Boolean);
}

/**
 * Read alias names from a profile payload in chronological order.
 * @param {object|null|undefined} profile
 * @param {string} [displayName]
 * @returns {string[]}
 */
export function readProfileAliasNamesChronological(profile, displayName = '') {
  return normalizeProfileAliasNames(profile, displayName);
}
