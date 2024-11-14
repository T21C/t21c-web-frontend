import { useState } from 'react';
export const RatingItem = ({ username, rating, comment }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div 
        className={`other-rating-item ${isExpanded ? 'expanded' : ''}`}
        onClick={() => comment && setIsExpanded(!isExpanded)}
      >
        <div className="rating-item-header">
          <span className="rater-name">{username}:</span>
          <span className="rater-rating">{rating}</span>
          {comment && (
            <div className="comment-icon">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
        {comment && (
          <div className={`rating-comment ${!isExpanded ? 'hidden' : ''}`}>{comment}</div>
        )}
      </div>
    );
  };