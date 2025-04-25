import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { EditLevelPopup } from "@/components/popups";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoIcon, PassIcon, LikeIcon } from "@/components/common/icons";
import { formatCreatorDisplay } from "@/utils/Utility";
import { UserAvatar } from "@/components/layout";

const LevelCard = ({
  index,
  level: initialLevel,
  legacyMode,
  user,
  sortBy,
  displayMode = 'normal',
  size = 'medium'
}) => {
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.level.${key}`) || key;
  
  const [level, setLevel] = useState(initialLevel);
  const [toRate, setToRate] = useState(!!initialLevel.toRate);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.diffId];

  useEffect(() => {
    if (displayMode === 'grid' && level.videoLink) {
      // Extract video ID from YouTube URL
      const videoId = level.videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/videos\/)|youtube-nocookie\.com\/(?:embed\/|v\/)|youtube\.com\/(?:v\/|e\/|embed\/|user\/[^/]+\/u\/[0-9]+\/)|watch\?v=)([^#\&\?]*)/)?.[1];
      if (videoId) {
        setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      }
    }
  }, [level.videoLink, displayMode]);


  const handleCheckboxChange = async (e) => {
    const newToRate = e.target.checked;
    setToRate(newToRate);

    try {
      const response = await api.put(`${import.meta.env.VITE_LEVELS}/${level.id}/toRate`, { toRate: newToRate });
      if (response.data) {
        setLevel(prev => ({
          ...prev,
          toRate: newToRate
        }));
      }
    } catch (error) {
      setToRate(!newToRate);
      console.error(`Failed to update level ${level.id}:`, error);
    }
  };

  const handleLevelUpdate = (updatedData) => {
    const updatedLevel = updatedData.level || updatedData;
    setLevel(updatedLevel);
    setToRate(!!updatedLevel.toRate);
    setShowEditPopup(false);
  };
  
  level.wsLink = level.ws ? level.ws : level.wsLink ? level.wsLink : level.workshopLink;
  level.dlLink = level.dl ? level.dl : level.dlLink;

  const lvImage = (
    legacyMode ? 
    difficultyDict[difficultyInfo?.id]?.legacyIcon 
    : difficultyDict[difficultyInfo?.id]?.icon
  ) 
    || difficultyDict[difficultyInfo?.id]?.icon;

  const navigate = useNavigate();
  const redirect = () => {
    navigate(`/levels/${level.id}`);
  };

  const onAnchorClick = (e) => {
    e.stopPropagation();
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowEditPopup(true);
  };

  if (displayMode === 'grid') {
    return (
      <div 
        className={`level-card grid size-${size}`} 
        style={{ 
          // @ts-ignore
          '--difficulty-color': difficultyInfo?.color || '#fff',
          backgroundColor: level.isDeleted ? "#f0000099" : level.isHidden ? "#88888899" : "none" 
        }}
        onClick={redirect}
      >
        <div 
          className="level-card-wrapper"
          style={{ backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none' }}
        >
          <div className="difficulty-icon-wrapper">
            <img src={lvImage} alt={difficultyInfo?.name || 'Difficulty icon'} />
          </div>

          <div className="content-overlay">
            <div className="title-section">
              {level.song}
            </div>
            <div className="creator-section">
              {level.artist} - {formatCreatorDisplay(level)}
            </div>
          </div>
        </div>

        <div className="dropdown-tongue">
          <div className="dropdown-content">
            <div className="info-row">
              <span>#{level.id} - 🏆 {level.clears || 0}</span>
              <div className="downloads-wrapper">
                {level.videoLink && (
                  <a href={level.videoLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
                    <VideoIcon color="#ffffff" size={"24px"} />
                  </a>
                )}
                {level.dlLink && (
                  <a href={level.dlLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
                    <DownloadIcon color="#ffffff" size={"24px"} />
                  </a>
                )}
                {level.wsLink && (
                  <a href={level.wsLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
                    <SteamIcon color="#ffffff" size={"24px"} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {showEditPopup && (
          <EditLevelPopup
            level={level}
            onClose={() => setShowEditPopup(false)}
            onUpdate={handleLevelUpdate}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`level-card ${displayMode}`} style={{ backgroundColor: level.isDeleted ? "#f0000099" : level.isHidden ? "#88888899" : "none" }}>
      {user?.isSuperAdmin && (
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
          <img src={lvImage} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
          {level.firstPass && false && ( // disabled for now
            <UserAvatar 
              primaryUrl={level.firstPass.player.avatarUrl}
              fallbackUrl={level.firstPass.player.pfp}
              className="first-pass-pfp"
            />
          )}
          {difficultyDict[level.diffId].type === "PGU" /*&& sortBy === "RATING_ACCURACY"*/ && (
            <>
              <div className={`rating-accuracy-wrapper ${displayMode === 'compact' ? 'compact' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="rating-accuracy-circle">
                  <linearGradient id="a12" gradientTransform="scale(1.5) rotate(47)">
            <stop offset="0.3" stop-color="#ff0000"></stop>
            <stop offset="0.45" stop-color="#66ff00"></stop>
            <stop offset="0.55" stop-color="#66ff00"></stop>
            <stop offset="0.7" stop-color="#ff0000"></stop>
            </linearGradient>
            <circle transform-origin="center" fill="none" stroke="url(#a12)" stroke-width="5" stroke-linecap="round" stroke-dasharray="125 1000" stroke-dashoffset="-100" cx="100" cy="100" r="70" />
          </svg>
          </div>
          
          <svg className="rating-accuracy-arrow" viewBox="0 0 200 200">
            <polygon 
            transform-origin="50% 50%" 
            transform={`rotate(${level.ratingAccuracy*10-45}) translate(0, -15)`} 
            points="0 100, 0 130, 15 115" 
            fill="#fff" />
          </svg>
            </>
          )}
        </div>

        <div className="song-wrapper">
          <div className="group">
            <p className="level-exp">#{level.id} - {level.artist}</p>
          </div>
          <p className='level-desc'>{level.song}</p>
        </div>

        <div className="creator-wrapper">
          <p className="level-exp">{tCard('creator')}</p>
          <div className="level-desc">{formatCreatorDisplay(level)}</div>
        </div>

        {(
          <div className="icon-wrapper" style={{ opacity: level.clears ? 1 : 0 }}>
            <div className="icon-value">{level.clears || 0}</div>
            <PassIcon color="#ffffff" size={"24px"} />
          </div>
        )}

        {(
          <div className="icon-wrapper" style={{ opacity: level.likes ? 1 : 0 }}>
            <div className="icon-value">{level.likes || 0}</div>
            <LikeIcon color={"none"} size={"22px"}/>
          </div>
        )}
    
        <div className="downloads-wrapper">
          {level.videoLink && (
            <a href={level.videoLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <VideoIcon color="#ffffff" size={"24px"} />
            </a>
          )}
          {level.dlLink && (
            <a href={level.dlLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <DownloadIcon color="#ffffff" size={"64px"} />
            </a>
          )}
          {level.wsLink && (
            <a href={level.wsLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <SteamIcon color="#ffffff" size={"24px"} />
            </a>
          )}
        </div>

        {user?.isSuperAdmin && (
          <button className="edit-button" onClick={handleEditClick}>
            <EditIcon size={"32px"} />
          </button>
        )}

      </div>

      {showEditPopup && (
        <EditLevelPopup
          level={level}
          onClose={() => setShowEditPopup(false)}
          onUpdate={handleLevelUpdate}
        />
      )}
    </div>
  );
};

export default LevelCard;


