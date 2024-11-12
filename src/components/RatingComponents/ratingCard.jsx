import './ratingcard.css';

export const RatingCard = ({ 
  row, 
  rowIndex, 
  setSelectedRating, 
  raters, 
  user, 
  FIXED_COLUMNS 
}) => {
    const id = row[0];
    const song = row[1];
    const artist = row[2];
    const creator = row[3];
    const videoLink = row[4];
    const currentDiff = row[6];
    const average = row[10];
    const userRatingIndex = raters.indexOf(user.username) + FIXED_COLUMNS.length;
    const userRating = row[userRatingIndex] || "";
    const userComment = row[row.length - 1] || "";

    return (
      <div className="rating-card">
        <div className="rating-card-content">
          <div className="rating-card-header">
            <h3>{song}</h3>
            <p className="artist">{artist}</p>
          </div>
          <div className="rating-card-details">
            <p data-label="Creator:">{creator}</p>
            <p data-label="Current Difficulty:">{currentDiff}</p>
            <p data-label="Average Rating:">{average}</p>
            <p data-label="Your Rating:">{userRating}</p>
          </div>
          <button 
            className="view-details-btn"
            onClick={() => setSelectedRating(row)}
          >
            View Details
          </button>
        </div>
      </div>
    );
};