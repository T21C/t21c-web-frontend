import { CompleteNav, MetaTags } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { DetailPopup } from "../../components/RatingComponents/detailPopup";
import { RatingCard } from "../../components/RatingComponents/ratingCard";
import { EditLevelPopup } from "../../components/EditLevelPopup/EditLevelPopup";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import api from "../../utils/api";
import ReferencesPopup from "../../components/ReferencesPopup/ReferencesPopup";
import RaterManagementPopup from "../../components/RaterManagementPopup/RaterManagementPopup";

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const { t } = useTranslation('pages');
  const tRating = (key, params = {}) => t(`rating.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
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
  const [showReferences, setShowReferences] = useState(false);
  const [showRaterManagement, setShowRaterManagement] = useState(false);

  const handleCloseSuccessMessage = () => {
    setShowMessage(false);
    setSuccess(false);
    setError(false);
  };

  const fetchRatings = useCallback(async () => {
    try {
      const response = await api.get(import.meta.env.VITE_RATING_API);
      const data = response.data;
      setRatings(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      setError("Failed to fetch ratings");
      setShowMessage(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRatings();

    // Set up SSE connection
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ratingUpdate' || data.type === 'ping') {
        fetchRatings();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, fetchRatings]);

  useEffect(() => {
    if (selectedRating) {
      const updatedSelectedRating = ratings?.find(r => r.id === selectedRating.id);
      if (updatedSelectedRating) {
        setSelectedRating(updatedSelectedRating);
      }
    }
  }, [ratings, selectedRating]);

  const handleEditLevel = async (levelId) => {
    try {
      // Fetch full level data
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`);
      if (response && response.data) {
        setSelectedLevel(response.data);
        setOpenEditDialog(true);
      }
    } catch (error) {
      console.error("Error fetching level data:", error);
      setError("Failed to load level data");
      setShowMessage(true);
    }
  };

  return (
    <div className="admin-rating-page">
      <MetaTags
        title={tRating('meta.title')}
        description={tRating('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="admin-rating-body">
        <ScrollButton />
        <div className="view-controls">
          <div className="admin-buttons">
            <button 
              className="admin-button"
              onClick={() => setShowReferences(true)}
            >
              {tRating('buttons.references')}
            </button>
            {isSuperAdmin && (
              <button 
                className="admin-button"
                onClick={() => setShowRaterManagement(true)}
              >
                {tRating('buttons.manageRaters')}
              </button>
            )}
          </div>
          {isSuperAdmin && (
            <div className="view-mode-toggle">
              <span className="toggle-label">{tRating('toggles.detailedView.label')}</span>
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
            <span className="toggle-label">{tRating('toggles.hideRated.label')}</span>
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

        {loading ? (
          <div className="loader loader-level-detail"/>
        ) : ratings === null ? (
          <div>{tRating('messages.error')}</div>
        ) : ratings.length > 0 ? (
          <>
            <div className="rating-list">
              {ratings
                .filter(rating => !hideRated || rating.averageDifficulty !== null)
                .map((rating, index) => (
                  <RatingCard
                    key={rating.id}
                    rating={rating}
                    index={index}
                    setSelectedRating={setSelectedRating}
                    user={user}
                    isSuperAdmin={isSuperAdmin}
                    showDetailedView={showDetailedView}
                    onEditLevel={() => handleEditLevel(rating.level.id)}
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
                onUpdate={(updatedData) => {
                  if (updatedData) {
                    const updatedLevel = updatedData.level || updatedData;
                    setRatings(prev => prev.map(rating => 
                      rating.level.id === updatedLevel.id 
                        ? {
                            ...rating,
                            level: {
                              ...rating.level,
                              ...updatedLevel
                            }
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
            <h2>{tRating('messages.noRatings.title')}</h2>
            <p>{tRating('messages.noRatings.subtitle')}</p>
          </div>
        )}

        {showReferences && (
          <ReferencesPopup onClose={() => setShowReferences(false)} />
        )}

        {showRaterManagement && isSuperAdmin && (
          <RaterManagementPopup 
            onClose={() => setShowRaterManagement(false)}
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
};

export default RatingPage;
