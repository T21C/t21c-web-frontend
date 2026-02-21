import React, { createContext, useState, useEffect, useContext } from 'react';

const PROFILE_SETTINGS_KEY = 'profile_settings';

export const ProfileContext = createContext();

export const ProfileContextProvider = ({ children }) => {
  const [profileSettings, setProfileSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error parsing profile settings:', e);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(profileSettings));
    } catch (e) {
      console.error('Error saving profile settings:', e);
    }
  }, [profileSettings]);

  // Get settings for a specific player
  const getPlayerSettings = (playerId) => {
    return profileSettings[playerId] || {
      searchQuery: '',
      sortType: 'score',
      sortOrder: 'DESC'
    };
  };

  // Update settings for a specific player
  const updatePlayerSettings = (playerId, settings) => {
    setProfileSettings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        ...settings
      }
    }));
  };

  // Set search query for a player
  const setSearchQuery = (playerId, query) => {
    updatePlayerSettings(playerId, { searchQuery: query });
  };

  // Set sort type for a player
  const setSortType = (playerId, sortType) => {
    updatePlayerSettings(playerId, { sortType });
  };

  // Set sort order for a player
  const setSortOrder = (playerId, sortOrder) => {
    updatePlayerSettings(playerId, { sortOrder });
  };

  // Clear settings for a specific player
  const clearPlayerSettings = (playerId) => {
    setProfileSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[playerId];
      return newSettings;
    });
  };

  return (
    <ProfileContext.Provider
      value={{
        profileSettings,
        getPlayerSettings,
        updatePlayerSettings,
        setSearchQuery,
        setSortType,
        setSortOrder,
        clearPlayerSettings
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

// Custom hook for easier usage
export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within ProfileContextProvider');
  }
  return context;
};

