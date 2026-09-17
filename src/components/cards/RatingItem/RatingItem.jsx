// tuf-search: #RatingItem #ratingItem #cards
import './ratingitem.css';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { CommentFormatter } from '@/components/misc';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { CrownIcon } from '@/components/common/icons';
import { Collapsible, CollapsibleContent } from '@/components/common/Collapsible';
import { formatDate } from '@/utils/Utility';
import { formatViewDuration } from '@/utils/viewDurationTracker';
import {
  RATING_ACCURACY_PROVISIONAL_N,
  formatAccuracyScore,
  accuracyModeLabel,
  accuracyMappingLabel,
} from '@/utils/ratingAccuracy';
import { RatingAccuracyKernelChart } from '@/components/common/display/RatingAccuracyKernelChart/RatingAccuracyKernelChart';
import i18next from 'i18next';

export const RatingItem = ({
  ratingDetail,
  isSuperAdmin,
  onDelete,
  weeklyRaterActivity = [],
  career = null,
  showingConfirmed = false,
}) => {
    // Accept full rating detail object and extract fields from it
    const { rating, comment, createdAt, user, userId, isCommunityRating, ratedInZen, viewDurationSeconds } = ratingDetail || {};
    
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

    const viewedSeconds = Math.max(0, Math.floor(Number(viewDurationSeconds) || 0));
    const viewedFormatted = viewedSeconds > 0 ? formatViewDuration(viewedSeconds) : null;
    const viewedForLabel =
      viewedFormatted?.mode === 'seconds'
        ? t('rating.detailPopup.viewedForSeconds', {
            count: viewedFormatted.count,
            defaultValue: 'Viewed for {{count}} seconds',
          })
        : viewedFormatted?.mode === 'clock'
          ? t('rating.detailPopup.viewedFor', {
              duration: viewedFormatted.duration,
              defaultValue: 'Viewed for {{duration}}',
            })
          : null;

    const sample = ratingDetail?.accuracySample || null;
    const pguN = career?.pguN ?? 0;
    const isProvisional = pguN < RATING_ACCURACY_PROVISIONAL_N;
    const canExpand = Boolean(comment) || (showingConfirmed && sample);

    return (
      <div className="rating-item-container">
        <div 
          className={`other-rating-item ${isExpanded ? 'expanded' : ''}`}
          onClick={() => canExpand && setIsExpanded(!isExpanded)}
        >
          <div className="rating-item-header">
            <div className="rater-avatar-container">
              <UserAvatar
                {...userAvatarUrls(user)}
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
            <div className="rater-identity">
              <div className="rater-identity-main">
                <span className="rater-name">{user?.username || user?.nickname}:</span>
                {rating ? <span className="rater-rating">{rating}</span> : null}
                {ratedInZen && (
                  <span className="zen-mode-chip">
                    <span className="zen-mode-chip-text">
                      {t('rating.detailPopup.zenModeChip')}
                    </span>
                  </span>
                )}
              </div>
              {career && (
                <div className="rater-accuracy">
                  <span className={`rater-accuracy-career ${isProvisional ? 'is-provisional' : ''}`}>
                    {formatAccuracyScore(career.pguRawMean)} · {pguN}
                    {isProvisional && (
                      <span className="rater-accuracy-provisional">
                        {t('rating.detailPopup.accuracy.provisional', { defaultValue: 'provisional' })}
                      </span>
                    )}
                  </span>
                  {career.specialN > 0 && (
                    <span className="rater-accuracy-special">
                      {t('rating.detailPopup.accuracy.specialCareer', {
                        score: formatAccuracyScore(career.specialRawMean),
                        n: career.specialN,
                        defaultValue: 'special {{score}} · {{n}}',
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
            {(createdAt || viewedSeconds > 0) && (
              <div className="rating-item-timestamps">
                {createdAt && (
                  <span className="rating-date">{formatDate(createdAt, i18next?.language)}</span>
                )}
                {viewedForLabel && (
                  <span className="rating-viewed-for">{viewedForLabel}</span>
                )}
              </div>
            )}
            <div className="rating-item-icons">
              {(comment || (showingConfirmed && sample)) && (
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
              {isSuperAdmin && !showingConfirmed && (
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
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded} duration="0.3s" easing="ease">
              <CollapsibleContent>
            <div className="rating-comment">
              <CommentFormatter>{comment}</CommentFormatter>
            </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {showingConfirmed && sample && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded} duration="0.3s" easing="ease">
              <CollapsibleContent>
                <div className="rating-accuracy-explain">
                  <span className="rating-accuracy-explain__chip">
                    {accuracyModeLabel(sample, t)}
                  </span>
                  <span className="rating-accuracy-explain__map">
                    {accuracyMappingLabel(sample, t)}
                  </span>
                  <span className="rating-accuracy-explain__score">
                    {t('rating.detailPopup.accuracy.thisChart', {
                      score: formatAccuracyScore(sample.score),
                      defaultValue: 'This chart {{score}}',
                    })}
                  </span>
                  <RatingAccuracyKernelChart chart={sample.chart} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    );
  };