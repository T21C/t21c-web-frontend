import './ratingcard.css';
import { calculateRatingValue, calculateAverageRating, formatCreatorDisplay } from '@/components/misc/Utility';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const trimString = (str, maxLength = 40) => {
  if (!str || typeof str !== 'string') return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString(undefined, { 
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return `${formattedDate} ${formattedTime}`;
};

export const RatingCard = ({ 
  rating, 
  index, 
  setSelectedRating, 
  user, 
  isSuperAdmin,
  showDetailedView,
  onEditLevel 
}) => {
    const { t } = useTranslation('components');
    const tRating = (key) => t(`rating.ratingCard.${key}`) || key;
    const [isEditing, setIsEditing] = useState(false);
    const [isReasonExpanded, setIsReasonExpanded] = useState(false);
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
    const songTitle = trimString(rating.level.song, 50);
    const creator = trimString(rating.level.creator, 30);
    const fullTitle = `${rating.level.song} - ${rating.level.creator}`;
    
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
                <span className="song-creator">{formatCreatorDisplay(rating.level)}</span>
              </h3>
              <p className="artist">{rating.level.artist}</p>
            </div>
            <div className="header-meta">
              <span 
                className="updated-at" 
                title={tRating('tooltips.lastUpdated')}
              >
                {tRating('labels.updatedAt')} {formatDate(rating.updatedAt)}
              </span>
              <span className="level-id">
                #{rating.level.id}
              </span>
            </div>
          </div>
          
          <div className="rating-card-details">
            {/* Top row - Rating averages */}
            {!showDetailedView && (rating.communityDifficulty || rating.averageDifficulty || userRating) && (
              <div className="rating-info-grid top-row" >
                <div className="rating-info-item" data-label={tRating('labels.yourRating')}>
                  <div className="content">{userRating}</div>
              </div>
              <div className="rating-info-item" data-label={tRating('labels.managerAverage')}>
                <div className="content">{rating.averageDifficulty?.name}</div>
              </div>
              <div className="rating-info-item" data-label={tRating('labels.communityAverage')}>
                  <div className="content">{rating.communityDifficulty?.name}</div>
                </div>
              </div>
            )}

            {showDetailedView && (rating.communityDifficulty || rating.averageDifficulty || userRating) && (
              <div className="rating-info-grid top-row" >
                <div className="rating-info-item" data-label={tRating('labels.yourRating')}>
                  <div className="content">{userRating}</div>
              </div>
              <div className="rating-info-item" data-label={tRating('labels.managerRatings')}>
                <div className="content">{managerRatings}</div>
              </div>
              <div className="rating-info-item" data-label={tRating('labels.communityRatings')}>
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
                    data-label={tRating('labels.rerateMessage')}
                    onClick={handleReasonClick}
                    title={tRating('tooltips.expandReason')}
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
              {tRating('buttons.viewDetails')}
            </button>
            {user && user?.isSuperAdmin && (
              <button 
                onClick={handleEditClick} 
                className={`edit-level-btn ${isEditing ? 'loading' : ''}`}
                disabled={isEditing}
              >
                {isEditing ? (
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                ) : (
                  tRating('buttons.editLevel')
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
};