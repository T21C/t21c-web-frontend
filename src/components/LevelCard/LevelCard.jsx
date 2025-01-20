import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { EditLevelPopup } from "@/components/EditLevelPopup/EditLevelPopup";
import { useDifficultyContext } from "../../contexts/DifficultyContext";
import { EditIcon } from "../Icons/EditIcon";
import { SteamIcon } from "../Icons/SteamIcon";

const LevelCard = ({
  index,
  level: initialLevel,
  legacyMode,
  user,
  displayMode = 'normal',
  size = 'medium'
}) => {
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.level.${key}`);
  
  const [level, setLevel] = useState(initialLevel);
  const [toRate, setToRate] = useState(!!initialLevel.toRate);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.difficulty.id];

  useEffect(() => {
    if (displayMode === 'grid' && level.videoLink) {
      // Extract video ID from YouTube URL
      const videoId = level.videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/videos\/)|youtube-nocookie\.com\/(?:embed\/|v\/)|youtube\.com\/(?:v\/|e\/|embed\/|user\/[^/]+\/u\/[0-9]+\/)|watch\?v=)([^#\&\?]*)/)?.[1];
      if (videoId) {
        setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      }
    }
  }, [level.videoLink, displayMode]);

  const formatCreatorDisplay = () => {
    // If team exists, it takes priority
    if (level.team) {
      return level.team;
    }

    // If no credits, fall back to creator field
    if (!level.levelCredits || level.levelCredits.length === 0) {
      return level.creator;
    }

    // Group credits by role
    const creditsByRole = level.levelCredits.reduce((acc, credit) => {
      const role = credit.role.toLowerCase();
      if (!acc[role]) {
        acc[role] = [];
      }
      const creatorName = credit.creator.aliases?.length > 0 
        ? credit.creator.aliases[0]
        : credit.creator.name;
      acc[role].push(creatorName);
      return acc;
    }, {});

    const charters = creditsByRole['charter'] || [];
    const vfxers = creditsByRole['vfxer'] || [];

    if (displayMode === 'compact') {
      return charters[0] || level.creator;
    }

    // Handle different cases based on number of credits
    if (level.levelCredits.length >= 3) {
      const parts = [];
      if (charters.length > 0) {
        parts.push(charters.length === 1 
          ? charters[0] 
          : `${charters[0]} & ${charters.length - 1} more`);
      }
      if (vfxers.length > 0) {
        parts.push(vfxers.length === 1
          ? vfxers[0]
          : `${vfxers[0]} & ${vfxers.length - 1} more`);
      }
      return parts.join(' | ');
    } else if (level.levelCredits.length === 2) {
      if (charters.length === 2) {
        return `${charters[0]} & ${charters[1]}`;
      }
      if (charters.length === 1 && vfxers.length === 1) {
        return `${charters[0]} | ${vfxers[0]}`;
      }
    }

    return level.levelCredits[0]?.creator.name || level.creator;
  };

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

  const handleRestore = async () => {
    if (!window.confirm(tCard('confirmations.restore'))) {
      return;
    }

    try {
      const response = await api.patch(`${import.meta.env.VITE_LEVELS}/${level.id}/restore`);
      if (response.data) {
        handleLevelUpdate(response.data);
      }
    } catch (error) {
      console.error(`Failed to restore level ${level.id}:`, error);
    }
  };
  
  level.wsLink = level.ws ? level.ws : level.wsLink ? level.wsLink : level.workshopLink;
  level.dlLink = level.dl ? level.dl : level.dlLink;

  const lvImage = (legacyMode ? difficultyInfo?.legacyIcon : difficultyInfo?.icon) || difficultyInfo?.icon;

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

          {user?.isSuperAdmin && (
            <div className="toRate-checkbox">
              <input
                type="checkbox"
                checked={toRate}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="content-overlay">
            <div className="title-section">
              {level.song}
            </div>
            <div className="creator-section">
              {level.artist} - {formatCreatorDisplay()}
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ffffff">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                    </svg>
                  </a>
                )}
                {level.dlLink && (
                  <a href={level.dlLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ffffff">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </a>
                )}
                {level.wsLink && (
                  <a href={level.wsLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
                    <SteamIcon color="#ffffff" size={24} />
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
        </div>

        <div className="creator-wrapper">
          <div className="group">
            <p className="level-exp">#{level.id} - {level.artist}</p>
          </div>
          <p className='level-desc'>{level.song}</p>
        </div>

        <div className="artist-wrapper">
          <p className="level-exp">{tCard('creator')}</p>
          <div className="level-desc">{formatCreatorDisplay()}</div>
        </div>

        {(level.clears || level.clears === 0) && (
          <div className="clears-wrapper">
            <p className="level-exp">{tCard('clears')}</p>
            <div className="level-desc">{level.clears}</div>
          </div>
        )}
    
        <div className="downloads-wrapper">
          {level.videoLink && (
            <a href={level.videoLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ffffff">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
              </svg>
            </a>
          )}
          {level.dlLink && (
            <a href={level.dlLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ffffff">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          )}
          {level.wsLink && (
            <a href={level.wsLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
              <SteamIcon color="#ffffff" size={24} />
            </a>
          )}
        </div>

        {user?.isSuperAdmin && (
          <button className="edit-button" onClick={handleEditClick}>
            <EditIcon size={32} />
          </button>
        )}

        {user?.isSuperAdmin && level.isDeleted && (
          <button className="restore-button" onClick={(e) => { e.stopPropagation(); handleRestore(); }}>
            {tCard('buttons.restore')}
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


