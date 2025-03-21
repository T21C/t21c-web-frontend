import './ratingitem.css';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import DefaultAvatar from '@/components/common/icons/DefaultAvatar';
import { CommentFormatter } from '@/components/misc';
import { UserAvatar } from '@/components/layout';
export const RatingItem = ({ user, rating, comment, isSuperAdmin, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation('components');
    const tRating = (key, params = {}) => t(`rating.ratingCard.${key}`, params) || key;
    
    const handleDelete = (e) => {
      e.stopPropagation();
      if (window.confirm(t('rating.detailPopup.confirmations.deleteRating', {username: user?.username}))) {
          onDelete(user?.id);
      }
    };

    return (
      <div className="rating-item-container">
        <div 
          className={`other-rating-item ${isExpanded ? 'expanded' : ''}`}
          onClick={() => comment && setIsExpanded(!isExpanded)}
        >
          <div className="rating-item-header">
            <UserAvatar
              primaryUrl={user?.avatarUrl}
              fallbackUrl={user?.pfp}
              className="rater-avatar"
            />
            <span className="rater-name">{user?.username}:</span>
            <span className="rater-rating">{rating}</span>
            <div className="rating-item-icons">
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
              {isSuperAdmin && (
                <div 
                  className="delete-icon"
                  onClick={handleDelete}
                  data-tooltip-id="delete-rating"
                >
                  <Tooltip id="delete-rating" place="top" noArrow>
                    {tRating('tooltips.deleteRating')}
                  </Tooltip>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M6 6L18 18M6 18L18 6" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
          {comment && (
            <div className={`rating-comment ${!isExpanded ? 'hidden' : ''}`}>
              <CommentFormatter>{comment}</CommentFormatter>
            </div>
          )}
        </div>
      </div>
    );
  };