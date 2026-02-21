import React, { createContext, useState, useEffect } from 'react';

const STORAGE_KEYS = {
  FILTER_OPEN: 'player_filter_open',
  SORT_OPEN: 'player_sort_open',
  QUERY: 'player_query',
  SORT: 'player_sort',
  SORT_BY: 'player_sort_by',
  SHOW_BANNED: 'player_show_banned',
  FILTERS: 'player_filters',
  COUNTRY: 'player_country',
};

export const PlayerContext = createContext();

export const PlayerContextProvider = ({ children }) => {
  const [playerData, setPlayerData] = useState([]);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [maxFields, setMaxFields] = useState({});
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [filterOpen, setFilterOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.FILTER_OPEN) === 'true');
  const [sortOpen, setSortOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_OPEN) === 'true');
  const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT) || 'DESC');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_BY) || 'rankedScore');
  const [showBanned, setShowBanned] = useState(() => localStorage.getItem(STORAGE_KEYS.SHOW_BANNED) || 'hide');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [country, setCountry] = useState(() => localStorage.getItem(STORAGE_KEYS.COUNTRY) || '');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTER_OPEN, filterOpen);
  }, [filterOpen]);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_BANNED, showBanned);
  }, [showBanned]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COUNTRY, country);
  }, [country]);

  return (
    <PlayerContext.Provider
      value={{
        playerData,
        setPlayerData,
        displayedPlayers,
        setDisplayedPlayers,
        filterOpen,
        setFilterOpen,
        sortOpen,
        setSortOpen,
        query,
        setQuery,
        sort,
        setSort,
        sortBy,
        setSortBy,
        showBanned,
        setShowBanned,
        loading,
        setLoading,
        initialLoading,
        setInitialLoading,
        forceUpdate,
        setForceUpdate,
        maxFields,
        setMaxFields,
        filters,
        setFilters,
        country,
        setCountry
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
