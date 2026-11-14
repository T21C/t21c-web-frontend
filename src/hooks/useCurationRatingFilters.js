// tuf-search: #useCurationRatingFilters #curationRating
import { useEffect, useState } from 'react';

const STORAGE_KEYS = {
  SORT_ORDER: 'curationRating_sort_order',
  MY_RATED: 'curationRating_my_rated',
  SORT_TYPE: 'curationRating_sort_type',
  SEARCH_QUERY: 'curationRating_search_query',
  DETAILED_VIEW: 'curationRating_detailed_view',
  FLOW: 'curationRating_flow',
};

const CURATION_FLOWS = ['recent', 'rerate', 'bulk'];

const MY_RATED_STATES = ['show', 'hide', 'only'];

function readMyRatedFilter() {
  const stored = localStorage.getItem(STORAGE_KEYS.MY_RATED);
  return MY_RATED_STATES.includes(stored) ? stored : 'show';
}

function readCurationFlow() {
  const stored = localStorage.getItem(STORAGE_KEYS.FLOW);
  return CURATION_FLOWS.includes(stored) ? stored : 'recent';
}

export function useCurationRatingFilters() {
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_ORDER) || 'ASC');
  const [myRatedFilter, setMyRatedFilter] = useState(readMyRatedFilter);
  const [sortType, setSortType] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_TYPE) || 'ratings');
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '');
  const [showDetailedView, setShowDetailedView] = useState(
    () => localStorage.getItem(STORAGE_KEYS.DETAILED_VIEW) === 'true',
  );
  const [ratingFlow, setRatingFlow] = useState(readCurationFlow);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_ORDER, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MY_RATED, myRatedFilter);
  }, [myRatedFilter]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_TYPE, sortType);
  }, [sortType]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DETAILED_VIEW, showDetailedView);
  }, [showDetailedView]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FLOW, ratingFlow);
  }, [ratingFlow]);

  return {
    sortOrder,
    setSortOrder,
    myRatedFilter,
    setMyRatedFilter,
    sortType,
    setSortType,
    searchQuery,
    setSearchQuery,
    showDetailedView,
    setShowDetailedView,
    ratingFlow,
    setRatingFlow,
  };
}
