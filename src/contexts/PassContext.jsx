import React, { createContext, useState, useEffect } from 'react';
import { useDifficultyContext } from './DifficultyContext';

const STORAGE_KEYS = {
  FILTER_OPEN: 'pass_filter_open',
  SORT_OPEN: 'pass_sort_open',
  QUERY: 'pass_query',
  SORT: 'pass_sort',
  DELETED_FILTER: 'pass_deleted_filter',
  LOW_FILTER_DIFF: 'pass_low_filter_diff',
  HIGH_FILTER_DIFF: 'pass_high_filter_diff',
  SLIDER_RANGE: 'pass_slider_range',
  KEY_FLAG: 'pass_key_flag'
};

export const PassContext = createContext();

export const PassContextProvider = ({ children }) => {
  const { noLegacyDifficulties: difficulties } = useDifficultyContext();

  const [passesData, setPassesData] = useState(null);
  const [filterOpen, setFilterOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.FILTER_OPEN) !== 'false');
  const [sortOpen, setSortOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_OPEN) !== 'false');
  const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT) || 'RECENT_DESC');
  const [totalPasses, setTotalPasses] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [deletedFilter, setDeletedFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.DELETED_FILTER) || 'hide');
  const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(() => localStorage.getItem(STORAGE_KEYS.LOW_FILTER_DIFF) || "P1");
  const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(() => localStorage.getItem(STORAGE_KEYS.HIGH_FILTER_DIFF) || "U20");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [sliderRange, setSliderRange] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SLIDER_RANGE);
    return saved ? JSON.parse(saved) : [1, 9999];
  });
  const [keyFlag, setKeyFlag] = useState(() => localStorage.getItem(STORAGE_KEYS.KEY_FLAG) || 'all');

  useEffect(() => {
    if (difficulties.length > 0) {
      const maxDifficulty = difficulties.find(d => d.name === "U20")?.sortOrder || 60;
      const currentRange = [...sliderRange];
      if (currentRange[0] < 1 || currentRange[1] > maxDifficulty) {
        const newRange = [1, maxDifficulty];
        setSliderRange(newRange);
        localStorage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(newRange));
      }
    }
  }, [difficulties]);

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
    localStorage.setItem(STORAGE_KEYS.DELETED_FILTER, deletedFilter);
  }, [deletedFilter]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOW_FILTER_DIFF, selectedLowFilterDiff);
  }, [selectedLowFilterDiff]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIGH_FILTER_DIFF, selectedHighFilterDiff);
  }, [selectedHighFilterDiff]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(sliderRange));
  }, [sliderRange]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KEY_FLAG, keyFlag);
  }, [keyFlag]);

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
        totalPasses,
        setTotalPasses,
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