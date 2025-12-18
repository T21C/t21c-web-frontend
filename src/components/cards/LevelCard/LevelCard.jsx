import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { EditLevelPopup, AddToPackPopup } from "@/components/popups";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoIcon, PassIcon, LikeIcon, PackIcon, DragHandleIcon, YoutubeIcon } from "@/components/common/icons";
import { formatCreatorDisplay } from "@/utils/Utility";
import { ABILITIES, hasBit } from "@/utils/Abilities";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";


const LevelCard = ({
  index,
  level: initialLevel = null,
  packItem = null,
  legacyMode,
  user,
  sortBy,
  displayMode = 'normal',
  size = 'medium',
  // Pack mode specific props
  canEdit = false,
  onDeleteItem,
  dragHandleProps = null
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
  if (packItem) {
    initialLevel = packItem.referencedLevel;
  }
  
  const [level, setLevel] = useState(initialLevel);
  const [toRate, setToRate] = useState(!!initialLevel.toRate);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAddToPackPopup, setShowAddToPackPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.diffId];
  // Add effect to handle body overflow when popups are open
  useEffect(() => {
    if (showEditPopup || showAddToPackPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEditPopup, showAddToPackPopup]);

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
    const updatedLevel = updatedData.level || updatedData || {};
    setLevel(prevLevel => ({
      ...prevLevel,
      ...updatedLevel,
    }));
    setToRate(prev => updatedLevel.toRate !== undefined ? !!updatedLevel.toRate : prev);
  };
  
  level.wsLink = level.ws ? level.ws : level.wsLink ? level.wsLink : level.workshopLink;
  level.dlLink = level.dl ? level.dl : level.dlLink;

  const customBaseScore = level.baseScore && level.baseScore !== difficultyDict[level.diffId]?.baseScore ? level.baseScore : null;

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

  // Use tags from level data
  const tags = level.tags || [];

  const onAnchorClick = (e) => {
    e.stopPropagation();
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowEditPopup(true);
  };

  const handleAddToPackClick = (e) => {
    e.stopPropagation();
    setShowAddToPackPopup(true);
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
        data-deleted={level.isDeleted}
        data-hidden={level.isHidden && !level.isDeleted}
        style={{ 
          // @ts-ignore
          '--difficulty-color': difficultyInfo?.color || '#fff'
        }}
        onClick={redirect}
      >
        <div 
          className="level-card-wrapper"
          style={{ '--card-bg-image': thumbnailUrl ? `url(${thumbnailUrl})` : 'none' }}
        >
          <div className="difficulty-icon-wrapper">
            <img src={lvImage} alt={difficultyInfo?.name || 'Difficulty icon'} />
          </div>

          {/* Tags for grid mode */}
          {tags && tags.length > 0 && (
            <div className="level-tags-grid">
              {tags.map((tag, index) => {
                // Calculate if this tag should span both columns (odd number of tags and last one)
                const isFirstInOddRow = tags.length % 2 === 1 && index === 0;
                return (
                  <div
                    key={tag.id}
                    className="level-tag-badge"
                    style={{
                      '--tag-bg-color': `${tag.color}80`,
                      '--tag-border-color': tag.color,
                      '--tag-text-color': tag.color,
                    }}
                    data-span-full={isFirstInOddRow}
                    title={tag.name}
                  >
                    {tag.icon ? (
                      <img 
                        src={tag.icon} 
                        alt={tag.name}
                      />
                    ) : (
                      <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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

  if (displayMode === 'pack') {
    const handleDeleteClick = (e) => {
      e.stopPropagation();
      if (onDeleteItem) {
        onDeleteItem(packItem);
      }
    };

    return (
      <div 
        className={`level-card pack ${getGlowClass()}`} 
        data-deleted={level.isDeleted}
        data-hidden={level.isHidden && !level.isDeleted}
      >
        {/* Drag handle on the left */}
        {canEdit && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="level-card__drag-handle"
            title="Drag to reorder or move"
          >
            <DragHandleIcon />
          </div>
        )}
        {packItem.isCleared ? 
             <svg className={`level-card__cleared` + (!canEdit ? ' no-hover' : '')} width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50" >
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
             </svg>
        : null}
        {/* Main card content */}
        <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`} onClick={redirect}>
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
                  {customBaseScore && (
                    <div className="base-score-wrapper">
                      <p className="base-score-value">{customBaseScore} PP</p>
                    </div>
                  )}
                  {packItem.isCleared ? (
                     <svg className="level-card__cleared" width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50" >
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                     </svg>
                   ) : null}
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
                <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
                  <div className="icon-value">{level.clears || 0}</div>
                  <PassIcon color="#ffffff" size={"24px"} />
                </div>

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
                  {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                  <button className="edit-button" data-margin-zero="true" onClick={handleEditClick}>
                    <EditIcon color="#ffffff" size={"32px"} />
                  </button>
                  )}
                  {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                  <button
                    className="level-card__delete-btn mobile"
                     onClick={handleDeleteClick}
                     title="Remove from pack"
                   >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                     </svg>
                   </button>
                  )}
                </div>
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

              <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
                <div className="icon-value">{level.clears || 0}</div>
                <PassIcon color="#ffffff" size={"24px"} />
              </div>

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
                {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <button className="edit-button" data-margin-zero="true" onClick={handleEditClick}>
                  <EditIcon color="#ffffff" size={"32px"} />
                </button>
                )}
                <button
                    className="level-card__delete-btn mobile"
                     onClick={handleDeleteClick}
                     title="Remove from pack"
                   >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                     </svg>
                   </button>
              </div>
            </>
          )}

          {/* Trash button for removal */}
          {canEdit && (
            <button
              className="level-card__delete-btn"
              onClick={handleDeleteClick}
              title="Remove from pack"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
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

        {showAddToPackPopup && (
          <AddToPackPopup
            level={level}
            onClose={() => setShowAddToPackPopup(false)}
            onSuccess={() => {
              // Optionally refresh data or show success message
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className={`level-card ${displayMode} ${getGlowClass()}`} 
      data-deleted={level.isDeleted}
      data-hidden={level.isHidden && !level.isDeleted}
    >
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
                {customBaseScore && (
                    <div className="base-score-wrapper">
                      <p className="base-score-value">{customBaseScore} PP</p>
                    </div>
                )}
                {/* Tags display */}
                {tags && tags.length > 0 && (
                  <div className="level-tags-wrapper">
                    {tags.map((tag, index) => {
                      // Calculate if this tag should span both columns (odd number of tags and last one)
                      const isLastInOddRow = tags.length % 2 === 1 && index === tags.length - 1;
                      return (
                        <div
                          key={tag.id}
                          className="level-tag-badge"
                          style={{
                            '--tag-bg-color': `${tag.color}40`,
                            '--tag-border-color': tag.color,
                            '--tag-text-color': tag.color
                          }}
                          data-span-full={isLastInOddRow}
                          title={tag.name}
                        >
                          {tag.icon ? (
                            <img 
                              src={tag.icon} 
                              alt={tag.name}
                            />
                          ) : (
                            <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
                  <div className="icon-value">{level.clears || 0}</div>
                  <PassIcon color="#ffffff" size={"24px"} />
                </div>
              )}

              {(
                <div className="icon-wrapper" data-opacity={level.likes ? 1 : 0}>
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
                {user && (
                  <button 
                    className="add-to-pack-button" 
                    onClick={handleAddToPackClick}
                    data-tooltip-id={`add-to-pack-tooltip-${level.id}`}
                    data-tooltip-content={tCard('addToPack')}
                  >
                    <PackIcon color="#ffffff" size={"24px"} />
                  </button>
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
            <div className="level-details-wrapper">
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
              {customBaseScore && (
                    <div className="base-score-wrapper">
                      <p className="base-score-value">{customBaseScore} PP</p>
                    </div>
                )}
            
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
             {/* Tags display */}
             {tags && tags.length == 1 && (
                <div className="level-tags-wrapper" data-single={true}>
                  {tags.map((tag, index) => {
                    return (
                      <div
                        key={tag.id}
                        className="level-tag-badge"
                        style={{
                          '--tag-bg-color': `${tag.color}40`,
                          '--tag-border-color': tag.color,
                          '--tag-text-color': tag.color
                        }}
                        title={tag.name}
                      >
                        {tag.icon ? (
                          <img 
                            src={tag.icon} 
                            alt={tag.name}
                          />
                        ) : (
                          <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
              {/* Tags display */}
              {tags && tags.length > 1 && (
                <>
                <div 
                  className="level-tags-wrapper" 
                  data-curated={level.curation?.typeId ? true : false} 
                  data-itemcount={tags.length}
                >
                  {tags.map((tag, index) => {
                    // Calculate if this tag should span both columns (odd number of tags and last one)
                    const isLastInOddRow = tags.length % 2 === 1 && index === tags.length - 1;
                    return (
                      <div
                        key={tag.id}
                        className="level-tag-badge"
                        style={{
                          '--tag-bg-color': `${tag.color}40`,
                          '--tag-border-color': tag.color,
                          '--tag-text-color': tag.color
                        }}
                        data-span-full={isLastInOddRow}
                        title={tag.name}
                      >
                        {tag.icon ? (
                          <img 
                            src={tag.icon} 
                            alt={tag.name}
                          />
                        ) : (
                          <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    );
                    })}
                  </div>
                  <div className="tags-spacer" data-itemcount={tags.length} data-curated={level.curation?.typeId ? true : false} />
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
              <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
                <div className="icon-value">{level.clears || 0}</div>
                <PassIcon color="#ffffff" size={"24px"} />
              </div>
            )}

            {(
              <div className="icon-wrapper" data-opacity={level.likes ? 1 : 0}>
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
              {user && (
                <button 
                  className="add-to-pack-button" 
                  onClick={handleAddToPackClick}
                  data-tooltip-id={`add-to-pack-tooltip-${level.id}`}
                  data-tooltip-content={tCard('addToPack')}
                >
                  <PackIcon color="#ffffff" size={"24px"} />
                </button>
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

      {showAddToPackPopup && (
        <AddToPackPopup
          level={level}
          onClose={() => setShowAddToPackPopup(false)}
          onSuccess={() => {
            // Optionally refresh data or show success message
          }}
        />
      )}
    </div>
  );
};

export default LevelCard;


