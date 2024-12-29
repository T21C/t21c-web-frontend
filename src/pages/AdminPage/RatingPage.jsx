import { CompleteNav, MetaTags, StateDisplay } from "../../components";
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
import AccessDenied from "../../components/StateDisplay/AccessDenied";
import ReferencesButton from "../../components/ReferencesButton/ReferencesButton";

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const { t } = useTranslation('pages');
  const tRating = (key, params = {}) => t(`rating.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
  const { user, isSuperAdmin, isAdmin } = useAuth();
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
  const [lowDiffFilter, setLowDiffFilter] = useState('show');
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

    let retryCount = 0;
    const maxRetries = 3;
    let isFirstConnection = true;

    const setupEventSource = () => {
      const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        if (isFirstConnection) {
          console.debug('SSE: Initial connection established');
          isFirstConnection = false;
        } else {
          console.debug('SSE: Reconnected successfully');
        }
        retryCount = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ratingUpdate' || data.type === 'ping' || data.type === 'levelUpdate') {
            fetchRatings();
            console.debug('SSE: Rating update received');
          }
        } catch (error) {
          console.error('SSE: Error parsing message:', error);
        }
      };

      eventSource.onerror = (error) => {
        // Check if it's a normal reconnection attempt
        if (eventSource.readyState === EventSource.CONNECTING) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.debug(`SSE: Reconnection attempt ${retryCount}/${maxRetries}`);
            return;
          }
          console.warn(`SSE: Max reconnection attempts reached`);
        }
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error('SSE: Connection closed, attempting to reconnect in 5s');
          eventSource.close();
          setTimeout(setupEventSource, 5000);
        }
      };

      return eventSource;
    };

    const eventSource = setupEventSource();

    return () => {
      console.debug('SSE: Cleaning up connection');
      if (eventSource) {
        eventSource.close();
      }
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

  if (isSuperAdmin === undefined && isAdmin === undefined) {
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
          <div className="loader loader-level-detail"/>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !isAdmin) {
    return (
      <AccessDenied 
        metaTitle={tRating('meta.title')}
        metaDescription={tRating('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

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
            {!selectedRating && (
              <ReferencesButton onClick={() => setShowReferences(true)} />
            )}
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
            <StateDisplay
              currentState={lowDiffFilter}
              states={['show','hide',  'only']}
              onChange={setLowDiffFilter}
              label={tRating('toggles.lowDiff.label')}
              width={60}
            />
        </div>

        {loading ? (
          <div className="loader loader-level-detail"/>
        ) : ratings === null ? (
          <div>{tRating('messages.error')}</div>
        ) : ratings.length > 0 ? (
          <>
            <span className="rating-count"> {ratings.length} ratings total</span>
            <div className="rating-list">
              {ratings
                .filter(rating => !hideRated 
                  || !rating.details?.find(detail => detail.username === user.username)?.rating
                )
                .filter(rating => {
                  if (lowDiffFilter === 'hide') return !rating.lowDiff;
                  if (lowDiffFilter === 'only') return rating.lowDiff;
                  return true; // 'show' shows all
                })
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
            {selectedRating && (
              <DetailPopup
                selectedRating={selectedRating}
                setSelectedRating={setSelectedRating}
                setShowReferences={setShowReferences}
                ratings={ratings}
                setRatings={setRatings}
                user={user}
              />
            )}

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
