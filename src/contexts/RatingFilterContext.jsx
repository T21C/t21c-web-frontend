import { createContext, useContext, useState } from 'react';

const RatingFilterContext = createContext();

export const useRatingFilter = () => {
  const context = useContext(RatingFilterContext);
  if (!context) {
    throw new Error('useRatingFilter must be used within a RatingFilterProvider');
  }
  return context;
};

export const RatingFilterProvider = ({ children }) => {
  const [sortOrder, setSortOrder] = useState('ASC');
  const [hideRated, setHideRated] = useState(false);
  const [lowDiffFilter, setLowDiffFilter] = useState('show');
  const [fourVoteFilter, setFourVoteFilter] = useState('show');
  const [sortType, setSortType] = useState('id');

  const value = {
    sortOrder,
    hideRated,
    lowDiffFilter,
    fourVoteFilter,
    sortType,
    setSortOrder,
    setHideRated,
    setLowDiffFilter,
    setFourVoteFilter,
    setSortType
  };

  return (
    <RatingFilterContext.Provider value={value}>
      {children}
    </RatingFilterContext.Provider>
  );
}; 