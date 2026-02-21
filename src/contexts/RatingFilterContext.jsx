import { createContext, useContext, useState, useEffect } from 'react';

const RatingFilterContext = createContext();

export const useRatingFilter = () => {
  const context = useContext(RatingFilterContext);
  if (!context) {
    throw new Error('useRatingFilter must be used within a RatingFilterProvider');
  }
  return context;
};

const STORAGE_KEYS = {
  SORT_ORDER: 'rating_sort_order',
  HIDE_RATED: 'rating_hide_rated',
  LOW_DIFF_FILTER: 'rating_low_diff_filter',
  FOUR_VOTE_FILTER: 'rating_four_vote_filter',
  SORT_TYPE: 'rating_sort_type',
  SEARCH_QUERY: 'rating_search_query',
  DETAILED_VIEW: 'rating_detailed_view',
  SHOW_REFERENCES: 'rating_show_references',
  SHOW_RATER_MANAGEMENT: 'rating_show_rater_management',
  SHOW_HELP: 'rating_show_help'
};

export const RatingFilterProvider = ({ children }) => {
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_ORDER) || 'ASC');
  const [hideRated, setHideRated] = useState(() => localStorage.getItem(STORAGE_KEYS.HIDE_RATED) === 'true');
  const [lowDiffFilter, setLowDiffFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.LOW_DIFF_FILTER) || 'show');
  const [fourVoteFilter, setFourVoteFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.FOUR_VOTE_FILTER) || 'show');
  const [sortType, setSortType] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_TYPE) || 'ratings');
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '');
  const [showDetailedView, setShowDetailedView] = useState(() => localStorage.getItem(STORAGE_KEYS.DETAILED_VIEW) === 'true');
  const [showReferences, setShowReferences] = useState(() => localStorage.getItem(STORAGE_KEYS.SHOW_REFERENCES) === 'true');
  const [showRaterManagement, setShowRaterManagement] = useState(() => localStorage.getItem(STORAGE_KEYS.SHOW_RATER_MANAGEMENT) === 'true');
  const [showHelpPopup, setShowHelpPopup] = useState(() => localStorage.getItem(STORAGE_KEYS.SHOW_HELP) === 'true');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_ORDER, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIDE_RATED, hideRated);
  }, [hideRated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOW_DIFF_FILTER, lowDiffFilter);
  }, [lowDiffFilter]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOUR_VOTE_FILTER, fourVoteFilter);
  }, [fourVoteFilter]);

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
    localStorage.setItem(STORAGE_KEYS.SHOW_REFERENCES, showReferences);
  }, [showReferences]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_RATER_MANAGEMENT, showRaterManagement);
  }, [showRaterManagement]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_HELP, showHelpPopup);
  }, [showHelpPopup]);

  const value = {
    sortOrder,
    hideRated,
    lowDiffFilter,
    fourVoteFilter,
    sortType,
    searchQuery,
    showDetailedView,
    showReferences,
    showRaterManagement,
    showHelpPopup,
    setSortOrder,
    setHideRated,
    setLowDiffFilter,
    setFourVoteFilter,
    setSortType,
    setSearchQuery,
    setShowDetailedView,
    setShowReferences,
    setShowRaterManagement,
    setShowHelpPopup
  };

  return (
    <RatingFilterContext.Provider value={value}>
      {children}
    </RatingFilterContext.Provider>
  );
}; 