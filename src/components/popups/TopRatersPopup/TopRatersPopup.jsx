import React, { useState, useEffect, useCallback } from 'react';
import './topraterspopup.css';
import api from '@/utils/api';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/layout';
import { CrownIcon } from '@/components/common/icons';

  // Format numbers for better readability
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatAverage = (avg) => {
    return avg.toFixed(1);
  };

const TopRaterEntry = ({ rater, rank, averagePerDay }) => {
  const { t } = useTranslation('components');
  const tRater = (key, params) => t(`topRaters.raterEntry.${key}`, params);

  // Determine visual indicators based on average per day
  const hasCircleOrnament = averagePerDay >= 5;
  const hasCrown = averagePerDay >= 15;

  return (
    <div className={`top-rater-entry ${hasCrown ? 'top-performer' : ''}`}>
      <div className="rater-rank">#{rank}</div>
      <div className="rater-info">
        <div className="avatar-container">
          <UserAvatar 
            primaryUrl={rater.avatarUrl}
            fallbackUrl={rater.pfp}
          />
          {hasCircleOrnament && (
            <div className="circle-ornament"></div>
          )}
          {hasCrown && (
            <div className="crown-ornament-container">
              <CrownIcon className="crown-ornament" size="30px" />
            </div>
          )}
        </div>
        <div className="rater-text">
          <span className="rater-name">
            {rater.nickname || tRater('unknown')}
          </span>
          <span className="internal-username">@{rater.username}</span>
        </div>
      </div>
      <div className="rater-stats">
        <div className={`total-ratings ${hasCircleOrnament ? 'high-value' : ''}`}>
          <span className="stat-label">{tRater('stats.totalRatings')}</span>
          <span className="stat-value">{formatNumber(rater.ratingCount)}</span>
        </div>
        <div className={`average-per-day ${hasCircleOrnament ? 'high-value' : ''}`}>
          <span className="stat-label">{tRater('stats.averagePerDay')}</span>
          <span className="stat-value">{formatAverage(averagePerDay)}</span>
        </div>
      </div>
    </div>
  );
};

const TopRatersPopup = ({ onClose }) => {
  const { t } = useTranslation('components');
  const tRater = (key, params = {}) => t(`topRaters.${key}`, params) || key;

  const [topRaters, setTopRaters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    // Default to a week ago
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [overallStats, setOverallStats] = useState({
    totalUsers: 0,
    averageRatingsPerDay: 0,
    totalRatings: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  const handleClickOutside = useCallback((event) => {
    if (event.target.classList.contains('top-raters-overlay')) {
      onClose();
    }
  }, [onClose]);

  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // Store original body style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Lock scrolling
    document.body.style.overflowY = 'hidden';

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflowY = originalStyle;
    };
  }, []); // Empty dependency array since we only want this on mount/unmount


  useEffect(() => {
    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleClickOutside, handleEscapeKey]);

  const fetchTopRaters = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/v2/admin/statistics/ratings-per-user?startDate=${selectedStartDate}&endDate=${selectedEndDate}&page=${page}&limit=20`);
      
      const { 
        ratingsPerUser, 
        totalUsers, 
        totalRatings,
        averageRatingsPerDay,
        currentPage, 
        totalPages, 
        hasNextPage, 
        hasPrevPage 
      } = response.data;
      
      // Sort raters by average per day (already calculated by the API)
      const allRaters = ratingsPerUser
        .sort((a, b) => b.averagePerDay - a.averagePerDay);

      setTopRaters(allRaters);

      // Format numbers for better readability
      const formatNumber = (num) => {
        if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
      };

      const formatAverage = (avg) => {
        return avg.toFixed(1);
      };

      setOverallStats({
        totalUsers: totalUsers,
        averageRatingsPerDay: averageRatingsPerDay,
        totalRatings: totalRatings
      });

      setPagination({
        currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage
      });

    } catch (error) {
      console.error('Error fetching top raters:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to fetch top raters');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStartDate, selectedEndDate]);

  useEffect(() => {
    fetchTopRaters(1);
  }, [fetchTopRaters]);

  const handleStartDateChange = (e) => {
    setSelectedStartDate(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setSelectedEndDate(e.target.value);
  };

  const handlePageChange = (newPage) => {
    fetchTopRaters(newPage);
  };

  return (
    <div className="top-raters-overlay">
      <div className="top-raters-popup">
        <div className="popup-header">
          <h2>{tRater('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="date-selection">
          <div className="date-inputs">
            <div className="date-input-group">
              <label htmlFor="start-date-selector">{tRater('dateSelector.startDate')}</label>
              <input
                id="start-date-selector"
                type="date"
                value={selectedStartDate}
                onChange={handleStartDateChange}
                className="date-input"
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="end-date-selector">{tRater('dateSelector.endDate')}</label>
              <input
                id="end-date-selector"
                type="date"
                value={selectedEndDate}
                onChange={handleEndDateChange}
                className="date-input"
              />
            </div>
          </div>
        </div>

        <div className="overall-stats">
          <div className="stat-item">
            <span className="stat-label">{tRater('stats.totalUsers')}</span>
            <span className="stat-value">{formatNumber(overallStats.totalUsers)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{tRater('stats.averageRatingsPerDay')}</span>
            <span className="stat-value">{formatAverage(overallStats.averageRatingsPerDay)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{tRater('stats.totalRatings')}</span>
            <span className="stat-value">{formatNumber(overallStats.totalRatings)}</span>
          </div>
        </div>

        <div className="raters-list">
          {isLoading ? (
            <div className="loading">{tRater('loading')}</div>
          ) : topRaters.length === 0 ? (
            <div className="no-raters">{tRater('noRaters')}</div>
          ) : (
            topRaters.map((rater, index) => (
              <TopRaterEntry
                key={rater.userId}
                rater={rater}
                rank={(pagination.currentPage - 1) * 20 + index + 1}
                averagePerDay={rater.averagePerDay}
              />
            ))
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-button"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              {tRater('pagination.previous')}
            </button>
            <span className="pagination-info">
              {tRater('pagination.pageInfo', { 
                current: pagination.currentPage, 
                total: pagination.totalPages 
              })}
            </span>
            <button 
              className="pagination-button"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              {tRater('pagination.next')}
            </button>
          </div>
        )}

        <div className="legend">
          <div className="legend-item ">
            <div className="legend-icon circle-ornament"></div>
            <span>{tRater('legend.circleOrnament')}</span>
          </div>
          <div className="legend-item">
            <CrownIcon className="crown-ornament" size="20px" />
            <span>{tRater('legend.crownOrnament')}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="error-message-container">
          <p className="error-text">{errorMessage}</p>
          <button className="close-error" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}
    </div>
  );
};

TopRatersPopup.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default TopRatersPopup;
