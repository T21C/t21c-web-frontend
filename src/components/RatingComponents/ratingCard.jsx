import './ratingcard.css';
import { calculateRatingValue } from '../Misc/Utility';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const trimString = (str, maxLength = 40) => {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
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

    const userRating = rating.details?.find(detail => detail.username === user.username)?.rating || "";
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

    return (
      <div className="rating-card">
        <div className="rating-card-content">
          <div className="rating-card-header">
            <h3 title={fullTitle}>
              <span className="song-title">{songTitle}</span>
              <span className="title-separator"> - </span>
              <span className="song-creator">{creator}</span>
            </h3>
            <p className="artist">{rating.level.artist}</p>
          </div>
          
          <div className="rating-card-details">
            <div className="rating-info-grid">
              <p className="rating-info-item" data-label={tRating('labels.yourRating')}>
                {userRating}
              </p>
              
              {isSuperAdmin && showDetailedView ? (
                <p className="rating-info-item" data-label={tRating('labels.allRatings')}>
                  {processedRatings.join(', ')}
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
            {user && isSuperAdmin && (
              <button 
                onClick={onEditLevel} 
                className="edit-level-btn"
              >
                {tRating('buttons.editLevel')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
};