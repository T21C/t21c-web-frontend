// tuf-search: #RatingCard #ratingCard #cards
import { LinkIcon } from '@/components/common/icons/LinkIcon';
import { DraftIcon } from '@/components/common/icons';
import './ratingcard.css';
import { calculateRatingValue, formatCreatorDisplay, formatDate } from '@/utils/Utility';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import i18next from 'i18next';
import { getSongDisplayName } from '@/utils/levelHelpers';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { CommentFormatter } from '@/components/misc';
import { hasRatingDraft } from '@/utils/ratingDrafts';
import { isVoteRatingCard } from '@/utils/ratingRequestBand';
import { RatingFlowActions, RatingFlowMarks } from './RatingFlowActions';
import { formatCurationPickLabel } from '@/utils/curationTypeFamilies';
import { CurationPickDisplay } from '@/components/popups/Rating/RatingDetailPopup/CurationRatingPicks';
import { RequestedCurationChanges } from '@/components/popups/Rating/RatingDetailPopup/RequestedCurationChanges';

const BAND_CLASS = {
  P: 'band-p',
  G: 'band-g',
  U: 'band-u',
  Impossible: 'band-impossible',
};

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
  onEditLevel,
  onSettleCuration,
  onFlowChange,
  mode = 'difficulty',
}) => {
    const { t } = useTranslation('components');
    const [isEditing, setIsEditing] = useState(false);
    const [isReasonExpanded, setIsReasonExpanded] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const isCurationMode = mode === 'curation';
    const canSettleCuration = isCurationMode && hasAnyFlag(user, [
      permissionFlags.CURATOR,
      permissionFlags.HEAD_CURATOR,
      permissionFlags.SUPER_ADMIN,
    ]);
    const isVote = isCurationMode ? Boolean(rating?.isDiscordVote) : isVoteRatingCard(rating);
    const { difficultyDict, curationTypesDict } = useDifficultyContext();
    const userDetail = rating.details?.find(detail => detail.userId === user?.id);
    const userRating = isCurationMode
      ? formatCurationPickLabel(userDetail, curationTypesDict)
      : (userDetail?.rating || "");
    const hasDraft = !isCurationMode && Boolean(user?.id && rating?.id && hasRatingDraft(user.id, rating.id));
    // Calculate averages
    const managerRatings = 
    trimString(
      (rating.details || [])
        .filter(detail => !detail.isCommunityRating)
        .map(({rating}) => calculateRatingValue(rating))
        .filter(rating => rating !== null && rating !== "")
        .join(', '),
      35);
    
    const communityRatings = 
    trimString(
        (rating.details || [])
          .filter(detail => detail.isCommunityRating)
          .map(({rating}) => calculateRatingValue(rating, true))
          .filter(rating => rating !== null && rating !== "")
          .join(', '),
      25);
        
    const rerateValue = isCurationMode
      ? rating.level.curationRerateNum
      : (rating.level.rerateNum || rating.requesterFR);
    const rerateReason = isCurationMode
      ? rating.level.curationRerateReason
      : rating.level.rerateReason;
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
      const url = `${window.location.origin}${isCurationMode ? '/admin/curations/rating' : '/rating'}/${rating.level.id}`;
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
        className={`rating-card ${!isCurationMode && BAND_CLASS[rating.cardBand] ? BAND_CLASS[rating.cardBand] : ''}`}
      >
        {isVote && (
          <div className="vote-tag">
            <span>VOTE</span>
          </div>
        )}
        <div className="rating-card-content">
          {!isCurationMode && <RatingFlowMarks rating={rating} />}
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
            {isCurationMode && (userRating || rating.averageChartTypeId || rating.averageVfxTypeId || (showDetailedView && (rating.details || []).length > 0)) && (
              <div className="rating-info-grid top-row">
                <div className="rating-info-item" data-label={t('rating.ratingCard.labels.yourRating')}>
                  <div className="content">
                    <CurationPickDisplay detail={userDetail} curationTypesDict={curationTypesDict} />
                    {!userDetail && userRating}
                  </div>
                </div>
                <div className="rating-info-item" data-label={t('rating.ratingCard.labels.average')}>
                  <div className="content">
                    <CurationPickDisplay
                      detail={{
                        chartTypeId: rating.averageChartTypeId,
                        vfxTypeId: rating.averageVfxTypeId,
                      }}
                      curationTypesDict={curationTypesDict}
                    />
                  </div>
                </div>
                {showDetailedView && (
                  <div className="rating-info-item" data-label={t('rating.detailPopup.curation.otherPicks')}>
                    <div className="content">
                      {(rating.details || []).map((detail) => (
                        <CurationPickDisplay
                          key={detail.id || detail.userId}
                          detail={detail}
                          curationTypesDict={curationTypesDict}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!isCurationMode && !showDetailedView && (rating.communityDifficultyId || rating.averageDifficulty || userRating) && (
              <div className="rating-info-grid top-row" >
                <div className="rating-info-item" data-label={t('rating.ratingCard.labels.yourRating')}>
                  <div className="content">{userRating}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.managerAverage')}>
                <div className="content">{difficultyDict[rating.averageDifficultyId]?.name}</div>
              </div>
              <div className="rating-info-item" data-label={t('rating.ratingCard.labels.communityAverage')}>
                  <div className="content">{difficultyDict[rating.communityDifficultyId]?.name}</div>
                </div>
              </div>
            )}

            {!isCurationMode && showDetailedView && (rating.communityDifficultyId || rating.averageDifficultyId || userRating) && (
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
                    data-label={t(`rating.ratingCard.labels.${(isCurationMode ? rating.level.curationRerateNum : rating.level.rerateNum) ? 'rerateNumber' : 'requestedRating'}`)}
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
                      <CommentFormatter>{rerateReason}</CommentFormatter>
                    </div>  
                    <div className="expand-indicator"></div>
                  </div>
                )}
              </div>
            )}
            {isCurationMode && (
              <RequestedCurationChanges requests={rating.curationRequests} compact />
            )}
          </div>

          {!isCurationMode && <RatingFlowActions rating={rating} user={user} onChange={onFlowChange} />}
          <div className="rating-card-actions">
            <button 
              onClick={() => setSelectedRating(rating)} 
              className={`view-details-btn${hasDraft ? ' has-draft' : ''}`}
            >
              {hasDraft && (
                <DraftIcon
                  size={16}
                  color="currentColor"
                  title={t('rating.ratingCard.tooltips.savedDraft')}
                />
              )}
              {t('rating.ratingCard.buttons.viewDetails')}
            </button>
            {canSettleCuration && !isVote && typeof onSettleCuration === 'function' && (
              <button
                type="button"
                className="edit-level-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onSettleCuration();
                }}
              >
                {t('rating.detailPopup.curation.settle')}
              </button>
            )}
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
            <div className="rating-card-actions__end">
              {!isCurationMode && <RatingFlowActions only="block" rating={rating} user={user} onChange={onFlowChange} />}
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
      </div>
    );
};