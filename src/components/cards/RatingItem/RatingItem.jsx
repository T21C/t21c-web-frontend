import './ratingitem.css';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { CommentFormatter } from '@/components/misc';
import { UserAvatar } from '@/components/layout';
import { CrownIcon } from '@/components/common/icons';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';

export const RatingItem = ({ ratingDetail, isSuperAdmin, onDelete, weeklyRaterActivity = [] }) => {
    // Accept full rating detail object and extract fields from it
    const { rating, comment, createdAt, user, userId, isCommunityRating } = ratingDetail || {};
    
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation('components');
    
    // Find user's weekly activity
    const userActivity = weeklyRaterActivity.find(rater => rater.userId === (user?.id || userId));
    const averagePerDay = userActivity?.averagePerDay || 0;
    
    // Determine visual indicators based on average per day
    const hasCircleOrnament = averagePerDay >= 5;
    const hasCrown = averagePerDay >= 15;
    
    const handleDelete = (e) => {
      e.stopPropagation();
      if (window.confirm(t('rating.detailPopup.confirmations.deleteRating', {username: user?.username || user?.nickname}))) {
          onDelete(user?.id || userId);
      }
    };

    return (
      <div className="rating-item-container">
        <div 
          className={`other-rating-item ${isExpanded ? 'expanded' : ''}`}
          onClick={() => comment && setIsExpanded(!isExpanded)}
        >
          <div className="rating-item-header">
            <div className="rater-avatar-container">
              <UserAvatar
                primaryUrl={user?.avatarUrl}
                fallbackUrl={user?.pfp}
                className="rater-avatar"
              />
              {hasCircleOrnament && (
                <div className="circle-ornament"></div>
              )}
              {hasCrown && (
                <div className="crown-ornament-container">
                  <CrownIcon className="crown-ornament" size="24px" />
                </div>
              )}
            </div>
            <span className="rater-name">{user?.username || user?.nickname}:</span>
            <span className="rater-rating">{rating || ''}</span>
            {createdAt && (
              <span className="rating-date">{formatDate(createdAt, i18next?.language)}</span>
            )}
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
                    {t('rating.ratingCard.tooltips.deleteRating')}
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