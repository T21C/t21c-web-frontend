import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const ArtistContext = createContext();

export const useArtistContext = () => {
  const context = useContext(ArtistContext);
  if (!context) {
    throw new Error('useArtistContext must be used within an ArtistProvider');
  }
  return context;
};

export const ArtistContextProvider = ({ children }) => {
  // Cookie keys
  const COOKIE_KEYS = {
    SEARCH_QUERY: 'artist_search_query',
    SORT_BY: 'artist_sort_by',
    VERIFICATION_STATE: 'artist_verification_state',
  };

  const [searchQuery, setSearchQuery] = useState(() => Cookies.get(COOKIE_KEYS.SEARCH_QUERY) || '');
  const [sortBy, setSortBy] = useState(() => Cookies.get(COOKIE_KEYS.SORT_BY) || 'NAME_ASC');
  const [verificationState, setVerificationState] = useState(() => {
    const saved = Cookies.get(COOKIE_KEYS.VERIFICATION_STATE);
    return saved === '' ? null : (saved || null);
  });

  // Effects to save state changes to cookies
  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (verificationState === null || verificationState === '') {
      Cookies.remove(COOKIE_KEYS.VERIFICATION_STATE);
    } else {
      Cookies.set(COOKIE_KEYS.VERIFICATION_STATE, verificationState);
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
