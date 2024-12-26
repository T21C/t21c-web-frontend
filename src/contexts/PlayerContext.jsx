import React, { createContext, useState } from 'react';

export const PlayerContext = createContext();

export const PlayerContextProvider = ({ children }) => {
  const [playerData, setPlayerData] = useState([]);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('DESC');
  const [sortBy, setSortBy] = useState('rankedScore');
  const [showBanned, setShowBanned] = useState('hide');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);

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
