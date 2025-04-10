import React, { createContext, useState, useEffect } from 'react';
import { useDifficultyContext } from './DifficultyContext';
export const PassContext = createContext();

export const PassContextProvider = ({ children }) => {

  const { difficulties } = useDifficultyContext();

  useEffect(() => {
    setSliderRange([1, difficulties.find(d => d.name === "U20")?.sortOrder || 60]);
  }, [difficulties]);

  const [passesData, setPassesData] = useState(null);
  const [filterOpen, setFilterOpen] = useState(true);
  const [sortOpen, setSortOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('RECENT_DESC');
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [deletedFilter, setDeletedFilter] = useState('hide');
  const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState("P1");
  const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState("U20");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [sliderRange, setSliderRange] = useState([1, 60]);
  const [keyFlag, setKeyFlag] = useState('all'); // 'all' for any flag, '12k' for 12k only, '16k' for 16k only

  return (
    <PassContext.Provider
      value={{
        passesData,
        setPassesData,
        filterOpen,
        setFilterOpen,
        sortOpen,
        setSortOpen,
        query,
        setQuery,
        sort,
        setSort,
        hasMore,
        setHasMore,
        pageNumber,
        setPageNumber,
        deletedFilter,
        setDeletedFilter,
        selectedLowFilterDiff,
        setSelectedLowFilterDiff,
        selectedHighFilterDiff,
        setSelectedHighFilterDiff,
        forceUpdate,
        setForceUpdate,
        sliderRange,
        setSliderRange,
        keyFlag,
        setKeyFlag
      }}
    >
      {children}
    </PassContext.Provider>
  );
}; 