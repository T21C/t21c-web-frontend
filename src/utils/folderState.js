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
