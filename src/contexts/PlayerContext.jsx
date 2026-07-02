// tuf-search: #PlayerContext #playerContext
import React, { createContext, useState, useEffect } from 'react';

const STORAGE_KEYS = {
  FILTER_OPEN: 'player_filter_open',
  SORT_OPEN: 'player_sort_open',
  QUERY: 'player_query',
  SORT: 'player_sort',
  SORT_BY: 'player_sort_by',
  SHOW_BANNED: 'player_show_banned',
  FLAG_FILTER: 'player_flag_filter',
  FILTERS: 'player_filters',
  COUNTRY: 'player_country',
};

const VALID_FLAG_FIELDS = new Set(['isBanned', 'isSubmissionsPaused', 'isRatingBanned']);
const VALID_FLAG_MODES = new Set(['show', 'hide', 'only']);

function loadPlayerFlagFilter() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FLAG_FILTER);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        VALID_FLAG_FIELDS.has(parsed.field) &&
        VALID_FLAG_MODES.has(parsed.mode)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    // fall through to legacy migration
  }

  const legacyMode = localStorage.getItem(STORAGE_KEYS.SHOW_BANNED);
  return {
    field: 'isBanned',
    mode: VALID_FLAG_MODES.has(legacyMode) ? legacyMode : 'hide',
  };
}

export const PlayerContext = createContext();

export const PlayerContextProvider = ({ children }) => {
  /** `null` = leaderboard list never loaded (LeaderboardPage shows loader). */
  const [playerData, setPlayerData] = useState(null);
  const [displayedPlayers, setDisplayedPlayers] = useState(null);
  /** Last `count` from leaderboard API at offset 0; restores infinite-scroll `hasMore` when remounting without refetch. */
  const [leaderboardListTotal, setLeaderboardListTotal] = useState(null);
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
  const [playerFlagFilter, setPlayerFlagFilter] = useState(loadPlayerFlagFilter);
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
    localStorage.setItem(STORAGE_KEYS.FLAG_FILTER, JSON.stringify(playerFlagFilter));
  }, [playerFlagFilter]);

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
        leaderboardListTotal,
        setLeaderboardListTotal,
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
        playerFlagFilter,
        setPlayerFlagFilter,
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
