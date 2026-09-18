// tuf-search: #TopRatersPopup #topRatersPopup #popups #rating #topRaters
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PopupShell } from '@/components/common/PopupShell';
import './topraterspopup.css';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { CrownIcon } from '@/components/common/icons';
import { CloseButton } from '@/components/common/buttons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/common/Collapsible';
import { CustomSelect } from '@/components/common/selectors';
import { Portal } from '@/components/common/Portal';
import { Tooltip } from 'react-tooltip';
import {
  formatAccuracyScore,
  RATING_ACCURACY_PROVISIONAL_N,
} from '@/utils/ratingAccuracy';

const accuracyTooltipId = (userId) => `top-rater-accuracy-${userId}`;

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

  const hasCircleOrnament = averagePerDay >= 5;
  const hasCrown = averagePerDay >= 15;
  const pguN = Number(rater.pguN) || 0;
  const specialN = Number(rater.specialN) || 0;
  const isProvisional = pguN < RATING_ACCURACY_PROVISIONAL_N;
  const accuracyValue = pguN > 0
    ? formatAccuracyScore(rater.pguRawMean)
    : formatAccuracyScore(null);

  return (
    <div className={`top-rater-entry ${hasCrown ? 'top-performer' : ''}`}>
      <div className="rater-rank">#{rank}</div>
      <div className="rater-info">
        <div className="avatar-container">
          <UserAvatar 
            {...userAvatarUrls(rater)}
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
            {rater.nickname || t('topRaters.raterEntry.unknown')}
          </span>
          <span className="internal-username">@{rater.username}</span>
        </div>
      </div>
      <div className="rater-stats">
        <div
          className={`rater-accuracy${pguN > 0 ? ' has-value' : ''}${isProvisional && pguN > 0 ? ' is-provisional' : ''}`}
          data-tooltip-id={accuracyTooltipId(rater.userId)}
        >
          <span className="stat-label">{t('topRaters.raterEntry.stats.accuracy')}</span>
          <span className="stat-value">{accuracyValue}</span>
          {isProvisional && pguN > 0 && (
            <span className="rater-accuracy-provisional">
              {t('rating.detailPopup.accuracy.provisional', { defaultValue: 'provisional' })}
            </span>
          )}
          {specialN > 0 && (
            <span className="rater-accuracy-special">
              {t('topRaters.raterEntry.stats.special', {
                score: formatAccuracyScore(rater.specialRawMean),
                defaultValue: 'special {{score}}',
              })}
            </span>
          )}
        </div>
        <div className={`total-ratings ${hasCircleOrnament ? 'high-value' : ''}`}>
          <span className="stat-label">{t('topRaters.stats.totalRatings')}</span>
          <span className="stat-value">{formatNumber(rater.ratingCount)}</span>
        </div>
        <div className={`average-per-day ${hasCircleOrnament ? 'high-value' : ''}`}>
          <span className="stat-label">{t('topRaters.raterEntry.stats.averagePerDay')}</span>
          <span className="stat-value">{formatAverage(averagePerDay)}</span>
        </div>
      </div>
    </div>
  );
};

const TopRaterAccuracyTooltip = ({ rater }) => {
  const { t } = useTranslation('components');
  const pguN = Number(rater.pguN) || 0;
  const specialN = Number(rater.specialN) || 0;
  const isProvisional = pguN > 0 && pguN < RATING_ACCURACY_PROVISIONAL_N;

  return (
    <Tooltip
      id={accuracyTooltipId(rater.userId)}
      place="top"
      noArrow
      positionStrategy="fixed"
      opacity={1}
      className="top-raters-accuracy-tooltip"
    >
      <div className="top-raters-accuracy-tooltip-body">
        {pguN > 0 ? (
          <>
            <span>
              {t('topRaters.raterEntry.tooltip.raw', {
                score: formatAccuracyScore(rater.pguRawMean),
                n: pguN,
                defaultValue: 'Raw {{score}} · {{n}}',
              })}
            </span>
            <span>
              {t('topRaters.raterEntry.tooltip.weighted', {
                score: formatAccuracyScore(rater.pguShrunkMean),
                defaultValue: 'Weighted {{score}} (ranking)',
              })}
            </span>
            {isProvisional && (
              <span>
                {t('topRaters.raterEntry.tooltip.provisional', {
                  min: RATING_ACCURACY_PROVISIONAL_N,
                  defaultValue: 'Provisional — under {{min}} scored charts',
                })}
              </span>
            )}
          </>
        ) : (
          <span>
            {t('topRaters.raterEntry.tooltip.empty', {
              defaultValue: 'No scored PGU charts',
            })}
          </span>
        )}
        {specialN > 0 && (
          <span>
            {t('topRaters.raterEntry.tooltip.special', {
              score: formatAccuracyScore(rater.specialRawMean),
              n: specialN,
              defaultValue: 'Special {{score}} · {{n}}',
            })}
          </span>
        )}
      </div>
    </Tooltip>
  );
};

