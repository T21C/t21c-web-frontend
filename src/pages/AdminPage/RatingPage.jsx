import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { DetailPopup } from "../../components/RatingComponents/DetailPopup";
import { RatingCard } from "../../components/RatingComponents/RatingCard";
import { EditLevelPopup } from "../../components/EditLevelPopup/EditLevelPopup";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import api from "../../utils/api";
import { io } from "socket.io-client";

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const {t} = useTranslation();
  const { user, isSuperAdmin } = useAuth();
  const [ratings, setRatings] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [hideRated, setHideRated] = useState(false);

  const handleCloseSuccessMessage = () => {
    setShowMessage(false);
    setSuccess(false);
    setError(false);
  };

  const fetchRatings = useCallback(async () => {
    try {
      const ratingsResponse = await api.get(`${import.meta.env.VITE_RATING_API}`);
      const data = await ratingsResponse.data;
      setRatings(data);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  }, []);


  
  useEffect(() => {
    let socket;

    fetchRatings();

    const connectSocket = () => {
      socket = io(import.meta.env.VITE_API_URL, {
        path: '/socket.io',
        reconnectionAttempts: 5,
        timeout: 10000
      });

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('ratingsUpdated', () => {
        fetchRatings();
      });      
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.off('ratingsUpdated', () => {
          fetchRatings();
        });
        socket.disconnect();
      }
    };
  }, [user, fetchRatings]);

  useEffect(() => {
    if (selectedRating) {
      const updatedSelectedRating = ratings.find(r => r.id === selectedRating.id);
      if (updatedSelectedRating) {
        setSelectedRating(updatedSelectedRating);
      }
    }
  }, [ratings]);


  const handleEditLevel = async (levelId) => {
    try {
      // Fetch full level data using the same method as LevelDetailPage
      const data = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`);
      if (data && data.level) {
        setSelectedLevel(data.level);
        setOpenEditDialog(true);
      }
    } catch (error) {
      console.error("Error fetching level data:", error);
      // Optionally show error message to user
      setError("Failed to load level data");
      setShowMessage(true);
    }
  };

  return (
    <div className="admin-rating-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="admin-rating-body">
        <ScrollButton />
        <div className="view-controls">
          {isSuperAdmin && (
            <div className="view-mode-toggle">
              <span className="toggle-label">Detailed View</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showDetailedView}
                  onChange={(e) => setShowDetailedView(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}
          <div className="view-mode-toggle">
            <span className="toggle-label">Hide Rated</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={hideRated}
                onChange={(e) => setHideRated(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
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

        {ratings === null ? (
          <div className="loader loader-level-detail"/>
        ) : ratings.length > 0 ? (
          <>
            <div className="rating-list">
              {ratings
                .filter(rating => !hideRated || !rating.ratings?.[user.username])
                .map((rating, index) => (
                  <RatingCard
                    key={rating.ID}
                    rating={rating}
                    index={index}
                    setSelectedRating={setSelectedRating}
                    user={user}
                    isSuperAdmin={isSuperAdmin}
                    showDetailedView={showDetailedView}
                    onEditLevel={() => handleEditLevel(rating.levelId)}
                  />
              ))}
            </div>
            <DetailPopup
              selectedRating={selectedRating}
              setSelectedRating={setSelectedRating}
              ratings={ratings}
              setRatings={setRatings}
              user={user}
            />

            {openEditDialog && selectedLevel && isSuperAdmin && (
              <EditLevelPopup
                level={selectedLevel}
                onClose={() => {
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
                onUpdate={(updatedLevel) => {
                  // Only update ratings if updatedLevel exists (not a soft delete)
                  if (updatedLevel) {
                    setRatings(prev => prev.map(rating => 
                      rating.levelId === updatedLevel.id 
                        ? {
                            ...rating,
                            Song: updatedLevel.song,
                            "Artist(s)": updatedLevel.artist,
                            "Creator(s)": updatedLevel.creator,
                            "Video link": updatedLevel.vidLink,
                            "DL link": updatedLevel.dlLink,
                            "Current Diff": updatedLevel.diff
                          }
                        : rating
                    ));
                  }
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
              />
            )}
          </>
        ) : (
          <div className="no-ratings-message">
            <h2>No ratings available{/*t("adminPage.rating.noLevels")*/}</h2>
            <p>All rated!{/*t("adminPage.rating.allRated")*/}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingPage;
