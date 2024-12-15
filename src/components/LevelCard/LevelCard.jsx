import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState } from "react";
import api from "@/utils/api";
import { EditLevelPopup } from "@/components/EditLevelPopup/EditLevelPopup"; // Import the EditLevelPopup component


// eslint-disable-next-line react/prop-types
const LevelCard = ({index, level, legacyMode, isSuperAdmin,  }) => {
  const {t} = useTranslation()  
  const [toRate, setToRate] = useState(level.toRate || false);
  const [showEditPopup, setShowEditPopup] = useState(false); // State to manage popup visibility

  const handleCheckboxChange = async (e) => {
    const newToRate = e.target.checked;
    setToRate(newToRate);

    try {
      await api.put(`${import.meta.env.VITE_LEVELS}/${level.id}/toRate`, { toRate: newToRate });
    } catch (error) {
      console.error(`Failed to update level ${level.id}:`, error);
    }
  };

  
  level.wsLink = level.ws ? level.ws : level.wsLink ? level.wsLink : level.workshopLink;
  level.dlLink = level.dl ? level.dl : level.dlLink

  const lvImage = (legacyMode ? level.difficulty.legacyIcon : level.difficulty.icon) || level.difficulty.icon

  const navigate = useNavigate()
    const redirect = () => {
      navigate(`/levels/${level.id}`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };

    const handleEditClick = (e) => {
      e.stopPropagation(); // Prevent triggering the redirect
      setShowEditPopup(true);
    };

  return (
    <div className='level-card' style={{ backgroundColor: level.isDeleted ? "#f0000099" : "none" }}>
      {/* <div className="id level-id">#{id}</div> */}
      { isSuperAdmin && (
      <div className="toRate-checkbox">
        <label>
          <input
            type="checkbox"
            checked={toRate}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </div>
      )}
      <div className="level-card-wrapper" onClick={() => redirect()}>
      <div className="img-wrapper">
          <img src={lvImage} alt="" />
      </div>


      <div className="creator-wrapper">
          <div className="group">
              <p className="level-exp">#{level.id} - {level.artist}</p>
              {/* <p className='level-id'>#{id}</p> */}
          </div>
          {/* <p className='level-desc'>{team ? team : creator}</p> */}
          <p className='level-desc'>{level.song}</p>
      </div>

      <div className="artist-wrapper">
          <p className="level-exp">{t("levelCardComponent.creator")}</p>
          <div className="level-desc">{level.team ? level.team : level.creator}</div>
      </div>
      {level.clears || level.clears == 0 ? 
        (      
          <div className="clears-wrapper">
            <p className="level-exp">{t("levelCardComponent.clears")}</p>
            <div className="level-desc">{level.clears}</div>
          </div>)
      :
      <></>
    }
    
      <div className="downloads-wrapper">
        {level.wsLink &&
            <a href={level.wsLink} onClick={onAnchorClick} target="_blank">
                <svg className="svg-fill" fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M 22 6 C 18.745659 6 16.09469 8.6041857 16.007812 11.837891 L 12.337891 17.083984 C 12.065931 17.032464 11.786701 17 11.5 17 C 10.551677 17 9.673638 17.297769 8.9472656 17.800781 L 4 15.84375 L 4 21.220703 L 7.1054688 22.449219 C 7.5429388 24.475474 9.3449541 26 11.5 26 C 13.703628 26 15.534282 24.405137 15.917969 22.310547 L 21.691406 17.984375 C 21.794183 17.989633 21.895937 18 22 18 C 25.309 18 28 15.309 28 12 C 28 8.691 25.309 6 22 6 z M 22 8 C 24.206 8 26 9.794 26 12 C 26 14.206 24.206 16 22 16 C 19.794 16 18 14.206 18 12 C 18 9.794 19.794 8 22 8 z M 22 9 A 3 3 0 0 0 22 15 A 3 3 0 0 0 22 9 z M 11.5 18 C 13.43 18 15 19.57 15 21.5 C 15 23.43 13.43 25 11.5 25 C 10.078718 25 8.8581368 24.145398 8.3105469 22.925781 L 10.580078 23.824219 C 10.882078 23.944219 11.192047 24.001953 11.498047 24.001953 C 12.494047 24.001953 13.436219 23.403875 13.824219 22.421875 C 14.333219 21.137875 13.703922 19.683781 12.419922 19.175781 L 10.142578 18.273438 C 10.560118 18.097145 11.019013 18 11.5 18 z"></path></g></svg>
            </a>
          }

          {level.dlLink &&             
          <a href={level.dlLink} onClick={onAnchorClick} target="_blank">
                <svg  className="svg-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
          </a>}

          {!level.wsLink && !level.dlLink &&(
            <a href="">
              <svg className="svg-fill" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#ffffff" fillRule="evenodd" d="M5.781 4.414a7 7 0 019.62 10.039l-9.62-10.04zm-1.408 1.42a7 7 0 009.549 9.964L4.373 5.836zM10 1a9 9 0 100 18 9 9 0 000-18z"></path> </g></svg>
            </a>
            )}

      </div>
      {isSuperAdmin && (
        <button className="edit-button" onClick={handleEditClick}>
          Edit
        </button>
      )}
      </div>
      {showEditPopup && (
        <EditLevelPopup
          level={level}
          onClose={() => setShowEditPopup(false)}
          onUpdate={(updatedLevel) => {
            // Handle level update logic here
            setShowEditPopup(false);
          }}
        />
      )}
    </div>
  );
};

export default LevelCard;


