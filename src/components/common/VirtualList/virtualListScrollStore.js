/** @typedef {import('react-virtuoso').StateSnapshot} StateSnapshot */
/** @typedef {import('react-virtuoso').GridStateSnapshot} GridStateSnapshot */

/** @type {Map<string, { fingerprint: string, snapshot: StateSnapshot | GridStateSnapshot }>} */
const store = new Map();

/**
 * @param {string} pathname
 * @param {string} search
 * @param {string} stateKey
 * @param {boolean} grid
 * @param {boolean} containerScroll
 */
export function buildVirtualListStoreKey(pathname, search, stateKey, grid, containerScroll) {
  const scrollMode = containerScroll ? 'container' : 'window';
  const layout = grid ? 'grid' : 'list';
  return `${pathname}${search}::${stateKey}::${layout}::${scrollMode}`;
}

/**
 * @param {readonly unknown[]} items
 * @param {(index: number, item: unknown) => string | number} computeItemKey
 */
export function buildVirtualListFingerprint(items, computeItemKey) {
  if (!items?.length) return '0';
  const first = computeItemKey(0, items[0]);
  const last = computeItemKey(items.length - 1, items[items.length - 1]);
  return `${items.length}:${first}:${last}`;
}

/**
 * @param {string} key
 * @param {string} fingerprint
 * @returns {StateSnapshot | GridStateSnapshot | null}
 */
export function getVirtualListScrollState(key, fingerprint) {
  const entry = store.get(key);
  if (!entry || entry.fingerprint !== fingerprint) return null;
  return entry.snapshot;
}

/**
 * @param {string} key
 * @param {string} fingerprint
 * @param {StateSnapshot | GridStateSnapshot} snapshot
 */
export function setVirtualListScrollState(key, fingerprint, snapshot) {
  store.set(key, { fingerprint, snapshot });
}
