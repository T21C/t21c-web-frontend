import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export const PlayerContext = createContext();

export const PlayerContextProvider = ({ children }) => {
  // Cookie keys
  const COOKIE_KEYS = {
    FILTER_OPEN: 'player_filter_open',
    SORT_OPEN: 'player_sort_open',
    QUERY: 'player_query',
    SORT: 'player_sort',
    SORT_BY: 'player_sort_by',
    SHOW_BANNED: 'player_show_banned'
  };

  const [playerData, setPlayerData] = useState([]);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [filterOpen, setFilterOpen] = useState(() => Cookies.get(COOKIE_KEYS.FILTER_OPEN) === 'true');
  const [sortOpen, setSortOpen] = useState(() => Cookies.get(COOKIE_KEYS.SORT_OPEN) === 'true');
  const [query, setQuery] = useState(() => Cookies.get(COOKIE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => Cookies.get(COOKIE_KEYS.SORT) || 'DESC');
  const [sortBy, setSortBy] = useState(() => Cookies.get(COOKIE_KEYS.SORT_BY) || 'rankedScore');
  const [showBanned, setShowBanned] = useState(() => Cookies.get(COOKIE_KEYS.SHOW_BANNED) || 'hide');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Effects to save state changes to cookies
  useEffect(() => {
    Cookies.set(COOKIE_KEYS.FILTER_OPEN, filterOpen);
  }, [filterOpen]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SORT_OPEN, sortOpen);
  }, [sortOpen]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.QUERY, query);
  }, [query]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SORT, sort);
  }, [sort]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SHOW_BANNED, showBanned);
  }, [showBanned]);

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
        setForceUpdate
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
