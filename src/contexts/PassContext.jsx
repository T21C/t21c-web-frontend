import React, { createContext, useState, useEffect } from 'react';
import { useDifficultyContext } from './DifficultyContext';
import Cookies from 'js-cookie';

export const PassContext = createContext();

export const PassContextProvider = ({ children }) => {
  const { difficulties } = useDifficultyContext();

  // Cookie keys
  const COOKIE_KEYS = {
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

  const [passesData, setPassesData] = useState(null);
  const [filterOpen, setFilterOpen] = useState(() => Cookies.get(COOKIE_KEYS.FILTER_OPEN) !== 'false');
  const [sortOpen, setSortOpen] = useState(() => Cookies.get(COOKIE_KEYS.SORT_OPEN) !== 'false');
  const [query, setQuery] = useState(() => Cookies.get(COOKIE_KEYS.QUERY) || '');
  const [sort, setSort] = useState(() => Cookies.get(COOKIE_KEYS.SORT) || 'RECENT_DESC');
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [deletedFilter, setDeletedFilter] = useState(() => Cookies.get(COOKIE_KEYS.DELETED_FILTER) || 'hide');
  const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(() => Cookies.get(COOKIE_KEYS.LOW_FILTER_DIFF) || "P1");
  const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(() => Cookies.get(COOKIE_KEYS.HIGH_FILTER_DIFF) || "U20");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [sliderRange, setSliderRange] = useState(() => {
    const saved = Cookies.get(COOKIE_KEYS.SLIDER_RANGE);
    return saved ? JSON.parse(saved) : [1, 61];
  });
  const [keyFlag, setKeyFlag] = useState(() => Cookies.get(COOKIE_KEYS.KEY_FLAG) || 'all');

  // Effect to validate and adjust ranges based on difficulties
  useEffect(() => {
    if (difficulties.length > 0) {
      const maxDifficulty = difficulties.find(d => d.name === "U20")?.sortOrder || 61;
      // Validate and adjust sliderRange if needed
      const currentRange = [...sliderRange];
      if (currentRange[0] < 1 || currentRange[1] > maxDifficulty) {
        const newRange = [1, maxDifficulty];
        setSliderRange(newRange);
        Cookies.set(COOKIE_KEYS.SLIDER_RANGE, JSON.stringify(newRange));
      }
    }
  }, [difficulties]);

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
    Cookies.set(COOKIE_KEYS.DELETED_FILTER, deletedFilter);
  }, [deletedFilter]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.LOW_FILTER_DIFF, selectedLowFilterDiff);
  }, [selectedLowFilterDiff]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.HIGH_FILTER_DIFF, selectedHighFilterDiff);
  }, [selectedHighFilterDiff]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.SLIDER_RANGE, JSON.stringify(sliderRange));
  }, [sliderRange]);

  useEffect(() => {
    Cookies.set(COOKIE_KEYS.KEY_FLAG, keyFlag);
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