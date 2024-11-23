import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { DetailPopup } from "../../components/RatingComponents/detailPopup";
import { RatingCard } from "../../components/RatingComponents/ratingCard";
import { EditChartPopup } from "../../components/EditChartPopup/EditChartPopup";
import { fetchLevelInfo } from "../../Repository/RemoteRepository";

const FIXED_COLUMNS = ["ID", "Song", "Artist(s)", "Creator(s)", "Video link", "DL link", "Current Diff", "Low Diff", "Rerate #", "Requester FR", "Average", "Comments"];
const SUPER_ADMINS = ["teo_72", "v0w4n"];

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const {t} = useTranslation();
  const { user, isSuperAdmin } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [raters, setRaters] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          
          // Fetch raters first
          const ratersResponse = await fetch(`${import.meta.env.VITE_RATING_API}/raters`, {
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
          const ratingsResponse = await fetch(`${import.meta.env.VITE_RATING_API}`, {
            headers: {authorization: `Bearer ${user.access_token}`}
          });
          const data = await ratingsResponse.json();
          setRatings(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async () => {
    try {
      const updates = ratings.map(rating => ({
        id: rating.ID,
        rating: rating.ratings?.[user.username]?.[0] || 0,
        comment: rating.ratings?.[user.username]?.[1] || ""
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
              FIXED_COLUMNS={FIXED_COLUMNS}
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
