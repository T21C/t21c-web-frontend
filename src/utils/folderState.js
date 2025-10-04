// Utility for managing folder expansion state in cookies
const FOLDER_STATE_COOKIE = 'pack_folder_states';

export const getFolderStates = () => {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${FOLDER_STATE_COOKIE}=`));
    
    if (cookieValue) {
      const states = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
      return states || {};
    }
  } catch (error) {
    console.warn('Failed to parse folder states from cookie:', error);
  }
  
  return {};
};

export const setFolderState = (folderId, isExpanded) => {
  try {
    const states = getFolderStates();
    states[folderId] = isExpanded;
    
    const cookieValue = encodeURIComponent(JSON.stringify(states));
    document.cookie = `${FOLDER_STATE_COOKIE}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
  } catch (error) {
    console.warn('Failed to save folder state to cookie:', error);
  }
};

export const getFolderState = (folderId, defaultExpanded = false) => {
  const states = getFolderStates();
  return states.hasOwnProperty(folderId) ? states[folderId] : defaultExpanded;
};

export const clearFolderStates = () => {
  document.cookie = `${FOLDER_STATE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// Pack-specific folder expansion state management
const PACK_FOLDER_STATES_COOKIE = 'pack_expanded_folders';

/**
 * Get expanded folder states for a specific pack
 * @param {string} packId - The pack ID
 * @returns {Set} - Set of expanded folder IDs
 */
export const getPackExpandedFolders = (packId) => {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${PACK_FOLDER_STATES_COOKIE}=`));
    
    if (cookieValue) {
      const allPackStates = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
      const packState = allPackStates[packId];
      return packState ? new Set(packState) : new Set();
    }
  } catch (error) {
    console.warn('Failed to parse pack folder states from cookie:', error);
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
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${PACK_FOLDER_STATES_COOKIE}=`));
    
    let allPackStates = {};
    if (cookieValue) {
      try {
        allPackStates = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
      } catch (e) {
        // If parsing fails, start with empty object
        allPackStates = {};
      }
    }
    
    // Update the specific pack's state
    allPackStates[packId] = Array.from(expandedFolders);
    
    // Save back to cookie
    const encodedValue = encodeURIComponent(JSON.stringify(allPackStates));
    document.cookie = `${PACK_FOLDER_STATES_COOKIE}=${encodedValue}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
  } catch (error) {
    console.warn('Failed to save pack folder states to cookie:', error);
  }
};

/**
 * Clear expanded folder states for a specific pack
 * @param {string} packId - The pack ID
 */
export const clearPackExpandedFolders = (packId) => {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${PACK_FOLDER_STATES_COOKIE}=`));
    
    if (cookieValue) {
      const allPackStates = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
      delete allPackStates[packId];
      
      const encodedValue = encodeURIComponent(JSON.stringify(allPackStates));
      document.cookie = `${PACK_FOLDER_STATES_COOKIE}=${encodedValue}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
  } catch (error) {
    console.warn('Failed to clear pack folder states from cookie:', error);
  }
};