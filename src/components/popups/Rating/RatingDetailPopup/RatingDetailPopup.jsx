import "./ratingdetailpopup.css";
import { useEffect, useState, useRef } from 'react';
import { getVideoDetails } from "@/utils";
import { RatingItem } from '@/components/cards';
import { RatingInput } from '@/components/common/selectors';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { ReferencesButton } from '@/components/common/buttons';
import { ExternalLinkIcon, DownloadIcon } from '@/components/common/icons';
import { formatCreatorDisplay } from "@/utils/Utility";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { hasAnyFlag, hasFlag, permissionFlags } from "@/utils/UserPermissions";
// Cache for video data
const videoCache = new Map();


async function updateRating(id, rating, comment, isCommunityRating = false) {
  try {
    const response = await api.put(`${import.meta.env.VITE_RATING_API}/${id}`, {
      rating,
      comment,
      isCommunityRating
    });

    if (!response.data.rating) {
      throw new Error('Failed to update rating');
    }

    return response.data.rating;
  } catch (error) {
    console.error('Error updating rating:', error);
    throw error;
  }
}

export const RatingDetailPopup = ({ 
  selectedRating, 
  setSelectedRating = () => {},
  setShowReferences = () => {},
  setRatings = () => {}, 
  user = null, 
  isSuperAdmin = false,
  enableReferences = true,
  showingConfirmed=false,
  weeklyRaterActivity = []
}) => {
  const currentUser = user;
  const { t } = useTranslation(['components', 'common']);

  const { difficulties, difficultyDict } = useDifficultyContext();
  const [videoData, setVideoData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingRating, setPendingRating] = useState("");
  const [pendingComment, setPendingComment] = useState("");
  const [initialRating, setInitialRating] = useState("");
  const [initialComment, setInitialComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [otherRatings, setOtherRatings] = useState([]);
  const [commentError, setCommentError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCommentRequired, setIsCommentRequired] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSecondRatings, setShowSecondRatings] = useState(false);

  const popupRef = useRef(null);

  useEffect(() => {    
    // Lock scrolling
    document.body.style.overflowY = 'hidden';

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflowY = '';
    };
  }, []); // Empty dependency array since we only want this on mount/unmount

  useEffect(() => {
    if (selectedRating) {
      setIsExiting(false);
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400); // Match the animation duration

      // Handle back button
      const handlePopState = (event) => {
        event.preventDefault();
        handleClose();
      };

      window.history.pushState({ popup: true }, '');
      window.addEventListener('popstate', handlePopState);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [selectedRating]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !isAnimating) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [hasUnsavedChanges, isAnimating]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isAnimating) return; // Prevent closing during animations
      
      if (popupRef.current && 
          !popupRef.current.contains(event.target) && 
          event.target.classList.contains('rating-popup-overlay') &&
          !event.target.closest('.references-popup') &&
          !event.target.closest('.references-button')) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hasUnsavedChanges, isAnimating]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (selectedRating?.level?.videoLink) {
      setIsVideoLoading(true);
      
      // Check if video data is already cached
      const cachedData = videoCache.get(selectedRating.level.videoLink);
      if (cachedData) {
        setVideoData(cachedData);
        setIsVideoLoading(false);
        return;
      }

      // If not cached, fetch and cache the data
      getVideoDetails(selectedRating.level.videoLink)
        .then(data => {
          videoCache.set(selectedRating.level.videoLink, data);
          setVideoData(data);
        })
        .catch(error => console.error('Error fetching video details:', error))
        .finally(() => {
          setIsVideoLoading(false);
        });
    }
  }, [selectedRating?.level?.videoLink]);

  useEffect(() => {
    const handleEscKey = (event) =>  {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (selectedRating) {
      const userDetail = selectedRating.details?.find(detail => detail.userId === currentUser?.id);
      const rating = userDetail?.rating || "";
      const comment = userDetail?.comment || "";
      
      if (isInitialLoad) {
        setPendingRating(rating);
        setPendingComment(comment);
        setIsInitialLoad(false);
      }
      
      setInitialRating(rating);
      setInitialComment(comment);
      validateRating(rating);
      
      setHasUnsavedChanges(false);
      setOtherRatings(selectedRating.details || []);
    }
  }, [selectedRating, currentUser?.id, selectedRating?.details]);

  useEffect(() => {
    const hasValidChanges = Boolean(
      (initialRating !== "" && pendingRating === "")
      ||
      (
        pendingRating !== "" && pendingComment !== ""
        &&
        (
          initialRating !== pendingRating
          ||
          initialComment !== pendingComment
        )
      )
    );
    
    setHasUnsavedChanges(hasValidChanges);
  }, [pendingRating, pendingComment, initialRating, initialComment]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check for Ctrl+Enter
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isSaving && ((hasUnsavedChanges && (!isCommentRequired || pendingComment.trim())) || (!pendingRating && initialRating))) {
          handleSaveChanges();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [hasUnsavedChanges, isSaving, pendingRating, pendingComment, isCommentRequired, initialRating]);

  const validateRating = (rating) => {
      setIsCommentRequired(true);
      return true;
    /*
    if (!rating) {
      setIsCommentRequired(false);
      return true;
    }

    // Handle bare -2 case first
    if (rating.trim() === '-2') {
      setIsCommentRequired(true);
      return true;
    }

    // Find the first separator and split only once
    const match = rating.match(/^([^-~\s]+)([-~\s])(.+)$/);
    if (!match) {
      setIsCommentRequired(false);
      return true;
    }

    const [_, firstPart, separator, secondPart] = match;
    const parts = [firstPart, secondPart];
    
    // Check if any part is exactly "-2"
    const containsMinusTwo = parts.some(part => {
      // Exclude cases like -21 or other negative numbers
      if (part.startsWith('-') && part !== '-2') {
        return false;
      }
      const isMinusTwo = part === '-2';
      return isMinusTwo;
    });

    setIsCommentRequired(containsMinusTwo);
    return true;
    */
  };

  // Split ratings into admin and community
  const adminRatings = otherRatings.filter(r => !r.isCommunityRating);
  const communityRatings = otherRatings.filter(r => r.isCommunityRating);

  const isAdminRater = () => {
    return user && (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER]));
  };

  const handleSaveChanges = async () => {
    if (!selectedRating || !hasUnsavedChanges) return;
  
    setIsSaving(true);
    setSaveError(null);
    setCommentError(false);

    try {
      if (pendingComment.length > 1000) {
        setCommentError(true);
        setSaveError(t('rating.detailPopup.errors.commentLength'));
        setIsSaving(false);
        return;
      }

      if (isCommentRequired && !pendingComment.trim()) {
        setCommentError(true);
        setSaveError(t('rating.detailPopup.errors.commentRequired'));
        setIsSaving(false);
        return;
      }

      const isCommunityRating = !isAdminRater();
      const updatedRating = await updateRating(selectedRating.id, pendingRating, pendingComment, isCommunityRating);

      // If rating is empty or whitespace, also clear the comment
      if (!pendingRating || pendingRating.trim() === '') {
        setPendingComment('');
      }

      setRatings(prevRatings => prevRatings.map(rating => 
        rating.id === updatedRating.id ? updatedRating : rating
      ));

      setSelectedRating(prev => ({
        ...prev,
        details: updatedRating.details,
        averageDifficulty: updatedRating.averageDifficulty,
        communityDifficulty: updatedRating.communityDifficulty
      }));
      
      setOtherRatings(updatedRating.details || []);
      setInitialRating(pendingRating);
      setInitialComment(!pendingRating || pendingRating.trim() === '' ? '' : pendingComment);
      setHasUnsavedChanges(false);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('[RatingDetailPopup] Save failed:', error);
      setSaveError(error.response?.data?.error || error.response?.data?.message || error.message || error.error || t('rating.detailPopup.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isAnimating) return; // Prevent closing during entry animation
    
    if (hasUnsavedChanges) {
      if (window.confirm(t('rating.detailPopup.errors.unsavedChanges'))) {
        initiateClose();
      }
    } else {
      initiateClose();
    }
  };

  const initiateClose = () => {
    setIsExiting(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      setSelectedRating(null);
      setVideoData(null);
      setPendingRating("");
      setPendingComment("");
      setInitialRating("");
      setInitialComment("");
      setHasUnsavedChanges(false);
      setSaveError(null);
      setCommentError(false);
      setOtherRatings([]);
      setIsExiting(false);
      setIsInitialLoad(true); // Reset initial load state when closing
    }, 200); // Match the exit animation duration
  };

  const handleVideoLoad = () => {
    const iframe = document.querySelector('.video-iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
  };

  const handleDeleteRating = async (userId) => {
    try {
      const response = await api.delete(`${import.meta.env.VITE_RATING_API}/${selectedRating.id}/detail/${userId}`);
      
      if (response.status === 200) {
        // Update the local state
        const updatedDetails = otherRatings.filter(detail => detail.userId !== userId);
        setOtherRatings(updatedDetails);
        
        // Update the ratings context
        setRatings(prevRatings => prevRatings.map(rating => {
          if (rating.id === selectedRating.id) {
            return {
              ...rating,
              details: rating.details.filter(detail => detail.userId !== userId)
            };
          }
          return rating;
        }));
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      alert(t('rating.detailPopup.errors.deleteFailed'));
    }
  };

  const navigateToLevel = () => {
    window.open(`/levels/${selectedRating.level.id}`, '_blank');
  }

  const renderRatingsContent = (ratings, type) => (
    <div className={`other-ratings-section ${ratings.length === 0 ? 'empty' : ''}`}>
      {ratings.length > 0 ? (
        <div className="other-ratings-content">
          {ratings.map((ratingDetail) => (
            <RatingItem
              key={ratingDetail.id || ratingDetail.userId || ratingDetail.user?.id}
              ratingDetail={ratingDetail}
              isSuperAdmin={isSuperAdmin}
              onDelete={handleDeleteRating}
              weeklyRaterActivity={weeklyRaterActivity}
            />
          ))}
        </div>
      ) : (
        <div className="no-ratings-message">
          {type === 'admin' ? t('rating.detailPopup.labels.noAdminRatings') : t('rating.detailPopup.labels.noCommunityRatings')}
        </div>
      )}
    </div>
  );

  const getSaveButtonText = () => {
    if (isSaving) return t('buttons.saving', { ns: 'common' });
    if (!pendingRating && initialRating) return t('rating.detailPopup.buttons.removeRating');
    return t('rating.detailPopup.buttons.saveChanges');
  };

  const getSaveButtonClass = () => {
    const baseClass = 'save-rating-changes-btn';
    if (isSaving) return `${baseClass} saving`;
    if (!pendingRating && initialRating) return `${baseClass} remove`;
    return baseClass;
  };

  if (!selectedRating) return null;
  return (
    <div className={`rating-popup-overlay ${isExiting ? 'exiting' : ''}`}>
      {enableReferences && (
        <div className="references-button-container">
          <ReferencesButton onClick={() => setShowReferences(true)} />
        </div>
      )}
      <div className={`rating-popup ${isExiting ? 'exiting' : ''}`} ref={popupRef}>
        <button 
          className="close-popup-btn"
          onClick={handleClose}
          aria-label={t('rating.detailPopup.closeButton')}
        >
          <svg 
            width="24" 
            height="24" 
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
        </button>
        <div className="popup-content">
          <div className="popup-header">
            <div className="top-header-content">
              <h2 onClick={navigateToLevel}>{selectedRating.level.song} <ExternalLinkIcon /></h2>
              {selectedRating.level.dlLink && (
              <a 
                href={selectedRating.level.dlLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="download-link"
              >
                <DownloadIcon color="#ffffff" size={"24px"} strokeWidth={"2.5"} />
              </a>
            )}
            </div>

            <p className="artist">{selectedRating.level.artist}</p>
            <span className="creator">{formatCreatorDisplay(selectedRating.level)}</span>
            <div className="level-id-cleared-count-container">
            <span className="level-id">#{selectedRating.level.id}</span>
            <span className="cleared-count">
              {t('rating.detailPopup.labels.clearedCount', { count: selectedRating.level.clears || 0 })}
            </span>
            </div>
          </div>
          
          <div className="popup-main-content-container">
            <div className="popup-main-content">
              <div className="video-container">
                <div className="video-aspect-ratio">
                  {isVideoLoading ? (
                    <div className="video-placeholder">
                      <div className="spinner spinner-xlarge video-loading" />
                    </div>
                  ) : !videoData ? (
                    <div className="video-placeholder">
                      No video available
                    </div>
                  ) : (
                    <iframe 
                      src={videoData.embed}
                      title="Video"
                      className="video-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={handleVideoLoad}
                    />
                  )}
                  
                  <button 
                      className={`toggle-details-btn ${isDetailsCollapsed ? 'collapsed' : ''}`}
                      onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                      aria-label={isDetailsCollapsed ? 'Show details' : 'Hide details'}
                    >
                    <span>{isDetailsCollapsed ? 'Show' : 'Hide'} Details</span>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`details-container ${isDetailsCollapsed ? 'collapsed' : ''}`}>
                <div className="detail-field rerate-field">
                  <span className="detail-label">{t('rating.detailPopup.labels.rerateNum')}</span>
                  <span className="detail-value">{showingConfirmed ? selectedRating.requesterFR : (selectedRating.level.rerateNum || selectedRating.requesterFR)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">{t('rating.detailPopup.labels.currentDifficulty')}</span>
                  <img src={difficultyDict[selectedRating.level.diffId]?.icon} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.averageDifficultyId ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{t('rating.detailPopup.labels.averageRating')}</span>
                  <img src={difficultyDict[selectedRating.averageDifficultyId]?.icon} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.communityDifficultyId ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{t('rating.detailPopup.labels.communityRating')}</span>
                  <img src={difficultyDict[selectedRating.communityDifficultyId]?.icon} alt="" className="detail-value lv-icon" />
                </div>

              </div>
            </div>

            <div className="rating-section">
              <div className="rating-columns">
                {hasFlag(user, permissionFlags.RATING_BANNED) ? (
                  <div className="rating-banned-message">
                    {t('rating.detailPopup.messages.ratingBanned')}
                  </div>
                ) : user ? (
                  <div className="rating-field-group">
                    <div className="rating-field">
                      <label>{t('rating.detailPopup.labels.yourRating')}</label>
                      <div className="rating-input-container">
                        <RatingInput
                          value={pendingRating}
                          onChange={(value) => {
                            setPendingRating(value);
                            validateRating(value);
                          }}
                          showDiff={false}
                          difficulties={difficulties}
                          allowCustomInput={true}
                        />
                        {(pendingRating && difficulties.find(d => d.name === pendingRating)) && 
                          <img src={difficulties.find(d => d.name === pendingRating)?.icon} alt="" className="detail-value lv-icon" />}
                      </div>
                    </div>
                    <div className="rating-field">
                      <label>
                        {t('rating.detailPopup.labels.yourComment')}
                        {isCommentRequired && <span className="required-mark" data-tooltip-id="required-tooltip" />}
                      </label>
                      <textarea
                        value={pendingComment}
                        onChange={(e) => setPendingComment(e.target.value)}
                        style={{
                          borderColor: commentError ? 'red' : '',
                          backgroundColor: isCommentRequired && commentError ? 'rgba(255, 0, 0, 0.05)' : ''
                        }}
                        placeholder={t('rating.detailPopup.placeholders.communityComment')}
                      />
                    </div>
                    <div className="save-button-container">
                      <button 
                        className={getSaveButtonClass()}
                        disabled={
                          (
                            !hasUnsavedChanges 
                            || 
                            isSaving 
                            || 
                            (
                              isCommentRequired 
                              && 
                              !pendingComment.trim()
                            )
                          )
                          ^
                          (!pendingRating && initialRating)
                        }
                        onClick={handleSaveChanges}
                      >
                        {getSaveButtonText()}
                      </button>
                    </div>
                    {saveError && (
                      <div className="save-error-message">
                        {saveError}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="rating-field other-ratings">
                  <div className="other-ratings-header">
                    <label className="rating-field-label">
                      {showSecondRatings ? t('rating.detailPopup.labels.communityRatings') : t('rating.detailPopup.labels.adminRatings')}
                    </label>
                    <button 
                      className={`ratings-toggle-btn ${showSecondRatings ? 'show-second' : ''}`}
                      onClick={() => setShowSecondRatings(!showSecondRatings)}
                    >
                      <span>
                        {showSecondRatings ? t('rating.detailPopup.buttons.viewAdminRatings') : t('rating.detailPopup.buttons.viewCommunityRatings')}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="other-ratings-container">
                    <div className={`other-ratings-slider ${showSecondRatings ? 'show-second' : ''}`}>
                      {renderRatingsContent(adminRatings, 'admin')}
                      {renderRatingsContent(communityRatings, 'community')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
