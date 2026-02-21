import { createContext, useContext, useState, useEffect } from 'react';

const SongContext = createContext();

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error('useSongContext must be used within a SongProvider');
  }
  return context;
};

const STORAGE_KEYS = {
  SEARCH_QUERY: 'song_search_query',
  SORT_BY: 'song_sort_by',
  VERIFICATION_STATE: 'song_verification_state',
};

export const SongContextProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_BY) || 'NAME_ASC');
  const [verificationState, setVerificationState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VERIFICATION_STATE);
    return saved === '' ? null : (saved || null);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (verificationState === null || verificationState === '') {
      localStorage.removeItem(STORAGE_KEYS.VERIFICATION_STATE);
    } else {
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_STATE, verificationState);
    }
  }, [verificationState]);

  const value = {
    searchQuery,
    sortBy,
    verificationState,
    setSearchQuery,
    setSortBy,
    setVerificationState,
  };

  return (
    <SongContext.Provider value={value}>
      {children}
    </SongContext.Provider>
  );
};
