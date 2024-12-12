import "./detailpopup.css";
import { useEffect, useState } from 'react';
import { getVideoDetails, inputDataRaw } from "@/Repository/RemoteRepository";
import { RatingItem } from './RatingItem';
import { validateFeelingRating } from '@/components/Misc/Utility';
import { RatingInput } from './RatingInput';
import api from '@/utils/api';

async function updateRating(id, rating, comment) {
  try {
    const response = await api.put(`${import.meta.env.VITE_RATING_API}`, {
      updates: [{
        id,
        rating,
        comment
      }]
    });

    if (!response.data.success) {
      throw new Error(`Failed to update rating ${JSON.stringify(response)}`);
    }

    const data = await response;
    return data;
  } catch (error) {
    console.error('Error updating rating:', error);
    throw error;
  }
}

export const DetailPopup = ({ 
  selectedRating, 
  setSelectedRating, 
  ratings, 
  setRatings, 
  user, 
}) => {
    const [videoData, setVideoData] = useState(null);
    const [diffMap, setDiffMap] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [pendingRating, setPendingRating] = useState("");
    const [pendingComment, setPendingComment] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [otherRatings, setOtherRatings] = useState([]);
    const [commentError, setCommentError] = useState(false);


  useEffect(() => {
    const fetchDiffMap = async () => {
      const res = await api.get(import.meta.env.VITE_DIFFICULTIES);
      setDiffMap(res.data);
    };
    fetchDiffMap();
  }, []);

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
            setPendingRating(selectedRating.details?.find(
              detail => detail.username === user.username)?.rating || "");
            setPendingComment(selectedRating.details?.find(
              detail => detail.username === user.username)?.comment || "");
            setHasUnsavedChanges(false);
            setOtherRatings(selectedRating.details);
        }
    }, [selectedRating]);

    useEffect(() => {
        const fetchVideoData = async () => {
            if (selectedRating) {
                const res = await getVideoDetails(selectedRating.level.vidLink);
                setVideoData(res);
            }
        };

        fetchVideoData();
    }, [selectedRating]);

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

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveError(null);
        setCommentError(false);

        if (pendingRating === "-2" && !pendingComment.trim()) {
            setCommentError(true);
            setIsSaving(false);
            return;
        }
        
        try {
            await updateRating(
                selectedRating.id,
                pendingRating,
                pendingComment,
                user.token
            );

            const newRatings = [...ratings];
            const ratingIndex = ratings.findIndex(r => r.ID === selectedRating.ID);
            if (!newRatings[ratingIndex].ratings) {
                newRatings[ratingIndex].ratings = {};
            }
            newRatings[ratingIndex].ratings[user.username] = [pendingRating, pendingComment];
            
            const ratingValues = Object.values(newRatings[ratingIndex].ratings)
                .map(r => r[0])
                .filter(r => r > 0);
            newRatings[ratingIndex].average = ratingValues.length > 0
                ? ratingValues.reduce((a, b) => Number(a) + Number(b), 0) / ratingValues.length
                : 0;
            
            setRatings(newRatings);
            setHasUnsavedChanges(false);
            setSaveError(null);
        } catch (error) {
            console.error('Failed to save changes:', error);
            setSaveError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                setSelectedRating(null);
            }
        } else {
            setSelectedRating(null);
        }
    };

    if (!selectedRating) return null;
    const userRating = selectedRating.ratings?.[user.username]?.[0] || "";
    const userComment = selectedRating.ratings?.[user.username]?.[1] || "";

    return (
      <div className="rating-popup-overlay">
        <div className="rating-popup">
          <button 
            className="close-popup-btn"
            onClick={handleClose}
            aria-label="Close popup"
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
              <h2>{selectedRating.song}</h2>
              <p className="artist">{selectedRating.artist}</p>
            </div>
            
            <div className="popup-main-content">
              {videoData && (
                <div className="video-container">
                  <iframe 
                    src={videoData.embed}
                    title="Video"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="video-iframe"
                  />
                </div>
              )}

              <div className="details-container">
                <div className="detail-field">
                  <span className="detail-label">Creator:</span>
                  <span className="detail-value">{selectedRating.level.creator}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Current Difficulty:</span>
                  <img src={selectedRating.level.difficulty.icon} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field">
                  <span className="detail-label">Average Rating:</span>
                  <img src={diffMap?.filter(diff => diff.name === selectedRating.average)[0]?.icon} alt="" className="detail-value lv-icon" />
                </div>
              </div>
            </div>

            <div className="rating-section">
              <div className="rating-columns">
                <div className="rating-field-group">
                  <div className="rating-field">
                    <label>Your Rating:</label>
                    <div className="rating-input-container">
                      <RatingInput
                        value={pendingRating}
                        onChange={(value) => {
                          setPendingRating(value);
                          setHasUnsavedChanges(true);
                        }}
                        showDiff={false}
                      />
                      {(pendingRating && (validateFeelingRating(pendingRating) || Object.keys(inputDataRaw).includes(pendingRating.toUpperCase()))) && (
                        <div className="rating-images">
                          {pendingRating.includes('-') && pendingRating.length > 3 ? (
                            <>
                              <img 
                                src={diffMap?.filter(diff => diff.name === pendingRating.split('-')[0])[0]?.icon} 
                                alt=""
                                className="rating-level-image"
                              />
                              <span className="rating-separator">-</span>
                              <img 
                                src={diffMap?.filter(diff => diff.name === pendingRating.split('-')[1])[0]?.icon} 
                                alt=""
                                className="rating-level-image"
                              />
                            </>
                          ) : (
                            <img 
                              src={diffMap?.filter(diff => diff.name === pendingRating)[0]?.icon} 
                              alt=""
                              className="rating-level-image"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rating-field">
                    <label>Your Comment:</label>
                    <textarea
                      value={pendingComment}
                      onChange={(e) => {
                        setPendingComment(e.target.value);
                        setHasUnsavedChanges(true);
                        setCommentError(false);
                      }}
                      style={{ borderColor: commentError ? 'red' : '' }}
                    />
                  </div>
                  <button 
                    className={`save-changes-btn ${isSaving ? 'saving' : ''}`}
                    disabled={!hasUnsavedChanges || isSaving}
                    onClick={handleSaveChanges}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saveError && (
                    <div className="save-error-message">
                        {saveError}
                    </div>
                  )}
                </div>
                <div className="rating-field other-ratings">
                  <label>Other Ratings:</label>
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
