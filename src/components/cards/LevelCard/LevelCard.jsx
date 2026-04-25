import { Link } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { EditLevelPopup } from "@/components/popups/Levels";
import { AddToPackPopup } from "@/components/popups/Packs";
import { SongPopup } from "@/components/popups/Songs";
import { ArtistPopup } from "@/components/popups/Artists";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoIcon, PassIcon, LikeIcon, PackIcon, DragHandleIcon, MetronomeIcon, ChartIcon, TimeIcon } from "@/components/common/icons";
import { clampFloat, formatCreatorDisplay } from "@/utils/Utility";
import { ABILITIES, hasBit } from "@/utils/Abilities";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";
import { getSongDisplayName, getArtistDisplayName } from "@/utils/levelHelpers";
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
  sortCurationTypesForDisplay,
} from "@/utils/curationTypeUtils";
import { formatDuration } from "@/utils/levelHelpers";

/** Curation type names hidden from the difficulty-arc curation icons */
const HIDDEN_CURATION_ARC_TYPE_NAMES = new Set(['C0', 'V0']);

const LevelCard = ({
  level: initialLevel = null,
  packItem = null,
  user,
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
  
  if (packItem) {
    initialLevel = packItem.referencedLevel;
  }
  
  const [level, setLevel] = useState(initialLevel);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAddToPackPopup, setShowAddToPackPopup] = useState(false);
  const [showSongPopup, setShowSongPopup] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const { difficultyDict, curationTypesDict, tagsDict } = useDifficultyContext();
  const difficultyInfo = difficultyDict[level.diffId];
  const chartTilecount = level.tilecount;
  const chartBpm = level.bpm;
  const curationsList = useMemo(() => {
    const raw = level.curations?.length
      ? level.curations
      : level.curation
        ? [level.curation]
        : [];
    return sortCurationsForDisplay(raw, curationTypesDict);
  }, [level.curations, level.curation, curationTypesDict]);
  /** Up to 4 curation type icons from the level’s curation (M2M types) */
  const curationTypeIconSlots = useMemo(() => {
    const first = curationsList[0];
    if (!first) return [];
    const types = getCurationTypesResolved(first, curationTypesDict);
    return sortCurationTypesForDisplay(types, curationTypesDict)
      .filter((t) => {
        const info = curationTypesDict[t.id] || t;
        const name = info?.name ?? t.name;
        return !HIDDEN_CURATION_ARC_TYPE_NAMES.has(name);
      })
      .slice(0, 4)
      .map((t) => {
        const info = curationTypesDict[t.id] || t;
        return { key: t.id, typeId: t.id, icon: info?.icon };
      })
      .filter((x) => x.icon);
  }, [curationsList, curationTypesDict]);

  // Computed values
  const wsLink = level.ws || level.wsLink || level.workshopLink;
  const dlLink = level.dl || level.dlLink;
  const dlLinkValid = dlLink && dlLink.match(/http[s]?:\/\//) ? true : false;
  const customBaseScore = level.baseScore && level.baseScore !== difficultyDict[level.diffId]?.baseScore ? level.baseScore : null;
  const tagIds = (displayMode !== 'normal' || !showTags) ? [] : (level.tags?.map((item) => item.id) || []);
  const tags = tagIds.map((id) => tagsDict[id]).filter(Boolean); // Filter out undefined/null tags
  const hasSongPopup = (level.songs && level.songs.length > 0) ? true : false;
  const hasArtistPopup = (level.artists && level.artists.length > 0) ? true : false;
  const levelDetailTo = `/levels/${level.id}`;

  useBodyScrollLock(showEditPopup || showAddToPackPopup || showSongPopup || showArtistPopup);

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

  const onAnchorClick = (e) => e.stopPropagation();
  const handleEditClick = (e) => { e.stopPropagation(); setShowEditPopup(true); };
  const handleAddToPackClick = (e) => { e.stopPropagation(); setShowAddToPackPopup(true); };
  const handleDeleteClick = (e) => { e.stopPropagation(); onDeleteItem?.(packItem); };

  // Determine glow class based on abilities
  const getGlowClass = () => {
    for (const slot of curationTypeIconSlots) {
      const info = curationTypesDict[slot.typeId];
      if (!info?.abilities) continue;
      if (hasBit(info.abilities, ABILITIES.LEVEL_LIST_LEGENDARY_GLOW)) return 'legendary';
    }
    for (const slot of curationTypeIconSlots) {
      const info = curationTypesDict[slot.typeId];
      if (hasBit(info.abilities, ABILITIES.LEVEL_LIST_BASIC_GLOW)) return 'basic-glow';
    }
    return '';
  };

  // ============================================
  // REUSABLE RENDER FUNCTIONS
  // ============================================

  const renderDifficultyIcon = ({ showRating = true, showCuration = true, showBaseScore = true } = {}) => (
    <div className="img-wrapper">
      <img src={difficultyDict[difficultyInfo?.id]?.icon} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
      
      {showRating && level.rating?.averageDifficultyId && 
       difficultyDict[level.rating.averageDifficultyId]?.icon &&
       difficultyDict[level.rating.averageDifficultyId]?.type === "PGU" &&
       difficultyDict[level.diffId]?.name.includes("Q") && (
        <img 
          className="rating-icon"
          src={difficultyDict[level.rating.averageDifficultyId]?.icon}
          alt="Rating icon" 
        />
      )}
      
      {showCuration &&
        curationTypeIconSlots.map((slot, idx) => (
            <img
              key={slot.key ?? `${slot.typeId}-${idx}`}
              className={`curation-icon curation-icon--${idx + 1}`}
              style={{ '--idx': idx, '--curation-count': curationTypeIconSlots.length }}
              src={slot.icon}
              alt="Curation icon"
            />
        ))}
      
      {showBaseScore && customBaseScore && (
        <div className="base-score-wrapper">
          <p className="base-score-value">{customBaseScore} PP</p>
        </div>
      )}
    </div>
  );

  const renderSongInfo = () => {
    const songName = getSongDisplayName(level);
    const artistName = getArtistDisplayName(level);

    return (
      <div className="song-wrapper">
        <div className="group">
          <p className="level-exp">
            #{level.id} -{' '}
            {artistName}
          </p>
        </div>
        <p className="level-desc">
          {songName} 
        </p>
        {tags && tags.length > 0 && renderTagsWrapper()}
      </div>
    );
  };

  const renderCreatorInfo = () => (
    <div className="creator-wrapper">
      <p className="level-exp">{t('cards.level.creator')}</p>
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
          data-tooltip-content={t('cards.level.addToPack')}
        >
          <PackIcon color="#ffffff" size={"24px"} />
        </button>
      )}
      {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
        <button className="edit-button" data-margin-zero={editMarginZero} onClick={handleEditClick}>
          <EditIcon color="#ffffff" size={"32px"} />
        </button>
      )}
    </div>
  );

  const renderTagsWrapper = () => {
    if (!tags || tags.length === 0) return null;

    return (
      <div className="level-underline-wrapper">
      <div className="level-tags-wrapper">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="level-tag-badge"
            style={{
              '--tag-bg-color': `${tag.color}50`,
              '--tag-border-color': tag.color,
              '--tag-text-color': tag.color
            }}
            title={tag.name}
          >
            {tag.icon ? (
              <img src={tag.icon} alt={tag.name} />
            ) : (
              <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        ))}
      
      </div>
      {(chartTilecount != null && chartTilecount !== '') || (chartBpm != null && chartBpm !== '') ? (
        <div className="metadata-block">
          {level.levelLengthInMs != null && level.levelLengthInMs !== '' && (
            <div className="metadata-item">
              <TimeIcon size={18} />
              <span className="metadata-value">{formatDuration(level.levelLengthInMs)}</span>
            </div>
          )}
          {chartTilecount != null && chartTilecount !== '' && (
          <div className="metadata-item">
            <ChartIcon size={18}  />
            <span className="metadata-value">{chartTilecount}</span>
          </div>
          )}
          {chartBpm != null && chartBpm !== '' && (
          <div className="metadata-item">
            <MetronomeIcon size={18} />
            <span className="metadata-value">{clampFloat(chartBpm, 2)}</span>
          </div>
          )}
        </div>
        ) : null}
      </div>
    );
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
      >
        <div 
          className="level-card-wrapper"
          style={{ '--card-bg-image': thumbnailUrl ? `url(${thumbnailUrl})` : 'none' }}
        >
          <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
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
                      <img src={tag.icon} alt={tag.name} />
                    ) : (
                      <span className="level-tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="content-overlay">
            <div className="title-section">{getSongDisplayName(level)}</div>
            <div className="creator-section">
              {getArtistDisplayName(level)} - {formatCreatorDisplay(level)}
            </div>
          </div>
          </Link>
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
        <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
          <div className="info-line">
            {renderDifficultyIcon()}
            {renderSongInfo()}
            {renderCreatorInfo()}
          </div>
        </Link>
        <div className="stats-line">
          <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
            {renderStatsIcons({ showLikes: false })}
          </Link>
          {renderDownloadLinks({ 
            showSteam: false, 
            showAddToPack: false, 
            editMarginZero: true 
          })}
        </div>
      </>
    );

    const renderPackSingleLineLayout = () => (
      <>
        <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
          {renderDifficultyIcon()}
          {renderSongInfo()}
          {renderCreatorInfo()}
          {renderStatsIcons({ showLikes: false })}
        </Link>
        {renderDownloadLinks({ 
          showSteam: false, 
          showAddToPack: false, 
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

        <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`}>
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
      <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
        <div className="info-line">
          {renderDifficultyIcon()}
          {renderSongInfo()}
          {renderCreatorInfo()}
        </div>
      </Link>
      <div className="stats-line">
        <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
          {renderStatsIcons()}
        </Link>
        {renderDownloadLinks({ showAddToPack: true })}
      </div>
    </>
  );

  const renderNormalSingleLineLayout = () => (
    <>
      <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
        <div className="level-details-wrapper">
          <div className="img-wrapper">
            <img src={difficultyDict[difficultyInfo?.id]?.icon} alt={difficultyInfo?.name || 'Difficulty icon'} className="difficulty-icon" />
            
            {level.rating?.averageDifficultyId && 
             difficultyDict[level.rating.averageDifficultyId]?.icon &&
             difficultyDict[level.rating.averageDifficultyId]?.type === "PGU" &&
             difficultyDict[level.diffId]?.name.includes("Q") && (
              <img 
                className="rating-icon"
                src={difficultyDict[level.rating.averageDifficultyId]?.icon}
                alt="Rating icon" 
              />
            )}
            
            {curationTypeIconSlots.map((slot, idx) => (
                <img
                  key={slot.key ?? `${slot.typeId}-${idx}`}
                  className={`curation-icon`}
                  style={{ '--idx': idx, '--curation-count': curationTypeIconSlots.length }}
                  src={slot.icon}
                  alt="Curation icon"
                />
            ))}
            
            {customBaseScore && (
              <div className="base-score-wrapper">
                <p className="base-score-value">{customBaseScore} PP</p>
              </div>
            )}
          </div>
        </div>
        
        {renderSongInfo()}
        {renderCreatorInfo()}
        {renderStatsIcons()}
      </Link>
      {renderDownloadLinks({ showAddToPack: true })}
    </>
  );

  return (
    <div 
      className={`level-card ${displayMode} ${getGlowClass()}`} 
      data-deleted={level.isDeleted}
      data-hidden={level.isHidden && !level.isDeleted}
    >
      <div className={`level-card-wrapper ${isTwoLineLayout ? 'two-line' : ''}`}>
        {isTwoLineLayout ? renderNormalTwoLineLayout() : renderNormalSingleLineLayout()}
      </div>

      {renderPopups()}
    </div>
  );
};

export default LevelCard;
