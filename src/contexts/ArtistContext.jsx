import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEYS = {
  SEARCH_QUERY: 'artist_search_query',
  SORT_BY: 'artist_sort_by',
  VERIFICATION_STATE: 'artist_verification_state',
};

const ArtistContext = createContext();

export const useArtistContext = () => {
  const context = useContext(ArtistContext);
  if (!context) {
    throw new Error('useArtistContext must be used within an ArtistProvider');
  }
  return context;
};

export const ArtistContextProvider = ({ children }) => {
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
    <ArtistContext.Provider value={value}>
      {children}
    </ArtistContext.Provider>
  );
};
