import "./detailpopup.css";
import { useEffect, useState, useContext, useRef } from 'react';
import { getVideoDetails } from "@/Repository/RemoteRepository";
import { RatingItem } from '@/components/cards';
import { RatingInput } from '@/components/common/selectors';
import { DifficultyContext } from "@/contexts/DifficultyContext";
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { ReferencesButton } from '@/components/common/buttons';
import { useNavigate } from 'react-router-dom';
import { ExternalLinkIcon, DownloadIcon } from '@/components/common/icons';
import { formatCreatorDisplay } from "@/components/misc/Utility";
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

export const DetailPopup = ({ 
  selectedRating, 
  setSelectedRating = () => {},
  setShowReferences = () => {},
  setRatings = () => {}, 
  user = null, 
  isSuperAdmin = false
}) => {
  const currentUser = user;
  const { t } = useTranslation('components');
  const tRating = (key) => t(`rating.detailPopup.${key}`) || key;

  const navigate = useNavigate();
  const { difficulties } = useContext(DifficultyContext);
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
    // Store original body style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Lock scrolling
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflow = originalStyle;
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
    return user && (user.isSuperAdmin || user.isRater);
  };

  const handleSaveChanges = async () => {
    if (!selectedRating || !hasUnsavedChanges) return;
  
    setIsSaving(true);
    setSaveError(null);
    setCommentError(false);

    try {
      if (pendingComment.length > 1000) {
        setCommentError(true);
        setSaveError(tRating('errors.commentLength'));
        setIsSaving(false);
        return;
      }

      if (isCommentRequired && !pendingComment.trim()) {
        setCommentError(true);
        setSaveError(tRating('errors.commentRequired'));
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
      console.error('[DetailPopup] Save failed:', error);
      setSaveError(error.message || tRating('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isAnimating) return; // Prevent closing during entry animation
    
    if (hasUnsavedChanges) {
      if (window.confirm(tRating('errors.unsavedChanges'))) {
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
      alert(tRating('errors.deleteFailed'));
    }
  };

  const canEditRatings = () => {
    return user && (user.isSuperAdmin || user.isRater);
  };

  const navigateToLevel = () => {
    window.open(`/levels/${selectedRating.level.id}`, '_blank');
  }

  const renderRatingsContent = (ratings, type) => (
    <div className={`other-ratings-section ${ratings.length === 0 ? 'empty' : ''}`}>
      {ratings.length > 0 ? (
        <div className="other-ratings-content">
          {ratings.map(({user, rating, comment, isCommunityRating}) => (
            <RatingItem
              key={user?.id}
              user={user}
              rating={rating}
              comment={comment}
              isSuperAdmin={isSuperAdmin}
              onDelete={handleDeleteRating}
            />
          ))}
        </div>
      ) : (
        <div className="no-ratings-message">
          {type === 'admin' ? tRating('labels.noAdminRatings') : tRating('labels.noCommunityRatings')}
        </div>
      )}
    </div>
  );

  const getSaveButtonText = () => {
    if (isSaving) return tRating('buttons.saving');
    if (!pendingRating && initialRating) return tRating('buttons.removeRating');
    return tRating('buttons.saveChanges');
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
      <div className="references-button-container">
        <ReferencesButton onClick={() => setShowReferences(true)} />
      </div>
      <div className={`rating-popup ${isExiting ? 'exiting' : ''}`} ref={popupRef}>
        <button 
          className="close-popup-btn"
          onClick={handleClose}
          aria-label={tRating('closeButton')}
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
          </div>
          
          <div className="popup-main-content-container">
            <div className="popup-main-content">
              <div className="video-container">
                <div className="video-aspect-ratio">
                  {isVideoLoading ? (
                    <div className="video-placeholder">
                      <div className="video-loading" />
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
                  <span className="detail-label">{tRating('labels.rerateNum')}</span>
                  <span className="detail-value">{selectedRating.level.rerateNum || selectedRating.requesterFR}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">{tRating('labels.currentDifficulty')}</span>
                  <img src={selectedRating.level.difficulty.icon} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.averageDifficulty ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{tRating('labels.averageRating')}</span>
                  <img src={selectedRating.averageDifficulty?.icon} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.communityDifficulty ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{tRating('labels.communityRating')}</span>
                  <img src={selectedRating.communityDifficulty?.icon} alt="" className="detail-value lv-icon" />
                </div>

              </div>
            </div>

            <div className="rating-section">
              <div className="rating-columns">
                {user && user.isRatingBanned ? (
                  <div className="rating-banned-message">
                    {tRating('messages.ratingBanned')}
                  </div>
                ) : user ? (
                  <div className="rating-field-group">
                    <div className="rating-field">
                      <label>{tRating('labels.yourRating')}</label>
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
                        {(pendingRating && difficulties?.find(d => d.name === pendingRating)) && 
                          <img src={difficulties?.find(d => d.name === pendingRating)?.icon} alt="" className="detail-value lv-icon" />}
                      </div>
                    </div>
                    <div className="rating-field">
                      <label>
                        {tRating('labels.yourComment')}
                        {isCommentRequired && <span className="required-mark" data-tooltip-id="required-tooltip" />}
                      </label>
                      <textarea
                        value={pendingComment}
                        onChange={(e) => setPendingComment(e.target.value)}
                        style={{
                          borderColor: commentError ? 'red' : '',
                          backgroundColor: isCommentRequired && commentError ? 'rgba(255, 0, 0, 0.05)' : ''
                        }}
                        placeholder={tRating('placeholders.communityComment')}
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
                      {showSecondRatings ? tRating('labels.communityRatings') : tRating('labels.adminRatings')}
                    </label>
                    <button 
                      className={`ratings-toggle-btn ${showSecondRatings ? 'show-second' : ''}`}
                      onClick={() => setShowSecondRatings(!showSecondRatings)}
                    >
                      <span>
                        {showSecondRatings ? tRating('buttons.viewAdminRatings') : tRating('buttons.viewCommunityRatings')}
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
