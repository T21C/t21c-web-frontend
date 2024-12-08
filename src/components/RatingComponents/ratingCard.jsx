import './ratingcard.css';
import { calculateRatingValue } from '../Misc/Utility';
import { useState } from 'react';

const trimString = (str, maxLength = 40) => {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
};

export const RatingCard = ({ 
  rating, 
  index, 
  setSelectedRating, 
  raters, 
  user, 
  isSuperAdmin,
  showDetailedView,
  onEditChart 
}) => {
    const userRating = rating.ratingDetails?.find(detail => detail.username === user.username)?.rating || "";
    const processedRatings = rating.ratingDetails
        .map(({rating}) => calculateRatingValue(rating))
        .filter(rating => rating !== null);
        
    const rerateValue = rating.level.requesterFR || rating.level.rerateNum;
    const rerateReason = rating.level.rerateReason;
    // Format title with creator
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
              <p className="rating-info-item" data-label="Your Rating">
                {userRating}
              </p>
              
              {isSuperAdmin && showDetailedView ? (
                <p className="rating-info-item" data-label="All Ratings">
                  {processedRatings.join(', ')}
                </p>
              ) : (
                <>
                  <p className="rating-info-item" data-label="Average">
                    {rating.average}
                  </p>
                </>
              )}
              {(rerateValue || rerateReason) && (
                <>
                  <p className="rating-info-item" data-label="Rerate">
                    {rerateValue}
                  </p>
                  <div 
                    className={`rating-info-item rerate-reason ${isReasonExpanded ? 'expanded' : ''}`}
                    data-label="Rerate message"
                    onClick={handleReasonClick}
                    title="Click to expand"
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
              View Details
            </button>
            {user && isSuperAdmin && (
              <button 
                onClick={onEditChart} 
                className="edit-chart-btn"
              >
                Edit Chart
              </button>
            )}
          </div>
        </div>
      </div>
    );
};