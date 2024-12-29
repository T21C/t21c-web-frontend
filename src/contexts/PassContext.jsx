import React, { createContext, useState } from 'react';

export const PassContext = createContext();

export const PassContextProvider = ({ children }) => {
  const [passesData, setPassesData] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('RECENT_DESC');
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [hide12k, setHide12k] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState('hide');
  const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState("P1");
  const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState("U20");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [sliderRange, setSliderRange] = useState([1, 60]);

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
        hide12k,
        setHide12k,
        deletedFilter,
        setDeletedFilter,
        selectedLowFilterDiff,
        setSelectedLowFilterDiff,
        selectedHighFilterDiff,
        setSelectedHighFilterDiff,
        forceUpdate,
        setForceUpdate,
        sliderRange,
        setSliderRange
      }}
    >
      {children}
    </PassContext.Provider>
  );
}; 