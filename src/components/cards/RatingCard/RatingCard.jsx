import { LinkIcon } from '@/components/common/icons/LinkIcon';
import './ratingcard.css';
import { calculateRatingValue, formatCreatorDisplay, formatDate } from '@/utils/Utility';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import i18next from 'i18next';
import { getSongDisplayName } from '@/utils/levelHelpers';

const trimString = (str, maxLength = 40) => {
  if (!str || typeof str !== 'string') return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
};

export const RatingCard = ({ 
  rating, 
  index, 
  setSelectedRating, 
  user, 
  showDetailedView,
  onEditLevel 
}) => {
    const { t } = useTranslation('components');
    const [isEditing, setIsEditing] = useState(false);
    const [isReasonExpanded, setIsReasonExpanded] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const isVote = /^vote/i.test(rating.level.rerateNum);
    const userRating = rating.details?.find(detail => detail.userId === user?.id)?.rating || "";
    // Calculate averages
    const managerRatings = 
    trimString(
      rating.details
        .filter(detail => !detail.isCommunityRating)
        .map(({rating}) => calculateRatingValue(rating))
        .filter(rating => rating !== null && rating !== "")
        .join(', '),
      35);
    
    const communityRatings = 
    trimString(
        rating.details
          .filter(detail => detail.isCommunityRating)
          .map(({rating}) => calculateRatingValue(rating, true))
          .filter(rating => rating !== null && rating !== "")
          .join(', '),
      25);
        
    const rerateValue = rating.level.rerateNum || rating.requesterFR;
    const rerateReason = rating.level.rerateReason;
    const songTitle = trimString(getSongDisplayName(rating.level), 50);
    const fullTitle = `${getSongDisplayName(rating.level)} - ${rating.level.creator}`;
    
    const handleReasonClick = () => {
      setIsReasonExpanded(!isReasonExpanded);
    };

    const handleEditClick = async () => {
      setIsEditing(true);
      try {
        await onEditLevel();
      } finally {
        setIsEditing(false);
      }
    };

    const handleCopyLink = async () => {
      const url = `${window.location.origin}${window.location.pathname}#${rating.level.id}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    };

    return (
      <div
        className={`rating-card ${
          rating.details.filter(detail => !detail.isCommunityRating).length >= 4 || isVote ? 'four-rated' : 
          rating.lowDiff ? 'low-diff' : ''}`}
      >
        {isVote && (
          <div className="vote-tag">
            <span>VOTE</span>
          </div>
        )}
        <div className="rating-card-content">
          <div className="rating-card-header">
            <div className="header-content">
              <h3 title={fullTitle}>
                <span className="song-title">{songTitle}</span>
                <span className="title-separator"> - </span>
                <span className="song-creator">{rating.level.artist}</span>
              </h3>
              <p className="artist">{formatCreatorDisplay(rating.level)}</p>
            </div>
            <div className="header-meta">
              <span 
                className="updated-at" 
                title={t('rating.ratingCard.tooltips.lastUpdated')}
              >
                {t('rating.ratingCard.labels.updatedAt')} {formatDate(rating.updatedAt, i18next?.language)}
              </span>
              <span className="level-id">
                #{rating.level.id}
              </span>
              <br />
              <span className="cleared-count">
                {t('rating.ratingCard.labels.clearedCount', { count: rating.level.clears || 0 })}
              </span>
            </div>
          </div>
          
          <div className="rating-card-details">
            {/* Top row - Rating averages */}
            {!showDetailedView && (rating.communityDifficulty || rating.averageDifficulty || userRating) && (
              <div className="rating-info-grid top-row" >
                <div className="rating-info-item" data-label={t('rating.ratingCard.labels.yourRating')}>
                  <div className="content">{userRating}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.managerAverage')}>
                <div className="content">{rating.averageDifficulty?.name}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.communityAverage')}>
                  <div className="content">{rating.communityDifficulty?.name}</div>
                </div>
              </div>
            )}

            {showDetailedView && (rating.communityDifficulty || rating.averageDifficulty || userRating) && (
              <div className="rating-info-grid top-row" >
                <div className="rating-info-item" data-label={t('rating.ratingCard.labels.yourRating')}>
                  <div className="content">{userRating}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.managerRatings')}>
                <div className="content">{managerRatings}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.communityRatings')}>
                  <div className="content">{communityRatings}</div>
                </div>
              </div>
            )}

            {/* Bottom row - Rerate info */}
            {(rerateValue || rerateReason) && (
              <div className={`rating-info-grid ${!rerateReason ? 'full-width' : 'bottom-row'}`}>
                {rerateValue && (
                  <div 
                    className="rating-info-item" 
                    data-label={tRating(`labels.${rating.level.rerateNum ? 'rerateNumber' : 'requestedRating'}`)}
                  >
                    <div className="content">{rerateValue}</div>
                  </div>
                )}
                {rerateReason && (
                  <div 
                    className={`rating-info-item rerate-reason ${isReasonExpanded ? 'expanded' : ''} ${!rerateValue ? 'full-width' : ''}`}
                    data-label={t('rating.ratingCard.labels.rerateMessage')}
                    onClick={handleReasonClick}
                    title={t('rating.ratingCard.tooltips.expandReason')}
                  > 
                    <div className="reason-content">
                      {rerateReason}
                    </div>  
                    <div className="expand-indicator"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rating-card-actions">
            <button 
              onClick={() => setSelectedRating(rating)} 
              className="view-details-btn"
            >
              {t('rating.ratingCard.buttons.viewDetails')}
            </button>
            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <button 
                onClick={handleEditClick} 
                className={`edit-level-btn ${isEditing ? 'loading' : ''}`}
                disabled={isEditing}
              >
                {isEditing ? (
                  <svg className="spinner spinner-svg" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                ) : (
                  t('rating.ratingCard.buttons.editLevel')
                )}
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className={`copy-link-btn ${copySuccess ? 'success' : ''}`}
              title={t('rating.ratingCard.tooltips.copyLink')}
            >
              {copySuccess ? t('rating.ratingCard.buttons.copied') : t('rating.ratingCard.buttons.copyLink')}
              <LinkIcon size={20} color={copySuccess ? "#4CAF50" : "#ccc"} />
            </button>
          </div>
        </div>
      </div>
    );
};