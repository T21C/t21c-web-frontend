import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { DetailPopup } from "../../components/RatingComponents/detailPopup";
import { RatingCard } from "../../components/RatingComponents/ratingCard";
import { EditChartPopup } from "../../components/EditChartPopup/EditChartPopup";
import { fetchLevelInfo } from "../../Repository/RemoteRepository";
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
  const [raters, setRaters] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);

  const handleCloseSuccessMessage = () => {
    setShowMessage(false);
    setSuccess(false);
    setError(false);
  };

  const fetchRatings = useCallback(async () => {
    try {
      const ratingsResponse = await api.get(`${import.meta.env.VITE_RATING_API}`);
      const data = await ratingsResponse.data;
      console.log("refreshing ratings");
      setRatings(data);
      console.log("data", data);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          // Fetch raters
          const ratersResponse = await api.get(`${import.meta.env.VITE_RATING_API}/raters`);
          const ratersList = await ratersResponse.data;
          
          // Move current user to the beginning of ratersList if present
          const userIndex = ratersList.indexOf(user.username);
          if (userIndex !== -1) {
            ratersList.splice(userIndex, 1);
            ratersList.unshift(user.username);
          }
          
          setRaters(ratersList);
          await fetchRatings();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    let socket;

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
        console.log('Received ratingsUpdated event, fetching new data...');
        fetchRatings();
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.off('ratingsUpdated', () => {
          console.log('Received ratingsUpdated event, fetching new data...');
          fetchRatings();
        });
        socket.disconnect();
      }
    };
  }, [user, fetchRatings]);

  useEffect(() => {
    console.log("ratings", ratings);
    console.log("looking for selectedRating", selectedRating);
    if (selectedRating) {
      const updatedSelectedRating = ratings.find(r => r.ID === selectedRating.ID);
      if (updatedSelectedRating) {
        setSelectedRating(updatedSelectedRating);
      }
    }
  }, [ratings]);


  const handleSubmit = async () => {
    try {
      const updates = ratings.map(rating => ({
        id: rating.ID,
        rating: rating.ratings?.[user.username]?.[0] || 0,
        comment: rating.ratings?.[user.username]?.[1] || ""
      }));

      const response = await api.put(`${import.meta.env.VITE_API_URL}/v2/admin/rating`, {
        updates
      });

      if (response.status !== 200) {
        throw new Error('Failed to update ratings');
      }

      setSuccess(true);
      setShowMessage(true);
      // No need to manually fetch ratings here as the socket will handle the update
    } catch (err) {
      setError(err.message);
      setShowMessage(true);
    }
  };

  const handleEditChart = async (chartId) => {
    try {
      // Fetch full chart data using the same method as LevelDetailPage
      const data = await fetchLevelInfo(chartId);
      if (data && data.level) {
        setSelectedChart(data.level);
        setOpenEditDialog(true);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      // Optionally show error message to user
      setError("Failed to load chart data");
      setShowMessage(true);
    }
  };

  return (
    <div className="admin-rating-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="admin-rating-body">
        <ScrollButton />
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
              {ratings.map((rating, index) => (
                <RatingCard
                  key={rating.ID}
                  rating={rating}
                  index={index}
                  setSelectedRating={setSelectedRating}
                  raters={raters}
                  user={user}
                  isSuperAdmin={isSuperAdmin}
                  onEditChart={() => handleEditChart(rating.ID)}
                />
              ))}
            </div>
            <DetailPopup
              selectedRating={selectedRating}
              setSelectedRating={setSelectedRating}
              ratings={ratings}
              setRatings={setRatings}
              raters={raters}
              user={user}
            />

            {openEditDialog && selectedChart && isSuperAdmin && (
              <EditChartPopup
                chart={selectedChart}
                onClose={() => {
                  setOpenEditDialog(false);
                  setSelectedChart(null);
                }}
                onUpdate={(updatedChart) => {
                  setRatings(prev => prev.map(rating => 
                    rating.ID === updatedChart.id 
                      ? {
                          ...rating,
                          Song: updatedChart.song,
                          "Artist(s)": updatedChart.artist,
                          "Creator(s)": updatedChart.creator,
                          "Video link": updatedChart.vidLink,
                          "DL link": updatedChart.dlLink,
                          "Current Diff": updatedChart.diff
                        }
                      : rating
                  ));
                  setOpenEditDialog(false);
                  setSelectedChart(null);
                }}
              />
            )}
          </>
        ) : (
          <div className="no-ratings-message">
            <h2>No ratings available{/*t("adminPage.rating.noCharts")*/}</h2>
            <p>All rated!{/*t("adminPage.rating.allRated")*/}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingPage;
