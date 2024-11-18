import { CompleteNav } from "../../components";
import "./css/adminratingpage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { DetailPopup } from "../../components/RatingComponents/detailPopup";
import { RatingCard } from "../../components/RatingComponents/ratingCard";

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
  const [selectedRating, setSelectedRating] = useState(null);

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
        {ratings.length > 0 ?
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
        </>
        :
        <div className="loader loader-level-detail"/>
        }
      </div>
    </div>
  );
};

export default RatingPage;
