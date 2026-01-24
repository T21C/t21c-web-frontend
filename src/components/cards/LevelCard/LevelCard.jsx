import { useNavigate } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { EditLevelPopup, AddToPackPopup, SongPopup, ArtistPopup } from "@/components/popups";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoIcon, PassIcon, LikeIcon, PackIcon, DragHandleIcon } from "@/components/common/icons";
import { formatCreatorDisplay, selectIconSize } from "@/utils/Utility";
import { ABILITIES, hasBit } from "@/utils/Abilities";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";
import { getSongName, getArtistDisplayName } from "@/utils/levelHelpers";


const LevelCard = ({
  level: initialLevel = null,
  packItem = null,
  legacyMode,
  user,
  sortBy,
  displayMode = 'normal',
  size = 'medium',
  showTags = true,
  // Pack mode specific props
  canEdit = false,
  onDeleteItem,
  dragHandleProps = null
}) => {
  const [isTwoLineLayout, setIsTwoLineLayout] = useState(false);
  
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
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAddToPackPopup, setShowAddToPackPopup] = useState(false);
  const [showSongPopup, setShowSongPopup] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict, tagsDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.diffId];
  const navigate = useNavigate();

  // Computed values
  const wsLink = level.ws || level.wsLink || level.workshopLink;
  const dlLink = level.dl || level.dlLink;
  const dlLinkValid = dlLink && dlLink.match(/http[s]?:\/\//) ? true : false;
  const customBaseScore = level.baseScore && level.baseScore !== difficultyDict[level.diffId]?.baseScore ? level.baseScore : null;
  const tagIds = (displayMode !== 'normal' || !showTags) ? [] : (level.tags?.map((item) => item.id) || []);
  const tags = tagIds.map((id) => tagsDict[id]).filter(Boolean); // Filter out undefined/null tags
  const hasSongPopup = (level.songs && level.songs.length > 0) ? true : false;
  const hasArtistPopup = (level.artists && level.artists.length > 0) ? true : false;

  // Handle body overflow when popups are open
  useEffect(() => {
    if (showEditPopup || showAddToPackPopup || showSongPopup || showArtistPopup) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }
    return () => {
      document.body.style.overflowY = '';
    };
  }, [showEditPopup, showAddToPackPopup, showSongPopup, showArtistPopup]);

  // Fetch thumbnail for grid mode
  useEffect(() => {
    if (displayMode === 'grid' && level.videoLink) {
      const videoId = level.videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/videos\/)|youtube-nocookie\.com\/(?:embed\/|v\/)|youtube\.com\/(?:v\/|e\/|embed\/|user\/[^/]+\/u\/[0-9]+\/)|watch\?v=)([^#\&\?]*)/)?.[1];
      if (videoId) {
        setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      }
    }
  }, [level.videoLink, displayMode]);

  // Handlers
  const handleLevelUpdate = (updatedData) => {
    const updatedLevel = updatedData.level || updatedData || {};
    setLevel(prevLevel => ({
      ...prevLevel,
      ...updatedLevel,
    }));
  };

  const redirect = () => navigate(`/levels/${level.id}`);
  const onAnchorClick = (e) => e.stopPropagation();
  const handleEditClick = (e) => { e.stopPropagation(); setShowEditPopup(true); };
  const handleAddToPackClick = (e) => { e.stopPropagation(); setShowAddToPackPopup(true); };
  const handleDeleteClick = (e) => { e.stopPropagation(); onDeleteItem?.(packItem); };

  // Determine glow class based on abilities
  const getGlowClass = () => {
    if (!level.curation?.type?.abilities) return '';
    if (hasBit(level.curation.type.abilities, ABILITIES.LEVEL_LIST_LEGENDARY_GLOW)) return 'legendary';
    if (hasBit(level.curation.type.abilities, ABILITIES.LEVEL_LIST_BASIC_GLOW)) return 'basic-glow';
    return '';
  };

  // ============================================
  // REUSABLE RENDER FUNCTIONS
  // ============================================

  const renderDifficultyIcon = ({ showRating = true, showCuration = true, showBaseScore = true, showTags: showTagsInIcon = false } = {}) => (
    <div className="img-wrapper">
      <img src={difficultyDict[difficultyInfo?.id]?.icon} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
      
      {showRating && level.rating?.averageDifficultyId && 
       difficultyDict[level.rating.averageDifficultyId]?.icon &&
       difficultyDict[level.rating.averageDifficultyId]?.type === "PGU" &&
       difficultyDict[level.diffId]?.name.startsWith("Q") && (
        <img 
          className="rating-icon"
          src={difficultyDict[level.rating.averageDifficultyId]?.icon}
          alt="Rating icon" 
        />
      )}
      
      {showCuration && level.curation?.typeId && (
        <img 
          className="curation-icon"
          src={level.curation.type.icon}
          alt="Curation icon" 
        />
      )}
      
      {showBaseScore && customBaseScore && (
        <div className="base-score-wrapper">
          <p className="base-score-value">{customBaseScore} PP</p>
        </div>
      )}
      
      {showTagsInIcon && tags && tags.length > 0 && renderTagsWrapper()}
    </div>
  );

  const renderSongInfo = () => {
    const songName = getSongName(level);
    const artistName = getArtistDisplayName(level);

    const handleArtistClick = (e) => {
      if (hasArtistPopup) {
        e.stopPropagation();
        setShowArtistPopup(true);
      }
    };

    return (
      <div className="song-wrapper">
        <div className="group">
          <p className="level-exp">
            #{level.id} -{' '}
            {hasArtistPopup ? (
              <span 
                className="level-artist-clickable" 
                onClick={handleArtistClick}
                title="Click to view artist details"
              >
                {artistName}
              </span>
            ) : (
              artistName
            )}
          </p>
        </div>
        <p 
        className="level-desc">
          {songName} 
        </p>
      </div>
    );
  };

  const renderCreatorInfo = () => (
    <div className="creator-wrapper">
      <p className="level-exp">{tCard('creator')}</p>
      <div className="level-desc">{formatCreatorDisplay(level)}</div>
    </div>
  );

  const renderStatsIcons = ({ showLikes = true } = {}) => (
    <>
      <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
        <div className="icon-value">{level.clears || 0}</div>
        <PassIcon color="#ffffff" size={"24px"} />
      </div>
      {showLikes && (
        <div className="icon-wrapper" data-opacity={level.likes ? 1 : 0}>
          <div className="icon-value">{level.likes || 0}</div>
          <LikeIcon color={"none"} size={"22px"}/>
        </div>
      )}
    </>
  );

  const renderDownloadLinks = ({ 
    showVideo = true, 
    showDownload = true, 
    showSteam = true, 
    showAddToPack = false,
    showEdit = false,
    showDelete = false,
    editMarginZero = false
  } = {}) => (
    <div className="downloads-wrapper">
      {showVideo && level.videoLink && (
        <a href={level.videoLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
          <VideoIcon color="#ffffff" size={"24px"} />
        </a>
      )}
      {showDownload && dlLinkValid && (
        <a href={dlLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
          <DownloadIcon color="#ffffff" size={"24px"} />
        </a>
      )}
      {showSteam && wsLink && (
        <a href={wsLink} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
          <SteamIcon color="#ffffff" size={"24px"} />
        </a>
      )}
      {showAddToPack && user && (
        <button 
          className="add-to-pack-button" 
          onClick={handleAddToPackClick}
          data-tooltip-id={`add-to-pack-tooltip-${level.id}`}
          data-tooltip-content={tCard('addToPack')}
        >
          <PackIcon color="#ffffff" size={"24px"} />
        </button>
      )}
      {showEdit && user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
        <button className="edit-button" data-margin-zero={editMarginZero} onClick={handleEditClick}>
          <EditIcon color="#ffffff" size={"32px"} />
        </button>
      )}
      {showDelete && (
        <button className="level-card__delete-btn mobile" onClick={handleDeleteClick} title="Remove from pack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      )}
    </div>
  );

  const renderEditButton = () => (
    user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
      <button className="edit-button" onClick={handleEditClick}>
        <EditIcon size={"32px"} />
      </button>
    )
  );

  const renderTagsWrapper = ({ isSingle = false, isCurated = false, itemCount = 0 } = {}) => {
    if (!tags || tags.length === 0) return null;
    
    const single = isSingle || tags.length === 1;
    
    return (
      <div 
        className="level-tags-wrapper" 
        data-single={single}
        data-curated={isCurated || !!level.curation?.typeId}
        data-itemcount={itemCount || tags.length}
      >
        {tags.map((tag, index) => {
          const isLastInOddRow = tags.length % 2 === 1 && index === tags.length - 1;
          return (
            <div
              key={tag.id}
              className="level-tag-badge"
              style={{
                '--tag-bg-color': `${tag.color}50`,
                '--tag-border-color': tag.color,
                '--tag-text-color': tag.color
              }}
              data-span-full={isLastInOddRow}
              title={tag.name}
            >
              {tag.icon ? (
                <img src={selectIconSize(tag.icon, "small")} alt={tag.name} />
              ) : (
                <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTagsSpacer = () => {
    if (!tags || tags.length <= 1) return null;
    return <div className="tags-spacer" data-itemcount={tags.length} data-curated={!!level.curation?.typeId} />;
  };

  const renderClearedCheckmark = ({ className = '', noHover = false } = {}) => (
    packItem?.isCleared && (
      <svg className={`level-card__cleared${noHover ? ' no-hover' : ''} ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    )
  );

  const renderDeleteButton = ({ mobile = false } = {}) => (
    <button
      className={`level-card__delete-btn${mobile ? ' mobile' : ''}`}
      onClick={handleDeleteClick}
      title="Remove from pack"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    </button>
  );

  const renderPopups = () => (
    <>
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
          onSuccess={() => {}}
        />
      )}
      {showSongPopup && hasSongPopup && (
        <SongPopup
          song={level.songs}
          onClose={() => setShowSongPopup(false)}
        />
      )}
      {showArtistPopup && hasArtistPopup && (
        <ArtistPopup
          artist={level.artists}
          onClose={() => setShowArtistPopup(false)}
        />
      )}
    </>
  );

  // ============================================
  // GRID MODE
  // ============================================
  if (displayMode === 'grid') {
    return (
      <div 
        className={`level-card grid size-${size} ${getGlowClass()}`} 
        data-deleted={level.isDeleted}
        data-hidden={level.isHidden && !level.isDeleted}
        style={{ '--difficulty-color': difficultyInfo?.color || '#fff' }}
        onClick={redirect}
      >
        <div 
          className="level-card-wrapper"
          style={{ '--card-bg-image': thumbnailUrl ? `url(${thumbnailUrl})` : 'none' }}
        >
          <div className="difficulty-icon-wrapper">
            <img src={difficultyDict[difficultyInfo?.id]?.icon} alt={difficultyInfo?.name || 'Difficulty icon'} />
          </div>

          {tags && tags.length > 0 && (
            <div className="level-tags-grid">
              {tags.map((tag, index) => {
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
                      <img src={selectIconSize(tag.icon, "small")} alt={tag.name} />
                    ) : (
                      <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="content-overlay">
            <div className="title-section">{getSongName(level)}</div>
            <div className="creator-section">
              {getArtistDisplayName(level)} - {formatCreatorDisplay(level)}
            </div>
          </div>
        </div>

        <div className="dropdown-tongue">
          <div className="dropdown-content">
            <div className="info-row">
              <span>#{level.id} - 🏆 {level.clears || 0}</span>
              {renderDownloadLinks({ showSteam: !!wsLink, showAddToPack: false })}
            </div>
          </div>
        </div>

        {renderPopups()}
      </div>
    );
  }

  // ============================================
  // PACK MODE
  // ============================================
  if (displayMode === 'pack') {
    const renderPackTwoLineLayout = () => (
      <>
        <div className="info-line">
          {renderDifficultyIcon()}
          {renderSongInfo()}
          {renderCreatorInfo()}
        </div>
        <div className="stats-line">
          {renderStatsIcons({ showLikes: false })}
          {renderDownloadLinks({ 
            showSteam: false, 
            showAddToPack: false, 
            showEdit: true, 
            showDelete: true, 
            editMarginZero: true 
          })}
        </div>
      </>
    );

    const renderPackSingleLineLayout = () => (
      <>
        {renderDifficultyIcon()}
        {renderSongInfo()}
        {renderCreatorInfo()}
        {renderStatsIcons({ showLikes: false })}
        {renderDownloadLinks({ 
          showSteam: false, 
          showAddToPack: false, 
          showEdit: true, 
          editMarginZero: true 
        })}
        {renderDeleteButton({ mobile: true })}
      </>
    );

    return (
      <div 
        className={`level-card pack ${getGlowClass()}`} 
        data-deleted={level.isDeleted}
        data-hidden={level.isHidden && !level.isDeleted}
      >
        {canEdit && dragHandleProps && (
          <div {...dragHandleProps} className="level-card__drag-handle" title="Drag to reorder or move">
            <DragHandleIcon />
          </div>
        )}
        
        {renderClearedCheckmark({ noHover: !canEdit })}

        <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`} onClick={redirect}>
          {isTwoLineLayout ? renderPackTwoLineLayout() : renderPackSingleLineLayout()}
          
          {canEdit && renderDeleteButton()}
        </div>

        {renderPopups()}
      </div>
    );
  }

  // ============================================
  // NORMAL MODE (default)
  // ============================================
  const renderNormalTwoLineLayout = () => (
    <>
      <div className="info-line">
        {renderDifficultyIcon({ showTagsInIcon: true })}
        {renderSongInfo()}
        {renderCreatorInfo()}
      </div>
      <div className="stats-line">
        {renderStatsIcons()}
        {renderDownloadLinks({ showAddToPack: true })}
        {renderEditButton()}
      </div>
    </>
  );

  const renderNormalSingleLineLayout = () => (
    <>
      <div className="level-details-wrapper">
        <div className="img-wrapper">
          <img src={difficultyDict[difficultyInfo?.id]?.icon} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
          
          {level.rating?.averageDifficultyId && 
           difficultyDict[level.rating.averageDifficultyId]?.icon &&
           difficultyDict[level.rating.averageDifficultyId]?.type === "PGU" &&
           difficultyDict[level.diffId]?.name.startsWith("Q") && (
            <img 
              className="rating-icon"
              src={difficultyDict[level.rating.averageDifficultyId]?.icon}
              alt="Rating icon" 
            />
          )}
          
          {level.curation?.typeId && (
            <img 
              className="curation-icon"
              src={level.curation.type.icon}
              alt="Curation icon" 
            />
          )}
          
          {customBaseScore && (
            <div className="base-score-wrapper">
              <p className="base-score-value">{customBaseScore} PP</p>
            </div>
          )}
          
          {tags && tags.length === 1 && renderTagsWrapper({ isSingle: true })}
        </div>
        
        {tags && tags.length > 1 && (
          <>
            {renderTagsWrapper()}
            {renderTagsSpacer()}
          </>
        )}
      </div>
      
      {renderSongInfo()}
      {renderCreatorInfo()}
      {renderStatsIcons()}
      {renderDownloadLinks({ showAddToPack: true })}
      {renderEditButton()}
    </>
  );

  return (
    <div 
      className={`level-card ${displayMode} ${getGlowClass()}`} 
      data-deleted={level.isDeleted}
      data-hidden={level.isHidden && !level.isDeleted}
    >
      <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`} onClick={redirect}>
        {isTwoLineLayout ? renderNormalTwoLineLayout() : renderNormalSingleLineLayout()}
      </div>

      {renderPopups()}
    </div>
  );
};

export default LevelCard;
