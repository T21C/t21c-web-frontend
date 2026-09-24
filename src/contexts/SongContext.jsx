// tuf-search: #SongContext #songContext
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
  TUF_VERIFIED: 'song_tuf_verified',
};

function readVerificationState() {
  const saved = localStorage.getItem(STORAGE_KEYS.VERIFICATION_STATE);
  if (saved === 'tuf_verified' || saved === '' || saved == null) {
    if (saved === 'tuf_verified') {
      localStorage.removeItem(STORAGE_KEYS.VERIFICATION_STATE);
    }
    return null;
  }
  return saved;
}

export const SongContextProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_BY) || 'NAME_ASC');
  const [verificationState, setVerificationState] = useState(readVerificationState);
  const [tufVerified, setTufVerified] = useState(() => (
    localStorage.getItem(STORAGE_KEYS.TUF_VERIFIED) === 'true' ? true : null
  ));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (verificationState === null || verificationState === '' || verificationState === 'tuf_verified') {
      localStorage.removeItem(STORAGE_KEYS.VERIFICATION_STATE);
    } else {
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_STATE, verificationState);
    }
  }, [verificationState]);

  useEffect(() => {
    if (tufVerified === true) {
      localStorage.setItem(STORAGE_KEYS.TUF_VERIFIED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.TUF_VERIFIED);
    }
  }, [tufVerified]);

  const value = {
    searchQuery,
    sortBy,
    verificationState,
    tufVerified,
    setSearchQuery,
    setSortBy,
    setVerificationState,
    setTufVerified,
  };

  return (
    <SongContext.Provider value={value}>
      {children}
    </SongContext.Provider>
  );
};
