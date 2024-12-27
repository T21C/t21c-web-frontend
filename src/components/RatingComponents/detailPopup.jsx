import "./detailpopup.css";
import { useEffect, useState, useContext, useRef } from 'react';
import { getVideoDetails } from "@/Repository/RemoteRepository";
import { RatingItem } from './RatingItem';
import { validateFeelingRating } from '@/components/Misc/Utility';
import { RatingInput } from './RatingInput';
import { DifficultyContext } from "@/contexts/DifficultyContext";
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import ReferencesButton from "../ReferencesButton/ReferencesButton";

async function updateRating(id, rating, comment) {
  try {
    const response = await api.put(`${import.meta.env.VITE_RATING_API}/${id}`, {
      rating,
      comment
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
  setSelectedRating, 
  setShowReferences,
  ratings, 
  setRatings, 
  user, 
}) => {
  const { t } = useTranslation('components');
  const tRating = (key) => t(`rating.detailPopup.${key}`);

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

  const popupRef = useRef(null);

  useEffect(() => {
    if (selectedRating) {
      setIsExiting(false);
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400); // Match the animation duration
      return () => clearTimeout(timer);
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
      getVideoDetails(selectedRating.level.videoLink)
        .then(data => {
          setVideoData(data);
        })
        .catch(error => console.error('Error fetching video details:', error))
        .finally(() => {
          setIsVideoLoading(false);
        });
    }
  }, [selectedRating]);

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
      const userDetail = selectedRating.details?.find(detail => detail.username === user.username);
      const rating = userDetail?.rating || "";
      const comment = userDetail?.comment || "";
      
      setPendingRating(rating);
      setPendingComment(comment);
      setInitialRating(rating);
      setInitialComment(comment);
      
      setHasUnsavedChanges(false);
      setOtherRatings(selectedRating.details || []);
    }
  }, [selectedRating, user.username]);

  useEffect(() => {
    const hasChanges = pendingRating !== initialRating || pendingComment !== initialComment;
    setHasUnsavedChanges(hasChanges);
  }, [pendingRating, pendingComment, initialRating, initialComment]);

  const handleSaveChanges = async () => {
    if (!selectedRating || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    setSaveError(null);
    setCommentError(false);

    try {
      if (pendingComment && pendingComment.length > 1000) {
        setCommentError(true);
        setSaveError(tRating('errors.commentLength'));
        setIsSaving(false);
        return;
      }

      const updatedRating = await updateRating(selectedRating.id, pendingRating, pendingComment);

      setRatings(prevRatings => prevRatings.map(rating => 
        rating.id === updatedRating.id ? updatedRating : rating
      ));

      setSelectedRating(updatedRating);
      setOtherRatings(updatedRating.details || []);
      
      setInitialRating(pendingRating);
      setInitialComment(pendingComment);
      setHasUnsavedChanges(false);
    } catch (error) {
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
    }, 200); // Match the exit animation duration
  };

  const handleVideoLoad = () => {
    const iframe = document.querySelector('.video-iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
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
            <h2>{selectedRating.level.song}</h2>
            <p className="artist">{selectedRating.level.artist}</p>
          </div>
          
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
              </div>
            </div>

            <div className="details-container">
              <div className="detail-field">
                <span className="detail-label">{tRating('labels.creator')}</span>
                <span className="detail-value">{selectedRating.level.creator}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{tRating('labels.currentDifficulty')}</span>
                <img src={selectedRating.level.difficulty.icon} alt="" className="detail-value lv-icon" />
              </div>
              <div className="detail-field">
                <span className="detail-label">{tRating('labels.averageRating')}</span>
                <img src={selectedRating.averageDifficulty?.icon} alt="" className="detail-value lv-icon" />
              </div>
            </div>
          </div>

          <div className="rating-section">
            <div className="rating-columns">
              <div className="rating-field-group">
                <div className="rating-field">
                  <label>{tRating('labels.yourRating')}</label>
                  <div className="rating-input-container">
                    <RatingInput
                      value={pendingRating}
                      onChange={(value) => {
                        setPendingRating(value);
                      }}
                      showDiff={false}
                      difficulties={difficulties}
                      allowCustomInput={true}
                    />
                  {(pendingRating && difficulties?.find(d => d.name === pendingRating)) && <img src={difficulties?.find(d => d.name === pendingRating)?.icon} alt="" className="detail-value lv-icon" />}
                  </div>
                </div>
                <div className="rating-field">
                  <label>{tRating('labels.yourComment')}</label>
                  <textarea
                    value={pendingComment}
                    onChange={(e) => {
                      setPendingComment(e.target.value);
                      setCommentError(false);
                    }}
                    style={{ borderColor: commentError ? 'red' : '' }}
                  />
                </div>
                <button 
                  className={`save-rating-changes-btn ${isSaving ? 'saving' : ''}`}
                  disabled={!hasUnsavedChanges || isSaving}
                  onClick={handleSaveChanges}
                >
                  {isSaving ? tRating('buttons.saving') : tRating('buttons.saveChanges')}
                </button>
                {saveError && (
                  <div className="save-error-message">
                    {saveError}
                  </div>
                )}
              </div>
              <div className="rating-field other-ratings">
                <label>{tRating('labels.otherRatings')}</label>
                <div className="other-ratings-content">
                  {otherRatings.map(({username, rating, comment}) => (
                    <RatingItem 
                      key={username} 
                      username={username} 
                      rating={rating} 
                      comment={comment} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
