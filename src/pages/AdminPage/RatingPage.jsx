import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

const FIXED_COLUMNS = ["ID", "Song", "Artist(s)", "Charter(s)", "Video link", "DL link"];

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {

  const {t} = useTranslation()
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
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
    const fetchRatings = async () => {
      try {
        if (user) {
          setIsSuperAdmin(["teo_72", "v0w4n"].includes(user.username));
          console.log("fetching ratings", user);
          const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_RATING_API}`, {
            headers: {authorization: `Bearer ${user.access_token}`}
          });
          const data = await response.json();
          
          // Find the user's column index
          const userColumnIndex = data[0].findIndex((header, index) => 
            index >= 4 && header === user.username
          );
          console.log("User column index:", userColumnIndex);

          if (userColumnIndex !== -1) {
            const swappedData = data.map(row => {
              const newRow = [...row];
              [newRow[userColumnIndex], newRow[14]] = [newRow[14], newRow[userColumnIndex]];
              return newRow;
            });
            
            const namedData = [...FIXED_COLUMNS, ...swappedData[0].slice(FIXED_COLUMNS.length)];
            setRatings([namedData, ...swappedData.slice(1)]);
          } else {
            const namedData = [...FIXED_COLUMNS, ...data[0].slice(FIXED_COLUMNS.length)];
            setRatings([namedData, ...data.slice(1)]);
          }
        }
      } catch (error) {
        console.error("Error fetching ratings:", error);
      }
    };

    fetchRatings();
  }, [user]);

  const isEditableCell = (cellIndex) => {
    if (isSuperAdmin) {
      // Make all cells except ID, Video and Download links editable
      return cellIndex !== 0 && cellIndex !== 4 && cellIndex !== 5 && cellIndex !== 13;
    }
    // Regular admin can only edit rating and comment
    return cellIndex === 12 || cellIndex === 14;
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
        <button 
          className="submit-button"
          onClick={async () => {
            try {
              // Get all editable rows (skip header row)
              const editableRows = ratings.slice(1);
              
              // Create array of updates
              const updates = editableRows.map((row, index) => ({
                index: index,
                rating: row[14], // Column 14 value
                comment: row[12] // Column 12 value  
              }));

              // Submit request
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
          }}
        >
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
