import './ratingcard.css';

export const RatingCard = ({ 
  rating, 
  index, 
  setSelectedRating, 
  raters, 
  user, 
  isSuperAdmin,
  onEditChart 
}) => {
    const userRating = rating.ratings?.[user.username]?.[0] || "";
    const userComment = rating.ratings?.[user.username]?.[1] || "";
    //console.log("user", user);
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
          <div className="rating-card-actions">
            <button 
              onClick={() => setSelectedRating(rating)} 
              className="view-details-btn"
            >
              View Details
            </button>
            {user && isSuperAdmin && (  // Only show edit button if user is logged in
              <button 
                onClick={onEditChart} 
                className="edit-chart-btn"
              >
                Edit Chart
              </button>
            )}
          </div>
        </div>
      </div>
    );
};