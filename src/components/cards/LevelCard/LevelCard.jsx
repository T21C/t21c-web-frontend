// tuf-search: #LevelCard #levelCard #cards
import { Link } from "react-router-dom";
import "./levelcard.css"
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { EditLevelPopup } from "@/components/popups/Levels";
import { AddToPackPopup } from "@/components/popups/Packs";
import { SongPopup } from "@/components/popups/Songs";
import { ArtistPopup } from "@/components/popups/Artists";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { EditIcon, SteamIcon, DownloadIcon, VideoLinkIcon, PassIcon, LikeIcon, PackIcon, DragHandleIcon, MetronomeIcon, ChartIcon, TimeIcon, TUFHelperLiteIcon } from "@/components/common/icons";
import { clampFloat, formatCreatorDisplay } from "@/utils/Utility";
import { getPrimaryVideoLink } from "@/utils/videoLink";
import { ABILITIES, hasBit } from "@/utils/Abilities";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";
import { getSongDisplayName, getArtistDisplayName } from "@/utils/levelHelpers";
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
  sortCurationTypesForDisplay,
} from "@/utils/curationTypeUtils";
import { formatAutoTilecountTooltip, formatDuration } from "@/utils/levelHelpers";
import { Tooltip } from "react-tooltip";
import MarqueeText from "@/components/common/display/MarqueeText/MarqueeText";
import {
  checkTufHelperLiteDownloadedIds,
  checkTufHelperLiteHealth,
  checkTufHelperLiteJobs,
  getTufHelperLiteDownloadState,
  invokeTufHelperLiteIpc,
  useTufHelperLiteDownloadedIds,
  useTufHelperLiteHealth,
  useTufHelperLiteJobs,
} from "@/hooks/useTufHelperLiteIpc";

/** Curation type names hidden from the difficulty-arc curation icons */
const HIDDEN_CURATION_ARC_TYPE_NAMES = new Set(['C0', 'V0']);

