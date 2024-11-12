import "./detailpopup.css";
import { useEffect } from 'react';

export const DetailPopup = ({ 
  selectedRating, 
  setSelectedRating, 
  ratings, 
  setRatings, 
  raters, 
  user, 
  FIXED_COLUMNS 
}) => {
    if (!selectedRating) return null;

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                setSelectedRating(null);
            }
        };

        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, []);

    const videoLink = selectedRating[4];
    const videoId = videoLink?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    const userRatingIndex = raters.indexOf(user.username) + FIXED_COLUMNS.length;

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
            <h2>{selectedRating[1]}</h2>
            <p className="artist">{selectedRating[2]}</p>
            
            {videoId && (
              <div className="video-container">
                <iframe
                  width="560"
                  height="315"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <div className="rating-inputs">
              <div className="rating-field">
                <label>Your Rating:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={selectedRating[userRatingIndex] || ""}
                  onChange={(e) => {
                    const newRatings = [...ratings];
                    newRatings[ratings.findIndex(r => r[0] === selectedRating[0])][userRatingIndex] = e.target.value;
                    setRatings(newRatings);
                  }}
                />
              </div>
              <div className="rating-field">
                <label>Your Comment:</label>
                <textarea
                  value={selectedRating[selectedRating.length - 1] || ""}
                  onChange={(e) => {
                    const newRatings = [...ratings];
                    newRatings[ratings.findIndex(r => r[0] === selectedRating[0])][selectedRating.length - 1] = e.target.value;
                    setRatings(newRatings);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};