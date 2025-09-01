import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { EditLevelPopup } from "@/components/popups";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoIcon, PassIcon, LikeIcon } from "@/components/common/icons";
import { formatCreatorDisplay } from "@/utils/Utility";
import { ABILITIES, hasBit } from "@/utils/Abilities";
import { UserAvatar } from "@/components/layout";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";


const LevelCard = ({
  index,
  level: initialLevel,
  legacyMode,
  user,
  sortBy,
  displayMode = 'normal',
  size = 'medium'
}) => {
  const [isTwoLineLayout, setIsTwoLineLayout] = useState(false);

  // Check if we should use two-line layout based on screen width
  useEffect(() => {
    const checkLayout = () => {
      setIsTwoLineLayout(window.innerWidth <= 650);
    };
    
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.level.${key}`) || key;
  
  const [level, setLevel] = useState(initialLevel);
  const [toRate, setToRate] = useState(!!initialLevel.toRate);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.diffId];

  // Add effect to handle body overflow when edit popup is open
  useEffect(() => {
    if (showEditPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEditPopup]);

  useEffect(() => {
    if (displayMode === 'grid' && level.videoLink) {
      // Extract video ID from YouTube URL
      const videoId = level.videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/videos\/)|youtube-nocookie\.com\/(?:embed\/|v\/)|youtube\.com\/(?:v\/|e\/|embed\/|user\/[^/]+\/u\/[0-9]+\/)|watch\?v=)([^#\&\?]*)/)?.[1];
      if (videoId) {
        setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      }
    }
  }, [level.videoLink, displayMode]);


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

  // Determine glow class based on abilities - legendary overrides basic
  const getGlowClass = () => {
    if (!level.curation?.type?.abilities) return '';
    
    if (hasBit(level.curation.type.abilities, ABILITIES.LEVEL_LIST_LEGENDARY_GLOW)) {
      return 'legendary';
    } else if (hasBit(level.curation.type.abilities, ABILITIES.LEVEL_LIST_BASIC_GLOW)) {
      return 'basic-glow';
    }
    return '';
  };

  if (displayMode === 'grid') {
    return (
      <div 
        className={`level-card grid size-${size} ${getGlowClass()}`} 
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
    <div className={`level-card ${displayMode} ${getGlowClass()}`} 
    style={{ 
      backgroundColor: level.isDeleted ? "#f0000099"
      : level.isHidden ? "#88888899" 
      : "none" }}>
      <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`} onClick={() => redirect()}>
        {isTwoLineLayout ? (
          <>
            {/* Info Line - Upper row */}
            <div className="info-line">
              <div className="img-wrapper">
                <img src={lvImage} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
                {(level.rating?.averageDifficultyId && 
                 difficultyDict[level.rating.averageDifficultyId]?.icon &&
                 difficultyDict[level.rating.averageDifficultyId]?.type == "PGU" &&
                 difficultyDict[level.diffId]?.name.startsWith("Q")) ?
                <img 
                    className="rating-icon"
                    src={difficultyDict[level.rating.averageDifficultyId]?.icon}
                    alt="Rating icon" />
                : null
                }
                {(level.curation?.typeId) ?
                <img 
                    className="curation-icon"
                    src={level.curation.type.icon}
                    alt="Curation icon" />
                : null
                }
                {difficultyDict[level.diffId]?.type === "PGU" 
                && level.clears > 0
                && level.totalRatingAccuracyVotes > 0
                && 1 == 0 // not needed anymore 😔
                && (
                  <>
                    <div className={`rating-accuracy-wrapper ${displayMode === 'compact' ? 'compact' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="rating-accuracy-circle">
                        <linearGradient id="a12" gradientTransform="scale(1.5) rotate(47)">
                          <stop offset="0.3" stopColor="#ff0000"></stop>
                          <stop offset="0.45" stopColor="#66ff00"></stop>
                          <stop offset="0.55" stopColor="#66ff00"></stop>
                          <stop offset="0.7" stopColor="#ff0000"></stop>
                        </linearGradient>
                        <circle transform-origin="center" fill="none" stroke="url(#a12)" strokeWidth="5" strokeLinecap="round" strokeDasharray="125 1000" strokeDashoffset="-100" cx="100" cy="100" r="70" />
                      </svg>
                    </div>
                    
                    <svg className="rating-accuracy-arrow" viewBox="0 0 200 200">
                      <polygon 
                      transform-origin="50% 50%" 
                      transform={`rotate(${level.ratingAccuracy*10-45}) translate(0, -15)`} 
                      points="0 100, 0 130, 15 115" 
                      fill="#fff" />
                    </svg>
                {sortBy === "RATING_ACCURACY_VOTES"
                &&
                (
                  <div className="rating-accuracy-votes-wrapper">
                    <p>
                      {level.totalRatingAccuracyVotes.toString().length === 1 && (<>&nbsp;</>)} 
                      {level.totalRatingAccuracyVotes.toString() || 0}
                    </p>
                  </div>
                )}
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
            </div>

            {/* Stats Line - Lower row */}
            <div className="stats-line">
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

              {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <button className="edit-button" onClick={handleEditClick}>
                  <EditIcon size={"32px"} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Single line layout */}
            <div className="img-wrapper">
              <img src={lvImage} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
              {(level.rating?.averageDifficultyId && 
               difficultyDict[level.rating.averageDifficultyId]?.icon &&
               difficultyDict[level.rating.averageDifficultyId]?.type == "PGU" &&
               difficultyDict[level.diffId]?.name.startsWith("Q")) ?
              <img 
                  className="rating-icon"
                  src={difficultyDict[level.rating.averageDifficultyId]?.icon}
                  alt="Rating icon" />
              : null
              }
              {(level.curation?.typeId) ?
              <img 
                  className="curation-icon"
                  src={level.curation.type.icon}
                  alt="Curation icon" />
              : null
              }
              {difficultyDict[level.diffId]?.type === "PGU" 
              && level.clears > 0
              && level.totalRatingAccuracyVotes > 0
              && 1 == 0 // not needed anymore 😔
              && (
                <>
                  <div className={`rating-accuracy-wrapper ${displayMode === 'compact' ? 'compact' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="rating-accuracy-circle">
                      <linearGradient id="a12" gradientTransform="scale(1.5) rotate(47)">
                        <stop offset="0.3" stopColor="#ff0000"></stop>
                        <stop offset="0.45" stopColor="#66ff00"></stop>
                        <stop offset="0.55" stopColor="#66ff00"></stop>
                        <stop offset="0.7" stopColor="#ff0000"></stop>
                      </linearGradient>
                      <circle transform-origin="center" fill="none" stroke="url(#a12)" strokeWidth="5" strokeLinecap="round" strokeDasharray="125 1000" strokeDashoffset="-100" cx="100" cy="100" r="70" />
                    </svg>
                  </div>
                  
                  <svg className="rating-accuracy-arrow" viewBox="0 0 200 200">
                    <polygon 
                    transform-origin="50% 50%" 
                    transform={`rotate(${level.ratingAccuracy*10-45}) translate(0, -15)`} 
                    points="0 100, 0 130, 15 115" 
                    fill="#fff" />
                  </svg>
              {sortBy === "RATING_ACCURACY_VOTES"
              &&
              (
                <div className="rating-accuracy-votes-wrapper">
                  <p>
                    {level.totalRatingAccuracyVotes.toString().length === 1 && (<>&nbsp;</>)} 
                    {level.totalRatingAccuracyVotes.toString() || 0}
                  </p>
                </div>
              )}
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

            {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <button className="edit-button" onClick={handleEditClick}>
                <EditIcon size={"32px"} />
              </button>
            )}
          </>
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


