import "./detailpopup.css";
import { useEffect, useState } from 'react';
import { getVideoDetails, getLevelIconSingle, inputDataRaw } from "../../Repository/RemoteRepository";
import { RatingItem } from './RatingItem';
import { validateFeelingRating } from '../Misc/Utility';
import { RatingInput } from './RatingInput';

export const DetailPopup = ({ 
  selectedRating, 
  setSelectedRating, 
  ratings, 
  setRatings, 
  user, 
}) => {
    const [videoData, setVideoData] = useState(null);

    useEffect(() => {
        const handleEscKey = (event) =>  {
            if (event.key === 'Escape' && !event.defaultPrevented) { // Only close popup if escape wasn't handled by child
                setSelectedRating(null);
            }
        };

        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [setSelectedRating]);

    useEffect(() => {
        const fetchVideoData = async () => {
            if (selectedRating) {
                const res = await getVideoDetails(selectedRating.rawVideoLink);
                setVideoData(res);
                console.log(res);
            }
        };

        fetchVideoData();
    }, [selectedRating]);

    if (!selectedRating) return null;
    const userRating = selectedRating.ratings?.[user.username]?.[0] || "";
    const userComment = selectedRating.ratings?.[user.username]?.[1] || "";

    return (
      <div className="rating-popup-overlay">
        <div className="rating-popup">
          <button 
            className="close-popup-btn"
            onClick={() => setSelectedRating(null)}
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
                  <span className="detail-value">{selectedRating.creator}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Current Difficulty:</span>
                  <span className="detail-value">{selectedRating.currentDiff}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Average Rating:</span>
                  <span className="detail-value">{selectedRating.average}</span>
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
                        value={userRating}
                        onChange={(value) => {
                          const newRatings = [...ratings];
                          const ratingIndex = ratings.findIndex(r => r.ID === selectedRating.ID);
                          if (!newRatings[ratingIndex].ratings) {
                            newRatings[ratingIndex].ratings = {};
                          }
                          if (!newRatings[ratingIndex].ratings[user.username]) {
                            newRatings[ratingIndex].ratings[user.username] = ["", ""];
                          }
                          newRatings[ratingIndex].ratings[user.username][0] = value;
                          setRatings(newRatings);
                        }}
                      />
                      {(userRating && (validateFeelingRating(userRating) || Object.keys(inputDataRaw).includes(userRating.toUpperCase()))) && (
                        <div className="rating-images">
                          {userRating.includes('-') ? (
                            <>
                              <img 
                                src={getLevelIconSingle(userRating.split('-')[0])} 
                                alt={userRating.split('-')[0]}
                                className="rating-level-image"
                              />
                              <span className="rating-separator">-</span>
                              <img 
                                src={getLevelIconSingle(userRating.split('-')[1])} 
                                alt={userRating.split('-')[1]}
                                className="rating-level-image"
                              />
                            </>
                          ) : (
                            <img 
                              src={getLevelIconSingle(userRating)} 
                              alt={userRating}
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
                      value={userComment}
                      onChange={(e) => {
                        const newRatings = [...ratings];
                        const ratingIndex = ratings.findIndex(r => r.ID === selectedRating.ID);
                        if (!newRatings[ratingIndex].ratings) {
                          newRatings[ratingIndex].ratings = {};
                        }
                        if (!newRatings[ratingIndex].ratings[user.username]) {
                          newRatings[ratingIndex].ratings[user.username] = ["", ""];
                        }
                        newRatings[ratingIndex].ratings[user.username][1] = e.target.value;
                        setRatings(newRatings);
                      }}
                    />
                  </div>
                </div>
                <div className="rating-field other-ratings">
                  <label>Other Ratings:</label>
                  <div className="other-ratings-content">
                    {Object.entries(selectedRating.ratings || {})
                      .filter(([username]) => username !== user.username)
                      .map(([username, [rating, comment]]) => (
                        <RatingItem key={username} username={username} rating={rating} comment={comment} />
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
