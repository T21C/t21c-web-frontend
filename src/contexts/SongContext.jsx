import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const SongContext = createContext();

export const useSongContext = () => {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error('useSongContext must be used within a SongProvider');
  }
  return context;
};

export const SongContextProvider = ({ children }) => {
  // Cookie keys
  const COOKIE_KEYS = {
    SEARCH_QUERY: 'song_search_query',
    SORT_BY: 'song_sort_by',
    VERIFICATION_STATE: 'song_verification_state',
  };

  const [searchQuery, setSearchQuery] = useState(() => Cookies.get(COOKIE_KEYS.SEARCH_QUERY) || '');
  const [sortBy, setSortBy] = useState(() => Cookies.get(COOKIE_KEYS.SORT_BY) || 'NAME_ASC');
  const [verificationState, setVerificationState] = useState(() => Cookies.get(COOKIE_KEYS.VERIFICATION_STATE) || '');

  // Effects to save state changes to cookies
  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.VERIFICATION_STATE, verificationState);
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
