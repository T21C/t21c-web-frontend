import './ratingcard.css';
import { calculateRatingValue } from '../Misc/Utility';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const trimString = (str, maxLength = 40) => {
  if (!str) return '';
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
    const tRating = (key) => t(`rating.ratingCard.${key}`);
    const [isEditing, setIsEditing] = useState(false);

    const userRating = rating.details?.find(detail => detail.userId === user?.id)?.rating || "";
    const processedRatings = rating.details
        .map(({rating}) => calculateRatingValue(rating))
        .filter(rating => rating !== null);
        
    const rerateValue = rating.level.rerateNum || rating.requesterFR;
    const rerateReason = rating.level.rerateReason;
    const songTitle = trimString(rating.level.song, 50);
    const creator = trimString(rating.level.creator, 30);
    const fullTitle = `${rating.level.song} - ${rating.level.creator}`;
    const [isReasonExpanded, setIsReasonExpanded] = useState(false);
    
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
          rating.details.length >= 4 ? 'four-rated' : 
          rating.lowDiff ? 'low-diff' : ''}`}
      >
        <div className="rating-card-content">
          <div className="rating-card-header">
            <div className="header-content">
              <h3 title={fullTitle}>
                <span className="song-title">{songTitle}</span>
                <span className="title-separator"> - </span>
                <span className="song-creator">{creator}</span>
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
            <div className="rating-info-grid">
              <p className="rating-info-item" data-label={tRating('labels.yourRating')}>
                {userRating}
              </p>
              
              {user?.isSuperAdmin && showDetailedView ? (
                <p className="rating-info-item" data-label={tRating('labels.allRatings')}>
                  {rating.details.map(detail => detail.rating).join(', ')}
                </p>
              ) : (
                <>
                  <p className="rating-info-item" data-label={tRating('labels.average')}>
                    {rating.averageDifficulty ? rating.averageDifficulty.name : ''}
                  </p>
                </>
              )}
              {(rerateValue || rerateReason) && (
                <>
                  <p className="rating-info-item" data-label={tRating(`labels.${rating.level.rerateNum ? 'rerateNumber' : 'requestedRating'}`)}>
                    {rerateValue}
                  </p>
                  <div 
                    className={`rating-info-item rerate-reason ${isReasonExpanded ? 'expanded' : ''}`}
                    data-label={tRating('labels.rerateMessage')}
                    onClick={handleReasonClick}
                    title={tRating('tooltips.expandReason')}
                  > 
                    <div className="reason-content">
                      {rerateReason}
                    </div>  
                    {rerateReason && <div className="expand-indicator"></div>}
                  </div>
                </>
              )}
            </div>
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