const LevelCard = ({
  level: initialLevel = null,
  packItem = null,
  user,
  displayMode = 'normal',
  showTags = true,
  /** When true, show C0/V0 on the difficulty-arc curation icons (level list filter). */
  showC0V0CurationIcons = false,
  /** When true, show community estimated difficulty overlay on Q charts. */
  showEstimatedDifficulty = false,
  // Pack mode specific props
  canEdit = false,
  onDeleteItem,
  dragHandleProps = null,
  onRequestMove = null,
}) => {
  const { t } = useTranslation('components');
  
  if (packItem) {
    initialLevel = packItem.referencedLevel;
  }
  
  const [level, setLevel] = useState(initialLevel);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAddToPackPopup, setShowAddToPackPopup] = useState(false);
  const [showSongPopup, setShowSongPopup] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [isLiked, setIsLiked] = useState(
    typeof initialLevel?.isLiked === 'boolean' ? initialLevel.isLiked : false
  );
  const [likeCount, setLikeCount] = useState(initialLevel?.likes ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const { difficultyDict, curationTypesDict, tagsDict } = useDifficultyContext();
  const revealHiddenCurationArcTypes =
    showC0V0CurationIcons || !!packItem || displayMode === 'pack';
  const difficultyInfo = level != null ? difficultyDict[level.diffId] : undefined;
  const curationsList = useMemo(() => {
    if (!level) return [];
    const raw = level.curations?.length
      ? level.curations
      : level.curation
        ? [level.curation]
        : [];
    return sortCurationsForDisplay(raw, curationTypesDict);
  }, [level, curationTypesDict]);
  /** Up to 4 curation type icons from the level’s curation (M2M types) */
  const curationTypeIconSlots = useMemo(() => {
    const first = curationsList[0];
    if (!first) return [];
    const types = getCurationTypesResolved(first, curationTypesDict);
    return sortCurationTypesForDisplay(types, curationTypesDict)
      .filter((t) => {
        const info = curationTypesDict[t.id] || t;
        const name = info?.name ?? t.name;
        return revealHiddenCurationArcTypes || !HIDDEN_CURATION_ARC_TYPE_NAMES.has(name);
      })
      .slice(0, 4)
      .map((t) => {
        const info = curationTypesDict[t.id] || t;
        return { key: t.id, typeId: t.id, icon: info?.icon };
      })
      .filter((x) => x.icon);
  }, [curationsList, curationTypesDict, revealHiddenCurationArcTypes]);

  // Computed values
  const wsLink = level?.ws || level?.wsLink || level?.workshopLink;
  const dlLink = level?.dl || level?.dlLink;
  const dlLinkValid = dlLink && dlLink.match(/http[s]?:\/\//) ? true : false;
  const customBaseScore =
    level?.baseScore && level.baseScore !== difficultyDict[level.diffId]?.baseScore
      ? level.baseScore
      : null;
  const resolvesTagBadges =
    showTags && (displayMode === 'normal' || displayMode === 'pack');
  const tagIds = resolvesTagBadges ? (level?.tags?.map((item) => item.id) || []) : [];
  const tags = tagIds.map((id) => tagsDict[id]).filter(Boolean); // Filter out undefined/null tags
  const hasSongPopup = (level?.songs && level.songs.length > 0) ? true : false;
  const hasArtistPopup = (level?.artists && level.artists.length > 0) ? true : false;
  const levelDetailTo = level?.id != null ? `/levels/${level.id}` : '#';
  const tufHelperLiteHealth = useTufHelperLiteHealth();
  const tufHelperLiteJobs = useTufHelperLiteJobs();
  const tufHelperLiteDownloadedIds = useTufHelperLiteDownloadedIds();
  const tufHelperLiteDownload = getTufHelperLiteDownloadState(
    tufHelperLiteHealth,
    tufHelperLiteJobs.jobs,
    tufHelperLiteDownloadedIds.levelIdSet,
    level,
    dlLink,
  );

  useBodyScrollLock(showEditPopup || showAddToPackPopup || showSongPopup || showArtistPopup);

  // Keep local like state in sync with the level data (search annotation or edits).
  useEffect(() => {
    setLikeCount(level?.likes ?? 0);
    if (typeof level?.isLiked === 'boolean') {
      setIsLiked(level.isLiked);
    }
  }, [level?.id, level?.likes, level?.isLiked]);

  // Bootstrap like state for surfaces that don't annotate isLiked (song detail,
  // packs, byId path). Skipped for guests and when already annotated.
  useEffect(() => {
    if (!user?.id || level?.id == null) return undefined;
    if (typeof level?.isLiked === 'boolean') return undefined;
    let cancelled = false;
    api
      .get(routes.database.levels.isLiked(level.id))
      .then((res) => {
        if (cancelled) return;
        setIsLiked(!!res.data?.isLiked);
        if (res.data?.likes !== undefined) setLikeCount(res.data.likes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, level?.id, level?.isLiked]);

  // Handlers
  const handleLikeToggle = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) {
      toast.error(t('cards.level.like.loginRequired', { defaultValue: 'You must be logged in to like levels' }));
      return;
    }
    if (isLiking || level?.id == null) return;

    const action = isLiked ? 'unlike' : 'like';
    const prevLiked = isLiked;
    const prevCount = likeCount;

    // Optimistic update
    setIsLiked(!prevLiked);
    setLikeCount((c) => Math.max(0, (c ?? 0) + (action === 'like' ? 1 : -1)));
    setIsLiking(true);

    try {
      const response = await api.put(routes.database.levels.like(level.id), { action });
      if (response.data?.success) {
        if (response.data.likes !== undefined) setLikeCount(response.data.likes);
        toast.success(
          action === 'like'
            ? t('cards.level.like.liked', { defaultValue: 'Level liked' })
            : t('cards.level.like.unliked', { defaultValue: 'Level unliked' })
        );
      } else {
        setIsLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } catch (error) {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error(t('cards.level.like.failed', { defaultValue: 'Failed to update like' }));
    } finally {
      setIsLiking(false);
    }
  };

  const handleLevelUpdate = (updatedData) => {
    if (updatedData?.permanentDelete) {
      return;
    }
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
  const handleTufHelperLiteClick = async (e) => {
    e.stopPropagation();

    if (!tufHelperLiteHealth.isAvailable || !dlLinkValid || tufHelperLiteDownload.state === 'downloading') {
      return;
    }

    try {
      if (level?.id != null) {
        await invokeTufHelperLiteIpc('level.open-from-id', {
          id: String(level.id),
          source: 'tuforums-levels',
          openAfterDownload: true,
        });
      } else {
        await invokeTufHelperLiteIpc('level.open-from-url', {
          url: dlLink,
          source: 'tuforums-levels',
          openAfterDownload: true,
        });
      }

      void checkTufHelperLiteJobs();
      void checkTufHelperLiteDownloadedIds();
    } catch {
      void checkTufHelperLiteHealth();
    }
  };

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

  const renderDifficultyIcon = ({ showRating = showEstimatedDifficulty, showCuration = true, showBaseScore = true } = {}) => (
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
          <MarqueeText className="level-exp" as="p">
            #{level.id} - {artistName}
          </MarqueeText>
        </div>
        <MarqueeText className="level-desc" as="p">
          {songName}
        </MarqueeText>
        {renderTagsWrapper()}
      </div>
    );
  };

  const renderCreatorInfo = () => (
    <div className="creator-wrapper">
      <p className="level-exp">{t('cards.level.creator')}</p>
      <MarqueeText className="level-desc" as="div">
        {formatCreatorDisplay(level)}
      </MarqueeText>
    </div>
  );

  const renderStatsIcons = ({ showLikes = true } = {}) => (
    <>
      <div className="icon-wrapper" data-opacity={level.clears ? 1 : 0}>
        <div className="clearcount-wrapper-inner">
          <div className="icon-value">{level.uniqueClears || 0}</div>
          <PassIcon color="#ffffff" size={"24px"} />
          {level.clears !== level.uniqueClears && (
          <div className="totalclears-wrapper-inner">
            <div
              className="icon-value"
              data-tooltip-id={"total-clears-tooltip"+level.id}
              data-tooltip-content={t('cards.level.totalClears')}
            >
              {level.clears || 0}
            </div>
          </div>
          )}        
        </div>
        <Tooltip id={"total-clears-tooltip"+level.id} place="left"/>


      </div>
      {showLikes && (
        user ? (
          <button
            type="button"
            className={`icon-wrapper level-card__like ${isLiked ? 'liked' : ''}`}
            data-opacity={1}
            onClick={handleLikeToggle}
            disabled={isLiking}
            aria-pressed={isLiked}
            aria-label={
              isLiked
                ? t('cards.level.like.unlike', { defaultValue: 'Unlike' })
                : t('cards.level.like.like', { defaultValue: 'Like' })
            }
          >
            <div className="icon-value">{likeCount || 0}</div>
            <LikeIcon color={isLiked ? "#ff2222" : "#ffffff00"} size={"22px"}/>
          </button>
        ) : (
          <div className="icon-wrapper" data-opacity={likeCount ? 1 : 0}>
            <div className="icon-value">{likeCount || 0}</div>
            <LikeIcon color={"#ffffff00"} size={"22px"}/>
          </div>
        )
      )}
    </>
  );

  const renderDownloadLinks = ({ 
    showVideo = true, 
    showDownload = true, 
    showSteam = true, 
    showTufHelperLite = true,
    showAddToPack = false,
    showDelete = false,
    editMarginZero = false
  } = {}) => (
    <div className="downloads-wrapper">
      {showVideo && level.videoLink && (
        <a href={getPrimaryVideoLink(level.videoLink)} target="_blank" rel="noopener noreferrer" onClick={onAnchorClick}>
          <VideoLinkIcon url={level.videoLink} color="#ffffff" size="24px" />
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
      {showDelete && canEdit && onDeleteItem && packItem && (
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
      {showTufHelperLite && showDownload && dlLinkValid && tufHelperLiteHealth.isAvailable && (
        <button
          type="button"
          className="tufhelperlite-button"
          onClick={handleTufHelperLiteClick}
          title={t('level.tufHelperLiteBanner.openWith')}
          aria-label={t('level.tufHelperLiteBanner.openWith')}
          disabled={tufHelperLiteDownload.state === 'downloading'}
          data-available="true"
          data-state={tufHelperLiteDownload.state}
          style={{ '--tufhelperlite-progress': `${Math.round(tufHelperLiteDownload.progress * 100)}%` }}
        >
          <span className="tufhelperlite-button__icon-stack" aria-hidden="true">
            <TUFHelperLiteIcon className="tufhelperlite-button__icon tufhelperlite-button__icon--base" size="100%" />
            <TUFHelperLiteIcon className="tufhelperlite-button__icon tufhelperlite-button__icon--color" size="100%" />
          </span>
        </button>
      )}
    </div>
  );

  const renderTagsWrapper = () => {

    const hasTags = tags && tags.length > 0;
    const hasMetadata = level.tilecount !== null || level.bpm !== null || level.levelLengthInMs !== null;
    return (
      <div className="level-underline-wrapper" 
       style={{ marginTop: hasTags && hasMetadata ? '' : '0' }}
      >
        {hasTags && (
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
        )}
      {hasMetadata ? (
        <div className={`metadata-block ${hasTags ? '' : 'no-tags'}`}>
          {level.levelLengthInMs !== null && (
            <div className="metadata-item">
              <TimeIcon size={18} />
              <span className="metadata-value">{formatDuration(level.levelLengthInMs)}</span>
            </div>
          )}
          {level.tilecount !== null && (() => {
            const autoTilecountTooltip = formatAutoTilecountTooltip(
              level.tilecount,
              level.autoTileCount,
            );
            const tilecountTooltipId = `tilecount-auto-tooltip-${level.id}`;
            return (
              <div
                className="metadata-item"
                {...(autoTilecountTooltip
                  ? {
                      'data-tooltip-id': tilecountTooltipId,
                      'data-tooltip-content': autoTilecountTooltip,
                    }
                  : {})}
              >
                <ChartIcon size={18} />
                <span className="metadata-value">{level.tilecount}</span>
                {autoTilecountTooltip && (
                  <Tooltip style={{ zIndex: 10, fontSize: '0.85rem', fontWeight: 500 }} id={tilecountTooltipId} place="bottom" />
                )}
              </div>
            );
          })()}
          {level.bpm !== null && (
          <div className="metadata-item">
            <MetronomeIcon size={18} />
            <span className="metadata-value">{clampFloat(level.bpm, 2)}</span>
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

  const renderLinkContent = ({ showLikes = true, showStats = true } = {}) => (
    <>
      <div className="level-card__row level-card__row--top">
        {renderDifficultyIcon()}
        {renderSongInfo()}
        {showStats && (
          <div className="level-card__stats">
            {renderStatsIcons({ showLikes })}
          </div>
        )}
      </div>
      <div className="level-card__row level-card__row--bottom">
        {renderCreatorInfo()}
      </div>
    </>
  );

  // ============================================
  // PACK MODE
  // ============================================
  const handlePackDragHandleClick = (e) => {
    if (!canEdit || !onRequestMove || !packItem) return;
    e.stopPropagation();
    onRequestMove(packItem);
  };

  if (displayMode === 'pack') {
    if (!level) {
      return (
        <div className={`level-card pack ${getGlowClass()}`}>
          {canEdit && dragHandleProps && (
            <div
              {...dragHandleProps}
              className="level-card__drag-handle"
              title="Click to move, or drag"
              onClick={handlePackDragHandleClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePackDragHandleClick(e);
                }
              }}
            >
              <DragHandleIcon />
            </div>
          )}
          <div className="level-card-wrapper">
            <p className="level-desc" style={{ padding: '0.75rem 1rem' }}>
              Level data unavailable
            </p>
            {canEdit && onDeleteItem && packItem && (
              <button type="button" className="level-card__delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteItem(packItem); }}>
                Remove from pack
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div 
        className={`level-card pack ${getGlowClass()}`} 
        data-deleted={level.isDeleted}
        data-hidden={level.isHidden && !level.isDeleted}
      >
        {canEdit && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="level-card__drag-handle"
            title="Click to move, or drag"
            onClick={handlePackDragHandleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePackDragHandleClick(e);
              }
            }}
          >
            <DragHandleIcon />
          </div>
        )}
        
        {renderClearedCheckmark({ noHover: !canEdit })}

        <div className="level-card-wrapper">
          <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
            {renderLinkContent({ showLikes: false })}
          </Link>
          {renderDownloadLinks({ showAddToPack: false, editMarginZero: true, showDelete: canEdit, showTufHelperLite: true })}
        </div>

        {renderPopups()}
      </div>
    );
  }

  // ============================================
  // NORMAL MODE (default)
  // ============================================
  return (
    <div 
      className={`level-card ${displayMode} ${getGlowClass()}`} 
      data-deleted={level.isDeleted}
      data-hidden={level.isHidden && !level.isDeleted}
    >
      <div className="level-card-wrapper">
        <Link className="level-card__link-wrap" to={levelDetailTo} aria-label={getSongDisplayName(level)}>
          {renderLinkContent({ showStats: false })}
        </Link>
        <div className="level-card__stats">
          {renderStatsIcons({ showLikes: true })}
        </div>
        {renderDownloadLinks({ showAddToPack: true })}
      </div>

      {renderPopups()}
    </div>
  );
};

export default LevelCard;
