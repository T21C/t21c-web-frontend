// tuf-search: #ArtistContext #artistContext
import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEYS = {
  SEARCH_QUERY: 'artist_search_query',
  SORT_BY: 'artist_sort_by',
  VERIFICATION_STATE: 'artist_verification_state',
  TUF_VERIFIED: 'artist_tuf_verified',
};

const ArtistContext = createContext();

export const useArtistContext = () => {
  const context = useContext(ArtistContext);
  if (!context) {
    throw new Error('useArtistContext must be used within an ArtistProvider');
  }
  return context;
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

export const ArtistContextProvider = ({ children }) => {
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
    <ArtistContext.Provider value={value}>
      {children}
    </ArtistContext.Provider>
  );
};
