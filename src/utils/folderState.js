// tuf-search: #folderState
// Utility for managing folder expansion state in localStorage
const FOLDER_STATE_KEY = 'pack_folder_states';
const PACK_FOLDER_STATES_KEY = 'pack_expanded_folders';

export const getFolderStates = () => {
  try {
    const raw = localStorage.getItem(FOLDER_STATE_KEY);
    if (raw) {
      const states = JSON.parse(raw);
      return states || {};
    }
  } catch (error) {
    console.warn('Failed to parse folder states from storage:', error);
  }
  return {};
};

export const setFolderState = (folderId, isExpanded) => {
  try {
    const states = getFolderStates();
    states[folderId] = isExpanded;
    localStorage.setItem(FOLDER_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.warn('Failed to save folder state:', error);
  }
};

export const getFolderState = (folderId, defaultExpanded = false) => {
  const states = getFolderStates();
  return states.hasOwnProperty(folderId) ? states[folderId] : defaultExpanded;
};

export const clearFolderStates = () => {
  localStorage.removeItem(FOLDER_STATE_KEY);
};

/**
 * Get expanded folder states for a specific pack
 * @param {string} packId - The pack ID
 * @returns {Set} - Set of expanded folder IDs
 */
export const getPackExpandedFolders = (packId) => {
  try {
    const raw = localStorage.getItem(PACK_FOLDER_STATES_KEY);
    if (raw) {
      const allPackStates = JSON.parse(raw);
      const packState = allPackStates[packId];
      return packState ? new Set(packState) : new Set();
    }
  } catch (error) {
    console.warn('Failed to parse pack folder states from storage:', error);
  }
  return new Set();
};

/**
 * Save expanded folder states for a specific pack
 * @param {string} packId - The pack ID
 * @param {Set} expandedFolders - Set of expanded folder IDs
 */
export const setPackExpandedFolders = (packId, expandedFolders) => {
  try {
    let allPackStates = {};
    const raw = localStorage.getItem(PACK_FOLDER_STATES_KEY);
    if (raw) {
      try {
        allPackStates = JSON.parse(raw);
      } catch (e) {
        allPackStates = {};
      }
    }
    allPackStates[packId] = Array.from(expandedFolders);
    localStorage.setItem(PACK_FOLDER_STATES_KEY, JSON.stringify(allPackStates));
  } catch (error) {
    console.warn('Failed to save pack folder states:', error);
  }
};

/**
 * Clear expanded folder states for a specific pack
 * @param {string} packId - The pack ID
 */
export const clearPackExpandedFolders = (packId) => {
  try {
    const raw = localStorage.getItem(PACK_FOLDER_STATES_KEY);
    if (raw) {
      const allPackStates = JSON.parse(raw);
      delete allPackStates[packId];
      localStorage.setItem(PACK_FOLDER_STATES_KEY, JSON.stringify(allPackStates));
    }
  } catch (error) {
    console.warn('Failed to clear pack folder states:', error);
  }
};

const PLACEMENT_COLLAPSED_KEY = 'pack_placement_collapsed_folders';
const PLACEMENT_COLLAPSED_TTL_MS = 60 * 60 * 1000;

function readPlacementCollapsedStore() {
  try {
    const raw = localStorage.getItem(PLACEMENT_COLLAPSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    console.warn('Failed to parse placement folder states from storage:', error);
    return {};
  }
}

function writePlacementCollapsedStore(store) {
  try {
    localStorage.setItem(PLACEMENT_COLLAPSED_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('Failed to save placement folder states:', error);
  }
}

function normalizeCollapsedIds(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => id != null);
}

function pruneExpiredPlacementCollapsed(store, now = Date.now()) {
  for (const packId of Object.keys(store)) {
    const entry = store[packId];
    const expiresAt = Number(entry?.expiresAt);
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now ||
      !Array.isArray(entry.collapsedIds)
    ) {
      delete store[packId];
    }
  }
  return store;
}

/**
 * Collapsed folder ids for the pack placement tree. Expired entries are dropped.
 * @param {string|number} packId
 * @returns {Set}
 */
export const getPlacementCollapsedFolders = (packId) => {
  if (packId == null || packId === '') return new Set();
  const store = pruneExpiredPlacementCollapsed(readPlacementCollapsedStore());
  writePlacementCollapsedStore(store);
  const entry = store[String(packId)];
  if (!entry) return new Set();
  return new Set(normalizeCollapsedIds(entry.collapsedIds));
};

/**
 * Save collapsed folder ids for the pack placement tree and start a 1-hour TTL.
 * @param {string|number} packId
 * @param {Set} collapsedFolderIds
 */
export const setPlacementCollapsedFolders = (packId, collapsedFolderIds) => {
  if (packId == null || packId === '') return;
  const store = pruneExpiredPlacementCollapsed(readPlacementCollapsedStore());
  store[String(packId)] = {
    collapsedIds: normalizeCollapsedIds(Array.from(collapsedFolderIds || [])),
    expiresAt: Date.now() + PLACEMENT_COLLAPSED_TTL_MS,
  };
  writePlacementCollapsedStore(store);
};
