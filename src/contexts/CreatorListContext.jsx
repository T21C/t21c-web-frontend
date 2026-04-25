import React, { createContext, useState, useEffect } from 'react';

const STORAGE_KEYS = {
  SORT_OPEN: 'creator_sort_open',
  QUERY: 'creator_query',
  SORT: 'creator_sort',
  SORT_BY: 'creator_sort_by',
};

export const CreatorListContext = createContext(null);

export const CreatorListContextProvider = ({ children }) => {
  const [creatorData, setCreatorData] = useState([]);
  const [displayedCreators, setDisplayedCreators] = useState([]);
  const [maxFields, setMaxFields] = useState({});
  const [sortOpen, setSortOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_OPEN) === 'true');
  const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT) || 'DESC');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_BY) || 'chartsTotal');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_OPEN, sortOpen);
  }, [sortOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUERY, query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT, sort);
  }, [sort]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  return (
    <CreatorListContext.Provider
      value={{
        creatorData,
        setCreatorData,
        displayedCreators,
        setDisplayedCreators,
        maxFields,
        setMaxFields,
        sortOpen,
        setSortOpen,
        query,
        setQuery,
        sort,
        setSort,
        sortBy,
        setSortBy,
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
