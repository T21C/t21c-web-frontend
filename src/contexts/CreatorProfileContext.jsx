// tuf-search: #CreatorProfileContext #creatorProfileContext
import React, { createContext, useState, useEffect, useContext } from 'react';

const CREATOR_PROFILE_SETTINGS_KEY = 'creator_profile_settings';

const DEFAULT_SETTINGS = {
  searchQuery: '',
  sortType: 'RECENT_DESC',
  sortOrder: 'DESC',
};

export const CreatorProfileContext = createContext();

export const CreatorProfileContextProvider = ({ children }) => {
  const [creatorProfileSettings, setCreatorProfileSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(CREATOR_PROFILE_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error parsing creator profile settings:', e);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CREATOR_PROFILE_SETTINGS_KEY, JSON.stringify(creatorProfileSettings));
    } catch (e) {
      console.error('Error saving creator profile settings:', e);
    }
  }, [creatorProfileSettings]);

  const getCreatorSettings = (creatorId) => {
    return creatorProfileSettings[creatorId] || { ...DEFAULT_SETTINGS };
  };

  const updateCreatorSettings = (creatorId, settings) => {
    setCreatorProfileSettings(prev => ({
      ...prev,
      [creatorId]: {
        ...DEFAULT_SETTINGS,
        ...prev[creatorId],
        ...settings,
      },
    }));
  };

  const clearCreatorSettings = (creatorId) => {
    setCreatorProfileSettings(prev => {
      const next = { ...prev };
      delete next[creatorId];
      return next;
    });
  };

  return (
    <CreatorProfileContext.Provider
      value={{
        creatorProfileSettings,
        getCreatorSettings,
        updateCreatorSettings,
        clearCreatorSettings,
      }}
    >
      {children}
    </CreatorProfileContext.Provider>
  );
};

export const useCreatorProfileContext = () => {
  const context = useContext(CreatorProfileContext);
  if (!context) {
    throw new Error('useCreatorProfileContext must be used within CreatorProfileContextProvider');
  }
  return context;
};
