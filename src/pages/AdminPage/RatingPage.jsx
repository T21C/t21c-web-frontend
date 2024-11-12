import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

const FIXED_COLUMNS = ["ID", "Song", "Artist(s)", "Creator(s)", "Video link", "DL link", "Current Diff", "Low Diff", "Rerate #", "Requester FR", "Average", "Comments"];
const SUPER_ADMINS = ["teo_72", "v0w4n"];

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const {t} = useTranslation();
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [raters, setRaters] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const handleCloseSuccessMessage = () => {
    setShowMessage(false);
    setSuccess(false);
    setError(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          setIsSuperAdmin(SUPER_ADMINS.includes(user.username));
          
          // Fetch raters first
          const ratersResponse = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_RATING_API}/raters`, {
            headers: {authorization: `Bearer ${user.access_token}`}
          });
          const ratersList = await ratersResponse.json();
          
          // Move current user to the beginning of ratersList if present
          const userIndex = ratersList.indexOf(user.username);
          if (userIndex !== -1) {
            ratersList.splice(userIndex, 1);
            ratersList.unshift(user.username);
          }
          
          setRaters(ratersList);

          // Then fetch ratings
          const ratingsResponse = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_RATING_API}`, {
            headers: {authorization: `Bearer ${user.access_token}`}
          });
          const data = await ratingsResponse.json();
          
          // Transform the data to match the table structure
          const transformedData = data.map(rating => {
            const row = [
              rating.ID,
              rating.song,
              rating.artist,
              rating.creator,
              rating.rawVideoLink,
              rating.rawDLLink,
              rating.currentDiff,
              rating.lowDiff,
              rating.rerateNum,
              rating.requesterFR,
              rating.average,
              rating.comments,
              ...ratersList.map(rater => {
                const raterRating = rating.ratings?.[rater];
                return raterRating ? raterRating[0] : "";
              }),
              rating.ratings?.[user.username]?.[1] || "" // User's comment
            ];
            return row;
          });

          // Create headers
          const headers = [...FIXED_COLUMNS, ...ratersList, "Your Comment"];
          
          setRatings([headers, ...transformedData]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [user]);

  const isEditableCell = (cellIndex) => {
    return cellIndex === 11 || cellIndex === 12;
  };

  const renderCell = (cell, cellIndex, rowIndex) => {
    // Links remain the same
    if (cellIndex === 4 || cellIndex === 5) {
      return (
        <a href={cell} key={`cell-${rowIndex}-${cellIndex}`} className={`column-${cellIndex}`}>
          {cellIndex === 4 ? "Video" : "Direct download"}
        </a>
      );
    }
    
    // Editable cells
    if (isEditableCell(cellIndex)) {
      return (
        <textarea
          key={`cell-${rowIndex}-${cellIndex}`}
          className={`column-${cellIndex}`}
          value={typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
          onChange={(e) => {
            // Update ratings state
            const newRatings = [...ratings];
            newRatings[rowIndex + 1][cellIndex] = e.target.value;
            setRatings(newRatings);
            
            // Only auto-resize column 12 (comment column)
            if (cellIndex === 12) {
              requestAnimationFrame(() => {
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
              });
            }
          }}
          // Only apply onFocus auto-resize to column 12
          onFocus={(e) => {
            if (cellIndex === 12) {
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = textarea.scrollHeight + 'px';
            }
          }}
        />
      );
    }
    
    // Non-editable cells
    return (
      <p key={`cell-${rowIndex}-${cellIndex}`} className={`column-${cellIndex}`}>
        {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
      </p>
    );
  };

  const handleSubmit = async () => {
    try {
      const editableRows = ratings.slice(1);
      
      const updates = editableRows.map(row => ({
        id: row[0], // ID is at index 0
        rating: row[raters.indexOf(user.username) + FIXED_COLUMNS.length] || 0, // Find user's rating column
        comment: row[row.length - 1] // Last column is the comment
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/rating`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update ratings');
      }

      setSuccess(true);
      setShowMessage(true);
    } catch (err) {
      setError(err.message);
      setShowMessage(true);
    }
  };

  return (
    <div className="admin-rating-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="admin-rating-body">
        <div className={`result-message ${showMessage ? 'visible' : ''}`} 
        style={{backgroundColor: 
        ( success? "#2b2" :
          error? "#b22":
          "#888"
        )}}>
          {success? (<p>{t("levelSubmission.alert.success")}</p>) :
          error? (<p>{t("levelSubmission.alert.error")}{truncateString(error, 27)}</p>):
          (<p>{t("levelSubmission.alert.loading")}</p>)}
          <button onClick={handleCloseSuccessMessage} className="close-btn">×</button>
        </div>
        <button className="submit-button" onClick={handleSubmit}>
          Submit Changes
        </button>
        <div className="rating-list">
          {/* Headers */}
          <div className="rating-header">
            {ratings[0]?.map((header, index) => (
              <p className={`column-${index}`} key={`header-${index}`}>{String(header)}</p>
            ))}
          </div>
          
          {/* Data rows */}
          {ratings.slice(1).map((row, rowIndex) => (
            <div className={`rating-item row-${rowIndex}`} key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => renderCell(cell, cellIndex, rowIndex))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RatingPage;