const TopRatersPopup = ({ onClose }) => {
  const { t } = useTranslation(['components', 'common']);

  const [topRaters, setTopRaters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortType, setSortType] = useState('accuracy');
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
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

  const sortOptions = useMemo(() => [
    { value: 'accuracy', label: t('topRaters.sort.accuracy') },
    { value: 'count', label: t('topRaters.sort.count') },
  ], [t]);

  const selectedSortOption = useMemo(
    () => sortOptions.find((option) => option.value === sortType),
    [sortOptions, sortType]
  );

  const fetchTopRaters = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await api.get(routes.admin.statisticsRatingsPerUser(), {
        params: {
          startDate: selectedStartDate,
          endDate: selectedEndDate,
          page,
          limit: 20,
          sort: sortType,
        },
      });
      
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

      setTopRaters(ratingsPerUser || []);

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
  }, [selectedStartDate, selectedEndDate, sortType]);

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
    <>
      <PopupShell
        onClose={onClose}
        overlayClassName="top-raters-overlay"
        panelClassName="top-raters-popup"
      >
        <div className="popup-header">
          <h2>{t('topRaters.title')}</h2>
          <CloseButton
            variant="inline"
            onClick={onClose}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
        </div>

        <Collapsible
          defaultOpen
          duration="0.3s"
          className="filters-collapsible"
        >
          <div className="filters-collapsible-header">
            <CollapsibleTrigger
              preset="chevron"
              className="filters-collapsible-trigger"
              aria-label={t('topRaters.filters.title')}
            />
          </div>
          <CollapsibleContent>
            <div className="filters-collapsible-body">
              <div className="date-selection">
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label htmlFor="start-date-selector">{t('topRaters.dateSelector.startDate')}</label>
                    <input
                      id="start-date-selector"
                      type="date"
                      value={selectedStartDate}
                      onChange={handleStartDateChange}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label htmlFor="end-date-selector">{t('topRaters.dateSelector.endDate')}</label>
                    <input
                      id="end-date-selector"
                      type="date"
                      value={selectedEndDate}
                      onChange={handleEndDateChange}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group sort-input-group">
                    <label htmlFor="top-raters-sort">{t('topRaters.sort.label')}</label>
                    <CustomSelect
                      inputId="top-raters-sort"
                      options={sortOptions}
                      value={selectedSortOption}
                      onChange={(option) => {
                        if (option?.value) setSortType(option.value);
                      }}
                      width="12rem"
                      menuPlacement="bottom"
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="overall-stats">
                <div className="stat-item">
                  <span className="stat-label">{t('topRaters.stats.totalUsers')}</span>
                  <span className="stat-value">{formatNumber(overallStats.totalUsers)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">{t('topRaters.stats.averageRatingsPerDay')}</span>
                  <span className="stat-value">{formatAverage(overallStats.averageRatingsPerDay)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">{t('topRaters.stats.totalRatings')}</span>
                  <span className="stat-value">{formatNumber(overallStats.totalRatings)}</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="raters-list">
          {isLoading ? (
            <div className="loading">{t('topRaters.loading')}</div>
          ) : topRaters.length === 0 ? (
            <div className="no-raters">{t('topRaters.noRaters')}</div>
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
              {t('topRaters.pagination.previous')}
            </button>
            <span className="pagination-info">
              {t('topRaters.pagination.pageInfo', { 
                current: pagination.currentPage, 
                total: pagination.totalPages 
              })}
            </span>
            <button 
              className="pagination-button"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              {t('topRaters.pagination.next')}
            </button>
          </div>
        )}

        <div className="legend">
          <div className="legend-item" style={{ paddingLeft: '24px'}}>
            <div className="legend-icon circle-ornament"></div>
            <span>{t('topRaters.legend.circleOrnament')}</span>
          </div>
          <div className="legend-item">
            <CrownIcon className="crown-ornament" size="20px" />
            <span>{t('topRaters.legend.crownOrnament')}</span>
          </div>
        </div>

      {errorMessage && (
        <div className="error-message-container">
          <p className="error-text">{errorMessage}</p>
          <button className="close-error" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}
      </PopupShell>
      <Portal mount="documentBody">
        {topRaters.map((rater) => (
          <TopRaterAccuracyTooltip key={rater.userId} rater={rater} />
        ))}
      </Portal>
    </>
  );
};

const raterAccuracyShape = {
  userId: PropTypes.string,
  username: PropTypes.string,
  nickname: PropTypes.string,
  avatarUrl: PropTypes.string,
  ratingCount: PropTypes.number,
  pguRawMean: PropTypes.number,
  pguN: PropTypes.number,
  pguShrunkMean: PropTypes.number,
  specialRawMean: PropTypes.number,
  specialN: PropTypes.number,
};

TopRaterEntry.propTypes = {
  rater: PropTypes.shape(raterAccuracyShape).isRequired,
  rank: PropTypes.number.isRequired,
  averagePerDay: PropTypes.number.isRequired,
};

TopRaterAccuracyTooltip.propTypes = {
  rater: PropTypes.shape(raterAccuracyShape).isRequired,
};

TopRatersPopup.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default TopRatersPopup;
