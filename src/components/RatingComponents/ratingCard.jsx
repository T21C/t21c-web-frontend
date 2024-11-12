import './ratingcard.css';

export const RatingCard = ({ 
  rating, 
  index, 
  setSelectedRating, 
  raters, 
  user 
}) => {
    const userRating = rating.ratings?.[user.username]?.[0] || "";
    const userComment = rating.ratings?.[user.username]?.[1] || "";

    return (
      <div className="rating-card">
        <div className="rating-card-content">
          <div className="rating-card-header">
            <h3>{rating.song}</h3>
            <p className="artist">{rating.artist}</p>
          </div>
          <div className="rating-card-details">
            <p data-label="Creator:">{rating.creator}</p>
            <p data-label="Current Difficulty:">{rating.currentDiff}</p>
            <p data-label="Average Rating:">{rating.average}</p>
            <p data-label="Your Rating:">{userRating}</p>
          </div>
          <button 
            className="view-details-btn"
            onClick={() => setSelectedRating(rating)}
          >
            View Details
          </button>
        </div>
      </div>
    );
};