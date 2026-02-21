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
