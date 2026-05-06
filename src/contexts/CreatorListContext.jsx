// tuf-search: #CreatorListContext #creatorListContext
import React, { createContext, useState, useEffect } from 'react';
import {
  normalizeCreatorLeaderboardSortBy,
} from '@/utils/creatorLeaderboardSort';

const STORAGE_KEYS = {
  SORT_OPEN: 'creator_sort_open',
  FILTER_OPEN: 'creator_filter_open',
  QUERY: 'creator_query',
  SORT: 'creator_sort',
  SORT_BY: 'creator_sort_by',
  VERIFICATION_FILTER: 'creator_verification_filter',
};

export const CreatorListContext = createContext(null);

export const CreatorListContextProvider = ({ children }) => {
  /** `null` = list not loaded yet (avoids empty-state flash before first fetch). */
  const [creatorData, setCreatorData] = useState(null);
  const [displayedCreators, setDisplayedCreators] = useState(null);
  /** Last successful `count` from leaderboard API (offset 0); used to restore `hasMore` when skipping refetch on remount). */
  const [creatorListTotal, setCreatorListTotal] = useState(null);
  const [maxFields, setMaxFields] = useState({});
  const [sortOpen, setSortOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_OPEN) === 'true');
  const [filterOpen, setFilterOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.FILTER_OPEN) === 'true');
  const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT) || 'DESC');
  const [sortBy, setSortBy] = useState(() =>
    normalizeCreatorLeaderboardSortBy(localStorage.getItem(STORAGE_KEYS.SORT_BY)),
  );
  const [verificationFilter, setVerificationFilter] = useState(
    () => localStorage.getItem(STORAGE_KEYS.VERIFICATION_FILTER) || '',
  );
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_OPEN, sortOpen);
  }, [sortOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTER_OPEN, filterOpen);
  }, [filterOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUERY, query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT, sort);
  }, [sort]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    const fixed = normalizeCreatorLeaderboardSortBy(sortBy);
    if (fixed !== sortBy) {
      setSortBy(fixed);
    }
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VERIFICATION_FILTER, verificationFilter);
  }, [verificationFilter]);

  return (
    <CreatorListContext.Provider
      value={{
        creatorData,
        setCreatorData,
        displayedCreators,
        setDisplayedCreators,
        creatorListTotal,
        setCreatorListTotal,
        maxFields,
        setMaxFields,
        sortOpen,
        setSortOpen,
        filterOpen,
        setFilterOpen,
        query,
        setQuery,
        sort,
        setSort,
        sortBy,
        setSortBy,
        verificationFilter,
        setVerificationFilter,
        loading,
        setLoading,
        initialLoading,
        setInitialLoading,
        forceUpdate,
        setForceUpdate,
      }}
    >
      {children}
    </CreatorListContext.Provider>
  );
};
