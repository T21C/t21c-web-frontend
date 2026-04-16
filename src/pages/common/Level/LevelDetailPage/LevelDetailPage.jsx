/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import "./leveldetailpage.css"
import placeholder from "@/assets/placeholder/3.png";
import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useParams } from 'react-router-dom';
import { getPortalRoot } from "@/utils/portalRoot";

import {
  getVideoDetails
} from "@/utils";

import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { ClearCard } from "@/components/cards";
import { EditLevelPopup, LevelDownloadPopup } from "@/components/popups/Levels";
import { RatingDetailPopup } from "@/components/popups/Rating";
import { AddToPackPopup } from "@/components/popups/Packs";
import { SongPopup } from "@/components/popups/Songs";
import { ArtistPopup } from "@/components/popups/Artists";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { MetaTags } from "@/components/common/display";
import { StatusBanner } from "@/components/common/display/StatusBanner/StatusBanner";
import { 
  DownloadIcon, 
  EditIcon,
  HistoryListIcon, 
  LikeIcon, 
  SteamIcon, 
  PackIcon, 
  ChartIcon, 
  MetronomeIcon, 
  SpeedIcon, 
  LegacyDiffIcon, 
  PercentIcon, 
  CalendarIcon, 
  ScoreIcon,
  RefreshIcon,
  TimeIcon
} from "@/components/common/icons";
import { createEventSystem, formatBaseScore, formatCreatorDisplay, formatDate, isCdnUrl, selectIconSize } from "@/utils/Utility";
import { getSongDisplayName, getArtistDisplayName, formatDuration } from "@/utils/levelHelpers";
import { RouletteWheel, SlotMachine } from '@/components/common/selectors';
import { CloseButton } from '@/components/common/buttons';
import { toast } from 'react-hot-toast';
import { ABILITIES, hasBit } from '@/utils/Abilities';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import {
  getCurationTypesResolved,
  hasAbility,
  hydrateCurationWithCatalog,
  sortCurationsForDisplay,
  sortCurationTypesForDisplay,
} from "@/utils/curationTypeUtils";
import i18next from "i18next";

const minus2Reasons = []
const gimmickReasons = []


const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

const getHighScores = (players) => {
  if (!players?.length) return null;
  const sortedPlayers = players.sort((a, b) => 
    new Date(a.vidUploadTime) - new Date(b.vidUploadTime));
  return {
    firstClear: sortedPlayers[0],
    highestScore: sortedPlayers.reduce((a, b) => 
      b.scoreV2 > a.scoreV2 ? b : a),
    highestAcc: sortedPlayers.reduce((a, b) => 
      b.accuracy > a.accuracy ? b : a),
    highestSpeed: sortedPlayers.some(p => p.speed) ? 
      sortedPlayers.reduce((a, b) => (b.speed || 0) > (a.speed || 0) ? b : a) : null
  };
};


const SortIncidator = ({ direction }) => {
  return (
    <span className={`sort-direction-indicator ${direction === "desc" ? "flip-up" : "flip-down"}`}>
      🠇
    </span>
  );
};

const AliasesDropdown = ({ aliases, show, onClose }) => {
  const { t } = useTranslation('pages');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  if (!show || !aliases?.length) return null;

  return (
    <div className="aliases-dropdown" ref={dropdownRef} onClick={handleDropdownClick}>
      <div className="aliases-header">{t('levelDetail.aliases.header')}</div>
      <div className="aliases-list">
        {aliases.map((alias, index) => (
          <div key={index} className="alias-item">
            <span className="alias-label">{alias.alias}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TagsDropdown = ({ tags, show, onClose }) => {
  const { t } = useTranslation('pages');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  if (!show || !tags?.length) return null;

  // Sort tags by groupSortOrder then sortOrder
  const sortedTags = [...tags].sort((a, b) => {
    const groupOrderA = a.groupSortOrder ?? 0;
    const groupOrderB = b.groupSortOrder ?? 0;
    if (groupOrderA !== groupOrderB) return groupOrderA - groupOrderB;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  // Group tags by their group field
  const groupedTags = sortedTags.reduce((groups, tag) => {
    const groupName = tag.group || '';
    if (!groups[groupName]) {
      groups[groupName] = {
        name: groupName,
        tags: [],
        groupSortOrder: tag.groupSortOrder ?? 0
      };
    }
    groups[groupName].tags.push(tag);
    return groups;
  }, {});

  const orderedGroups = Object.values(groupedTags).sort((a, b) => a.groupSortOrder - b.groupSortOrder);

  return (
    <div className="tags-dropdown" ref={dropdownRef} onClick={handleDropdownClick}>
      <div className="tags-header">{t('levelDetail.tags.header') || 'Tags'}</div>
      <div className="tags-grouped-list">
        {orderedGroups.map((group) => (
          <div key={group.name || 'ungrouped'} className="tags-group">
            {group.name && <div className="tags-group-header">{group.name}</div>}
            <div className="tags-group-items">
              {group.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="tag-chip"
                  style={{
                    '--tag-bg-color': `${tag.color}40`,
                    '--tag-border-color': tag.color,
                    '--tag-text-color': tag.color
                  }}
                  title={tag.name}
                >
                  {tag.icon ? (
                    <img src={selectIconSize(tag.icon, "small")} alt={tag.name} className="tag-chip-icon" />
                  ) : (
                    <span className="tag-chip-letter">{tag.name.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="tag-chip-name">{tag.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FullInfoPopup = ({ level, onClose, videoDetail, difficulty }) => {
  const { t } = useTranslation('pages');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatCredits = () => {
    if (!level.levelCredits || level.levelCredits.length === 0) {
      return (
        <div className="each-info">
          <span>{t('levelDetail.info.creator')}:</span>
          <span>{level.creator}</span>
        </div>
      );
    }

    const creditsByRole = level.levelCredits.reduce((acc, credit) => {
      const role = credit.role.toLowerCase();
      if (!acc[role]) {
        acc[role] = [];
      }
      
      const aliasNames = credit.creator.creatorAliases?.slice(0, 6).map(alias => alias.name).join(', ');
      const moreCount = credit.creator.creatorAliases?.length > 6 ? ` (+${credit.creator.creatorAliases.length - 6} more)` : '';
      const creatorName = credit.creator.creatorAliases?.length > 0 
        ? `${credit.creator.name} (${aliasNames}${moreCount})`
        : credit.creator.name;
      acc[role].push({name: creatorName, isOwner: credit.isOwner});
      return acc;
    }, {});

    const charters = creditsByRole['charter'] || [];
    const vfxers = creditsByRole['vfxer'] || [];

    return (
      <div className="credits-grid">
        <div className="credits-column">
          <div className="role-header">{t('levelDetail.info.roles.charter')}</div>
          {charters.map((charter, index) => (
            <div key={`charter-${index}`} className="creator-item">
              {charter.isOwner && <div className="owner-badge" title="Owner">Owner</div>}
              <div className="creator-name">{charter.name}</div>
            </div>
          ))}
        </div>
        <div className="credits-column">
          <div className="role-header">{t('levelDetail.info.roles.vfxer')}</div>
          {vfxers.map((vfxer, index) => (
            <div key={`vfxer-${index}`} className="creator-name">{vfxer.name}</div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="level-detail-popup-overlay" onClick={onClose}></div>
      <div className="level-detail-popup popup-scale-up">
        <div className="popup-content">
          <div className="popup-header" style={{ '--popup-header-bg': difficulty?.color ? `#${difficulty.color}ff` : undefined }}>
            <h2>{getSongDisplayName(level)}</h2>
            <p>{getArtistDisplayName(level)}</p>
            <span className="createdAt">{t('levelDetail.info.createdAt')}: {formatDate(videoDetail?.timestamp || level.createdAt, i18next?.language)}</span>
            <CloseButton
              variant="floating"
              className="popup-close-button"
              onClick={onClose}
              title={t('levelDetail.buttons.close')}
              aria-label={t('levelDetail.buttons.close')}
            />
          </div>
          <div className="popup-body">
            <div className="team-info">
              {level.teamObject && (
                <div className="each-info team-name">
                  <span>{t('levelDetail.info.team')}:</span>
                  <span>{level.teamObject.name}</span>
                </div>
              )}
              <div className="each-info">
                <span>{t('levelDetail.info.difficulty')}:</span>
                <span>{difficulty?.name ?? '—'}</span>
              </div>
              {(level.baseScore || difficulty?.baseScore) && (
                <div className="each-info">
                  <span>{t('levelDetail.info.baseScore')}:</span>
                  <span>{level.baseScore || difficulty?.baseScore}PP</span>
                </div>
              )}
              {(level.ppBaseScore || difficulty?.ppBaseScore) && (
                <div className="each-info">
                  <span>{t('levelDetail.info.ppBaseScore')}:</span>
                  <span>{level.ppBaseScore || difficulty?.ppBaseScore}PP</span>
                </div>
              )}
              {level.aliases && level.aliases.length > 0 && (
                <div className="each-info">
                  <span>{t('levelDetail.info.aliases')}:</span>
                  <span>
                    {level.aliases.map(alias => 
                      `${alias.field}: ${alias.alias}`
                    ).join(', ')}
                  </span>
                </div>
              )}
              {level.publicComments && (
                <div className="each-info">
                  <span>{t('levelDetail.info.comments')}:</span>
                  <span>{level.publicComments}</span>
                </div>
              )}
            </div>
            {formatCredits()}
            <div className="links">
              {level.videoLink && (
                <a href={level.videoLink} target="_blank" rel="noopener noreferrer" title={t('levelDetail.links.thumbnailNotFound.goToVideo')}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ffffff" strokeWidth="1.5"/>
                    <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" stroke="#ffffff" strokeWidth="1.5"/>
                  </svg>
                </a>
              )}
              {level.dlLink && (
                <a href={level.dlLink} target="_blank" rel="noopener noreferrer" title={t('levelDetail.links.download')}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
              {level.workshopLink && (
                <a href={level.workshopLink} target="_blank" rel="noopener noreferrer" title={t('levelDetail.links.workshop')}>
                  <SteamIcon color="#ffffff" size={50} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ToRatePendingDropdown = ({ show, onClose, level, containerRef }) => {
  const { t } = useTranslation(['pages', 'common']);

  useEffect(() => {
    if (!show) return;
    const handlePointerDownCapture = (event) => {
      if (containerRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handlePointerDownCapture, true);
    return () => document.removeEventListener('mousedown', handlePointerDownCapture, true);
  }, [show, onClose, containerRef]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show || !level?.toRate) return null;

  const rerateNumRaw = level.rerateNum;
  const rerateNum =
    rerateNumRaw === undefined || rerateNumRaw === null ? '' : String(rerateNumRaw).trim();
  const rerateReason = typeof level.rerateReason === 'string' ? level.rerateReason.trim() : '';

  return (
    <div className="to-rate-pending-dropdown">
      <div className="to-rate-pending-header">{t('levelDetail.toRatePending.header')}</div>
      <div className="to-rate-pending-body">
        {rerateNum ? (
          <p>
            <b>{t('levelDetail.toRatePending.rerateNumber')}</b>
            <span>{rerateNum}</span>
          </p>
        ) : null}
        {rerateReason ? (
          <p className="to-rate-pending-reason">
            <b>{t('levelDetail.toRatePending.rerateMessage')}</b>
            <span>{rerateReason}</span>
          </p>
        ) : null}
        {!rerateNum && !rerateReason ? (
          <p className="to-rate-pending-empty">{t('levelDetail.toRatePending.noDetails')}</p>
        ) : null}
      </div>
    </div>
  );
};

const WeeklyAppearanceDropdown = ({ schedules, show, onClose, containerRef }) => {
  const { t } = useTranslation(['pages', 'common']);

  useEffect(() => {
    if (!show) return;
    const handlePointerDownCapture = (event) => {
      if (containerRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handlePointerDownCapture, true);
    return () => document.removeEventListener('mousedown', handlePointerDownCapture, true);
  }, [show, onClose, containerRef]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show || !schedules?.length) return null;

  // Sort schedules by weekStart (most recent first)
  const sortedSchedules = [...schedules].sort((a, b) => {
    return new Date(b.weekStart) - new Date(a.weekStart);
  });

  return (
    <div className="weekly-appearance-dropdown">
      <div className="weekly-appearance-header">{t('levelDetail.weeklyAppearance.header')}</div>
      <div className="weekly-appearance-list">
        {sortedSchedules.map((schedule, index) => (
          <div 
            key={schedule.id || index} 
            className={`weekly-appearance-item weekly-appearance-item-${schedule.listType}`}
          >
            <div className="weekly-appearance-date">
              {formatDate(schedule.weekStart, i18next?.language)}
            </div>
            <div className="weekly-appearance-list-type">
              {schedule.listType === 'primary' 
                ? t('levelDetail.weeklyAppearance.primary') 
                : t('levelDetail.weeklyAppearance.secondary')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RerateHistoryDropdown = ({ show, onClose, rerateHistory, difficultyDict, containerRef }) => {
  const { t } = useTranslation(['pages', 'common']);

  useEffect(() => {
    if (!show) return;
    const handlePointerDownCapture = (event) => {
      if (containerRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handlePointerDownCapture, true);
    return () => document.removeEventListener('mousedown', handlePointerDownCapture, true);
  }, [show, onClose, containerRef]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show || !rerateHistory?.length) return null;

  return (
    <div className="rerate-history-dropdown">
      <div className="rerate-history-header">{t('levelDetail.rerateHistory.header', { defaultValue: 'Rerate History' })}</div>
      <div className="rerate-history-sequence">
        {rerateHistory.slice().reverse().map((entry, idx) => {
          const prevDiff = difficultyDict[entry.previousDiffId];
          const newDiff = difficultyDict[entry.newDiffId];
          const legacyPrevDiff = entry.oldLegacyValue;
          const legacyNewDiff = entry.newLegacyValue;
          return (
            <div className="rerate-history-row" key={entry.id || idx}>
              <div className="rerate-history-step">
                <div className="rerate-history-icon" title={prevDiff?.name || entry.previousDiffId}>
                  {legacyPrevDiff ? 
                  <LegacyDiffIcon diff={legacyPrevDiff} /> 
                  : prevDiff?.icon ? 
                  <img src={prevDiff.icon} alt={prevDiff.name} /> 
                  : <span>{prevDiff?.name || entry.previousDiffId}</span>}
                  {(entry.previousBaseScore || difficultyDict[entry.previousDiffId]?.baseScore !== undefined) && <div className="rerate-history-basescore">{entry.previousBaseScore || difficultyDict[entry.previousDiffId]?.baseScore}PP</div>}
                </div>
                <span className="rerate-history-arrow">➔</span>
                <div className="rerate-history-icon" title={newDiff?.name || entry.newDiffId}>
                  {legacyNewDiff ? 
                  <LegacyDiffIcon diff={legacyNewDiff} /> 
                  : newDiff?.icon ? 
                  <img src={newDiff.icon} alt={newDiff.name} /> : <span>{newDiff?.name || entry.newDiffId}</span>}
                  {(entry.newBaseScore || difficultyDict[entry.newDiffId]?.baseScore !== undefined) && <div className="rerate-history-basescore">{entry.newBaseScore || difficultyDict[entry.newDiffId]?.baseScore}PP</div>}
                </div>
                <div className="rerate-history-meta">
                  <span>{formatDate(entry.createdAt, i18next?.language)}</span>
                  {entry.user && <span className="rerate-history-user">{entry.user.username || entry.reratedBy}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LevelBannerWarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const LevelDetailPage = ({ mockData = null }) => {
  const { t } = useTranslation(['pages', 'common']);
  const { id } = useParams();
  const detailPage = useLocation();
  
  // Use previewLevelId if in preview mode, otherwise use URL parameter
  const effectiveId = id || mockData?.level.id;
  const [res, setRes] = useState(null);
  const [leaderboardSort, setLeaderboardSort] = useState("SCR");
  const [sortDirection, setSortDirection] = useState("desc"); // "desc" or "asc"
  const [infoLoading, setInfoLoading] = useState(true);
  const [sortedLeaderboard, setSortedLeaderboard] = useState([]);
  const [clearCount, setClearCount] = useState(0);
  const [hasRepeatedClears, setHasRepeatedClears] = useState(false);
  const [videoDetail, setVideoDetail] = useState(null);

  // Custom styling state for curations
  const [curationStyles, setCurationStyles] = useState(null);
  
  // Expandable description state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [customStyleElement, setCustomStyleElement] = useState(null);
  const [customColorStyleElement, setCustomColorStyleElement] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Add support for external CSS overrides (for preview system)
  const [externalCssOverride, setExternalCssOverride] = useState(null);
  const [externalStyleElement, setExternalStyleElement] = useState(null);
  
  // Flag to disable default styling (for preview mode)
  const [disableDefaultStyling, setDisableDefaultStyling] = useState(false);

  const { user } = useAuth();

  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [showAddToPackPopup, setShowAddToPackPopup] = useState(false);
  const [showSongPopup, setShowSongPopup] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);

  const { difficultyDict, curationTypesDict, difficulties } = useDifficultyContext();

  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  const [isLongDescription, setIsLongDescription] = useState(false);

  const [hasSongPopup, setHasSongPopup] = useState(false);
  const [hasArtistPopup, setHasArtistPopup] = useState(false);


  const [clickedArtist, setClickedArtist] = useState(null);

  const [activeAliasDropdown, setActiveAliasDropdown] = useState(null);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [levelTimeout, setLevelTimeout] = useState(null);
  const [showWheel, setShowWheel] = useState(false);
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [slots, setSlots] = useState(3);
  const [showMinus2Reason, setShowMinus2Reason] = useState(false);
  const [showGimmickReason, setShowGimmickReason] = useState(false);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [showRerateDropdown, setShowRerateDropdown] = useState(false);
  const [rerateArrowEnabled, setRerateArrowEnabled] = useState(true);
  const [isRefreshingLeaderboard, setIsRefreshingLeaderboard] = useState(false);
  const [showWeeklyAppearanceDropdown, setShowWeeklyAppearanceDropdown] = useState(false);
  const [showToRatePendingDropdown, setShowToRatePendingDropdown] = useState(false);
  const weeklyHeaderCornerSlotRef = useRef(null);
  const toRateHeaderCornerSlotRef = useRef(null);
  const rerateHistoryAnchorRef = useRef(null);

  const closeWeeklyAppearanceDropdown = useCallback(() => setShowWeeklyAppearanceDropdown(false), []);
  const closeToRatePendingDropdown = useCallback(() => setShowToRatePendingDropdown(false), []);

  const handleArtistClick = (artist) => {
    setClickedArtist(artist);
    setShowArtistPopup(true);
  };

  useEffect(() => {
    setHasSongPopup(res?.level?.songObject !== undefined);
    setHasArtistPopup(res?.level?.songObject?.artists && res?.level?.songObject?.artists.length > 0);
  }, [res?.level]);

  useEffect(() => {
    setIsLongDescription(res?.level?.curation?.description?.length > 250);
  }, [res?.level?.curation?.description]);

  const curationsSorted = useMemo(() => {
    if (!res?.level) return [];
    const raw = res.level.curations?.length
      ? res.level.curations
      : res.level.curation
        ? [res.level.curation]
        : [];
    return sortCurationsForDisplay(raw, curationTypesDict).map((c) =>
      hydrateCurationWithCatalog(c, curationTypesDict)
    );
  }, [res?.level?.curations, res?.level?.curation, res?.level, curationTypesDict]);

  const themeCurationHydrated = useMemo(() => {
    if (!res?.level?.curation) return null;
    return hydrateCurationWithCatalog(res.level.curation, curationTypesDict);
  }, [res?.level?.curation, curationTypesDict]);

  const [hoveredCurationTooltipId, setHoveredCurationTooltipId] = useState(null);
  const [curationTooltipCoords, setCurationTooltipCoords] = useState({ top: 0, left: 0 });
  const curationTooltipAnchorRefs = useRef({});
  const curationTooltipCloseTimerRef = useRef(null);

  const clearCurationTooltipClose = useCallback(() => {
    if (curationTooltipCloseTimerRef.current) {
      clearTimeout(curationTooltipCloseTimerRef.current);
      curationTooltipCloseTimerRef.current = null;
    }
  }, []);

  const scheduleCurationTooltipClose = useCallback(() => {
    clearCurationTooltipClose();
    curationTooltipCloseTimerRef.current = setTimeout(() => {
      setHoveredCurationTooltipId(null);
      curationTooltipCloseTimerRef.current = null;
    }, 120);
  }, [clearCurationTooltipClose]);

  const updateCurationTooltipPosition = useCallback((curationId) => {
    const el = curationTooltipAnchorRefs.current[curationId];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCurationTooltipCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }, []);

  useLayoutEffect(() => {
    if (hoveredCurationTooltipId == null) return;
    updateCurationTooltipPosition(hoveredCurationTooltipId);
  }, [hoveredCurationTooltipId, updateCurationTooltipPosition]);

  useEffect(() => {
    if (hoveredCurationTooltipId == null) return;
    const onScrollOrResize = () => updateCurationTooltipPosition(hoveredCurationTooltipId);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [hoveredCurationTooltipId, updateCurationTooltipPosition]);

  useEffect(() => () => clearCurationTooltipClose(), [clearCurationTooltipClose]);

  const hoveredCurationForTooltip = useMemo(() => {
    if (hoveredCurationTooltipId == null) return null;
    return curationsSorted.find((c) => c.id === hoveredCurationTooltipId) ?? null;
  }, [hoveredCurationTooltipId, curationsSorted]);

  useEffect(() => {
    const uniqueClears = new Set(sortedLeaderboard.map(player => player.playerId));
    if (uniqueClears.size !== sortedLeaderboard.length) {
      setClearCount(uniqueClears.size.toString());
      setHasRepeatedClears(true);
    } else {
      setClearCount(sortedLeaderboard.length.toString());
      setHasRepeatedClears(false);
    }
  }, [sortedLeaderboard]);


  // Simple CSS sanitizer - remove dangerous content
  const sanitizeCSS = useCallback((css) => {
    if (!css) return '';
    // Remove potentially dangerous CSS
    /*
    return css
      .replace(/@import/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/expression\(/gi, '') 
      .replace(/behavior:/gi, '')
      .replace(/-moz-binding/gi, '');
      */
     return css; // trust admins 
  }, []);

  // Generate custom color CSS based on curation's custom color
  const createCustomColorCSS = useCallback((curation) => {
    if (!curation?.customColor) {
      return null;
    }

    const types = getCurationTypesResolved(curation, curationTypesDict);
    if (!types.some((t) => hasBit(t.abilities, ABILITIES.CUSTOM_COLOR_THEME))) {
      return null;
    }

    const customColor = curation.customColor;
    // Convert hex to RGB for CSS variables
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Convert RGB to HSL for hue shifting
    const rgbToHsl = (r, g, b) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h * 360, s * 100, l * 100];
    };

    // Convert HSL to hex
    function hslToHex(h, s, l) {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    }

    const rgb = hexToRgb(customColor);
    if (!rgb) return null;

    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hueShiftedColor = hslToHex((h + 60) % 360, s, l);

    return `
      .level-detail.curated[data-custom-color="true"] {
        --curation-primary: ${customColor};
        --curation-primary-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};
        --curation-primary-alpha: ${customColor}30;
        --curation-glow: ${customColor}80;
        --curation-type-color: ${customColor};
        --curation-type-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};
        --curation-type-alpha: ${customColor}30;
        --curation-hue-shift: ${hueShiftedColor};
        --glass-bg: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12);
        --glass-border: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3);
        --accent-color: ${customColor};
      }
    `;
  }, [curationTypesDict]);

  // Custom CSS injection system for curations
  const createCurationStyleSheet = useCallback((curation) => {
    if (!curation || !curation.customCSS) {
      return null;
    }

    const types = getCurationTypesResolved(curation, curationTypesDict);
    if (types.length > 0 && !types.some((t) => hasBit(t.abilities, ABILITIES.CUSTOM_CSS))) {
      return null;
    }

    return sanitizeCSS(curation.customCSS);
  }, [sanitizeCSS, curationTypesDict]);

  // Simple setter for external CSS overrides (for preview system)
  const setExternalCssOverrideValue = useCallback((css) => {
    // Remove existing external override styles
    if (externalStyleElement && externalStyleElement.parentNode) {
      externalStyleElement.parentNode.removeChild(externalStyleElement);
      setExternalStyleElement(null);
    }

    if (!css || !css.trim()) {
      setExternalCssOverride(null);
      return;
    }

    // Check if the curation type has the CUSTOM_CSS ability (for preview system)
    // Note: In preview mode, we allow CSS overrides regardless of ability for testing purposes
    // This allows admins to preview CSS even if the curation type doesn't have the ability

    // Create new external style element
    const style = document.createElement('style');
    style.type = 'text/css';
    
    style.innerHTML = sanitizeCSS(css);
    style.setAttribute('data-external-override', 'true');
    style.setAttribute('data-level-id', effectiveId);
    style.setAttribute('data-hmr-id', `external-${effectiveId}-${Date.now()}`);
    
    // Add to document head
    document.head.appendChild(style);
    setExternalStyleElement(style);
    setExternalCssOverride(css);
  }, [effectiveId, externalStyleElement, sanitizeCSS]);

  // Expose the setter function globally for the preview system
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.setCurationCssOverride = setExternalCssOverrideValue;
      window.setDisableDefaultStyling = setDisableDefaultStyling;
      
      // Cleanup function
      return () => {
        delete window.setCurationCssOverride;
        delete window.setDisableDefaultStyling;
      };
    }
  }, [setExternalCssOverrideValue]);

  const handleRerateDropdownClose = () => {
    setShowRerateDropdown(false);
    // Wait for mouseup before re-enabling the arrow
    const enableArrow = () => {
      setRerateArrowEnabled(true);
      window.removeEventListener('mouseup', enableArrow);
    };
    window.addEventListener('mouseup', enableArrow);
  };

  const handleRerateDropdownToggle = () => {
    if (!rerateArrowEnabled) return;
    if (showRerateDropdown) {
      handleRerateDropdownClose();
      return;
    }
    setShowRerateDropdown(true);
    setRerateArrowEnabled(false);
  };

  useEffect(() => {
    const modifiedSlots = createEventSystem({
      "3": 20,
      "4": 30,
      "5": 20,
      "6": 20,
      "7": 10
    });
    setSlots(parseInt(modifiedSlots() || 3));
  }, []);

  const handleAliasButtonClick = (field) => {
    setActiveAliasDropdown(current => current === field ? null : field);
  };

  const handleDropdownClose = () => {
    setActiveAliasDropdown(null);
    setShowTagsDropdown(false);
  };

  const handleTagsButtonClick = () => {
    setShowTagsDropdown(prev => !prev);
  };

  useEffect(() => {
    let interval;
    if (levelTimeout > 0) {
      interval = setInterval(() => {
        setLevelTimeout(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [levelTimeout]);

  const fetchIsLiked = useCallback(async () => {
    // Skip if no user or mock data
    if (!user?.id || mockData || !effectiveId) {
      return;
    }
    
    try {
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${effectiveId}/isLiked`);
      setRes(prevRes => {
        if (!prevRes) return prevRes;
        return {
          ...prevRes,
          isLiked: response.data.isLiked || false,
          level: {
            ...prevRes.level,
            likes: response.data.likes !== undefined ? response.data.likes : prevRes.level?.likes
          }
        };
      });
    } catch (error) {
      console.error("Error fetching like status:", error);
      // Set to false on error
      setRes(prevRes => {
        if (!prevRes) return prevRes;
        return {
          ...prevRes,
          isLiked: false
        };
      });
    }
  }, [effectiveId, user?.id, mockData]);

  /** accessCount + zip metadata for download popup (bpm/tilecount come from level in GET /levels/:id). */
  const fetchCdnDownloadExtras = useCallback(async () => {
    if (!effectiveId || mockData) {
      return;
    }

    try {
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${effectiveId}/cdnData`);
      setRes(prevRes => {
        if (!prevRes) return prevRes;
        return {
          ...prevRes,
          accessCount: response.data.accessCount ?? prevRes.accessCount,
          metadata: response.data.metadata ?? prevRes.metadata
        };
      });
    } catch (error) {
      console.error("Error fetching CDN download extras:", error);
    }
  }, [effectiveId, mockData]);

  const fetchPassesForLevel = useCallback(async () => {
    if (!effectiveId || mockData) {
      return;
    }

    try {
      const response = await api.get(`${import.meta.env.VITE_PASSES}/level/${effectiveId}`);
      const passes = Array.isArray(response.data) ? response.data : [];
      setRes(prevRes => {
        if (!prevRes?.level) return prevRes;
        return {
          ...prevRes,
          level: {
            ...prevRes.level,
            passes
          }
        };
      });
    } catch (error) {
      console.error("Error fetching passes for level:", error);
      setRes(prevRes => {
        if (!prevRes?.level) return prevRes;
        return {
          ...prevRes,
          level: {
            ...prevRes.level,
            passes: []
          }
        };
      });
    }
  }, [effectiveId, mockData]);

  const fetchRatingData = useCallback(async () => {
    if (!effectiveId || mockData) {
      return;
    }

    try {
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${effectiveId}/ratings`);
      setRes(prevRes => {
        if (!prevRes) return prevRes;
        return {
          ...prevRes,
          ratings: response.data ?? prevRes.ratings
        };
      });
    } catch (error) {
      console.error("Error fetching rating data:", error);
    }
  }, [effectiveId, mockData]);

  const fetchLevelData = useCallback(async (isRefresh = false) => {
    // Use mock data if provided - completely override everything
    if (mockData) {
      setRes(mockData);
      setNotFound(false);
      setInfoLoading(false);
      return;
    }
    
    if (isRefresh) {
      setIsRefreshingLeaderboard(true);
    }
    
    try {
      const levelData = await api.get(`${import.meta.env.VITE_LEVELS}/${effectiveId}`);

      if (levelData.data.timeout) {
        setLevelTimeout(levelData.data.timeout);
      }
      
      setRes(prevRes => ({
        ...prevRes,
        ...levelData.data,
        level: {
          ...levelData.data?.level,
          // Keep previous passes until fetchPassesForLevel overwrites (avoids empty leaderboard flash)
          passes: prevRes?.level?.passes
        },
        isLiked: prevRes?.isLiked ?? false
      }));
      setNotFound(false);
      
      if (isRefresh) {
        toast.success(t('levelDetail.leaderboard.refreshed'));
      }
      
      // Assemble extra bits from separate endpoints: passes, CDN download extras, like status
      await Promise.all([
        fetchPassesForLevel(),
        fetchCdnDownloadExtras(),
        fetchIsLiked(),
        fetchRatingData()
      ]);
    } catch (error) {
      console.error("Error fetching level data:", error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        setNotFound(true);
      }
      if (isRefresh) {
        toast.error(t('levelDetail.errors.refreshFailed'));
      }
    } finally {
      setInfoLoading(false);
      setIsRefreshingLeaderboard(false);
    }
  }, [effectiveId, mockData, t, fetchIsLiked, fetchCdnDownloadExtras, fetchPassesForLevel, fetchRatingData]);

  useEffect(() => {
    fetchLevelData();
  }, [effectiveId, mockData]); // Don't include fetchLevelData to avoid infinite loop

  useEffect(() => {
    if (res?.level?.videoLink) {
      getVideoDetails(res.level.videoLink).then(setVideoDetail);
    }
  }, [res?.level?.videoLink]);

  // Apply curation styles when level data changes
  useEffect(() => {
    // Don't apply default curation styles if disabled or external CSS override is active
    if (disableDefaultStyling || externalCssOverride) {
      // Remove custom curation styles
      if (customStyleElement && customStyleElement.parentNode) {
        customStyleElement.parentNode.removeChild(customStyleElement);
        setCustomStyleElement(null);
      }
      if (customColorStyleElement && customColorStyleElement.parentNode) {
        customColorStyleElement.parentNode.removeChild(customColorStyleElement);
        setCustomColorStyleElement(null);
      }
      setCurationStyles(null);
      return;
    }

    if (!themeCurationHydrated) {
      // Remove custom styles if no curation
      if (customStyleElement && customStyleElement.parentNode) {
        customStyleElement.parentNode.removeChild(customStyleElement);
        setCustomStyleElement(null);
      }
      if (customColorStyleElement && customColorStyleElement.parentNode) {
        customColorStyleElement.parentNode.removeChild(customColorStyleElement);
        setCustomColorStyleElement(null);
      }
      setCurationStyles(null);
      return;
    }

    const curation = themeCurationHydrated;
    
    // Handle custom color styles
    const customColorCSS = createCustomColorCSS(curation);
    if (customColorCSS) {
      // Remove existing custom color styles before creating new ones
      if (customColorStyleElement && customColorStyleElement.parentNode) {
        customColorStyleElement.parentNode.removeChild(customColorStyleElement);
        setCustomColorStyleElement(null);
      }

      // Create new color style element
      const colorStyle = document.createElement('style');
      colorStyle.type = 'text/css';
      colorStyle.innerHTML = customColorCSS;
      colorStyle.setAttribute('data-custom-color-styles', `level-${effectiveId}`);
      colorStyle.setAttribute('data-hmr-id', `color-${effectiveId}-${Date.now()}`);
      
      // Add to document head
      document.head.appendChild(colorStyle);
      setCustomColorStyleElement(colorStyle);
    }
    
    // Handle custom CSS styles
    const styleSheet = createCurationStyleSheet(curation);
    if (styleSheet) {
      // Remove existing custom styles before creating new ones
      if (customStyleElement && customStyleElement.parentNode) {
        customStyleElement.parentNode.removeChild(customStyleElement);
        setCustomStyleElement(null);
      }

      // Create new style element with !important declarations
      const style = document.createElement('style');
      style.type = 'text/css';
      
      
      style.innerHTML = styleSheet;
      style.setAttribute('data-curation-styles', `level-${effectiveId}`);
      style.setAttribute('data-hmr-id', `curation-${effectiveId}-${Date.now()}`);
      
      // Add to document head
      document.head.appendChild(style);
      setCustomStyleElement(style);
    }
    
    setCurationStyles(curation);

    // Cleanup on component unmount or when dependencies change
    return () => {
      // Clean up current style elements
      if (customStyleElement && customStyleElement.parentNode) {
        customStyleElement.parentNode.removeChild(customStyleElement);
      }
      if (customColorStyleElement && customColorStyleElement.parentNode) {
        customColorStyleElement.parentNode.removeChild(customColorStyleElement);
      }
    };
  }, [
    themeCurationHydrated,
    createCurationStyleSheet,
    createCustomColorCSS,
    effectiveId,
    externalCssOverride,
    disableDefaultStyling,
  ]);



  // Cleanup all custom styles when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all styles we created
      if (externalStyleElement && externalStyleElement.parentNode) {
        externalStyleElement.parentNode.removeChild(externalStyleElement);
      }
      if (customStyleElement && customStyleElement.parentNode) {
        customStyleElement.parentNode.removeChild(customStyleElement);
      }
      if (customColorStyleElement && customColorStyleElement.parentNode) {
        customColorStyleElement.parentNode.removeChild(customColorStyleElement);
      }
      
      // Also clean up any stray style elements that might have been left behind
      // Remove all curation-related style elements for this level
      const levelStyleElements = document.querySelectorAll(`[data-curation-styles="level-${effectiveId}"]`);
      levelStyleElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      const colorStyleElements = document.querySelectorAll(`[data-custom-color-styles="level-${effectiveId}"]`);
      colorStyleElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      const externalStyleElements = document.querySelectorAll(`[data-level-id="${effectiveId}"]`);
      externalStyleElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Remove global functions
      if (typeof window !== 'undefined') {
        delete window.setCurationCssOverride;
        delete window.setDisableDefaultStyling;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [detailPage]);

  useEffect(() => {
    if (res?.level) {
      document.title = `${getSongDisplayName(res.level)} - ${getArtistDisplayName(res.level)} | TUF`;
    } else {
      document.title = 'Loading Level... | TUF';
    }
  }, [res?.level]);

  function handleSort(sort) {
    if (leaderboardSort === sort) {
      // Same sort clicked, toggle direction
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      // Different sort clicked, use default descending for new sort
      setLeaderboardSort(sort);
      setSortDirection("desc");
    }
  }

  const sortLeaderboard = useCallback(() => {
    if (!res?.level?.passes) return [];
    const passes = [...res.level.passes]; // Create a copy to avoid mutating original array
    const isDescending = sortDirection === "desc";
    
    let sortedPasses = [];
    
    switch (leaderboardSort) {
      case 'TIME':
        sortedPasses = passes.sort((a, b) => {
          const dateA = a.vidUploadTime ? new Date(a.vidUploadTime) : new Date(0);
          const dateB = b.vidUploadTime ? new Date(b.vidUploadTime) : new Date(0);
          const result = dateA - dateB;
          return isDescending ? result : -result;
        });
        break;
      case 'ACC':
        sortedPasses = passes.sort((a, b) => {
          const result = (b.judgements?.accuracy || 0) - (a.judgements?.accuracy || 0);
          return isDescending ? result : -result;
        });
        break;
      case 'SPEED':
        sortedPasses = passes.sort((a, b) => {
          const result = (b.speed || 0) - (a.speed || 0);
          return isDescending ? result : -result;
        });
        break;
      case 'SCR':
      default:
        sortedPasses = passes.sort((a, b) => {
          const result = (b.scoreV2 || 0) - (a.scoreV2 || 0);
          return isDescending ? result : -result;
        });
        break;
    }
    return sortedPasses;
  }, [res?.level?.passes, leaderboardSort, sortDirection]);

  // Assign explicit sort order to passes data
  useEffect(() => {
    if (!res?.level?.passes) {
      setSortedLeaderboard([]);
      return;
    }

    // Get the sorted order and assign explicit sortOrder to each item
    const sorted = sortLeaderboard();
    
    // Assign sortOrder to the original passes based on the sorted position
    const passesWithSortOrder = res.level.passes.map(pass => {
      const sortedIndex = sorted.findIndex(sortedItem => sortedItem.id === pass.id);
      return {
        ...pass,
        _sortOrder: sortedIndex !== -1 ? sortedIndex+1 : 999 // Put unfound items at the end
      };
    });
    
    setSortedLeaderboard(passesWithSortOrder);
  }, [res?.level?.passes, leaderboardSort, sortDirection, sortLeaderboard]);

  // Helper function to get sorted leaderboard data
  const getSortedLeaderboard = () => {
    return [...sortedLeaderboard].sort((a, b) => (a._sortOrder || 999) - (b._sortOrder || 999));
  };

  function changeDialogState(){
    setOpenDialog(!openDialog)
  }

  const renderTitleWithAliases = (field) => {
    const level = res?.level;
    const aliases = level?.aliases?.filter(a => a.field === field) || [];
    const isOpen = activeAliasDropdown === field;
    
    // Check for normalized data
    const isSong = field === 'song';
    const isArtist = field === 'artist';
    const hasPopup = isSong ? hasSongPopup : hasArtistPopup;
      
    // Song title: always use level-title-text for consistent external styling
    if (isSong) {
      const songName = getSongDisplayName(level);
      const isClickable = hasSongPopup;
      return (
        <>
          <span
            className={`level-title-text${isClickable ? ' level-title-clickable' : ''}`}
            onClick={isClickable ? () => setShowSongPopup(true) : undefined}
            title={isClickable ? t('levelDetail.song.clickToViewDetails') : undefined}
          >
            {songName}
          </span>
          {aliases.length > 0 && (
            <>
              <span 
                className={`tag-list-arrow ${isOpen ? 'open' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleAliasButtonClick(field)}
              >
                ▼
              </span>
              <AliasesDropdown 
                aliases={aliases}
                show={isOpen}
                onClose={handleDropdownClose}
              />
            </>
          )}
        </>
      );
    }
      
    // Artist: use normalized list or plain text
    const displayName = hasPopup ? (
      <div className="level-artist-list-wrapper">
        {level.songObject?.artists.slice(0, 4).map((artist, index) => (
          <div key={artist.id}>
            <span 
              className="level-artist-name"
              onClick={() => handleArtistClick(artist)}
            >
              {artist.name}
            </span>
            {index < level.songObject?.artists.length - 1 && 
              <span className="level-artist-separator"> & </span>}
          </div>
        ))}
        {level.songObject?.artists.length > 4 && (
          <span className="level-artist-more">{t('levelDetail.artists.more', { count: level.songObject?.artists.length - 4 })}</span>
        )}
      </div>
    ) : (
      <span className="level-artist-text">{getArtistDisplayName(level)}</span>
    );
    
    const handleClick = (e) => {
      if (hasPopup) {
        e.stopPropagation();
        setShowArtistPopup(true);
      }
    };

    return (
      <>
        {hasPopup ? (
          <span 
            className="level-title-clickable-wrapper"
            onClick={handleClick}
            title="Click to view artist details"
          >
            {displayName}
          </span>
        ) : (
          displayName
        )}
        {aliases.length > 0 && !level.songObject?.artists && (
          <>
            <span 
              className={`tag-list-arrow ${isOpen ? 'open' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleAliasButtonClick(field)}
            >
              ▼
            </span>
            <AliasesDropdown 
              aliases={aliases}
              show={isOpen}
              onClose={handleDropdownClose}
            />
          </>
        )}
      </>
    );
  };

  const handleDifficultySelect = async (difficulty) => {
    setSelectedDifficulty(difficulty);
    setShowWheel(false);

    // Check if difficulty name is "-2"
    if (difficulty.name === "-2") {
      setShowMinus2Reason(true);
      return;
    }

    // Check if difficulty name is "Gimmick"
    if (difficulty.name === "Gimmick") {
      setShowGimmickReason(true);
      return;
    }

    // If difficulty has base score of 0 or any other case, show the slot machine
    if (difficulty.baseScore === 0) {
      setShowSlotMachine(true);
    }
    else {
      handleSubmitConfig(null, null, difficulty);
    }
  };

  const handleMinus2ReasonSelect = (reason) => {
    setShowMinus2Reason(false);
    handleSubmitConfig(0, reason);
  };

  const handleGimmickReasonSelect = (reason) => {
    setShowGimmickReason(false);
    setShowSlotMachine(true);
  };

  const handleBaseScoreComplete = (score) => {
    setShowSlotMachine(false);
    handleSubmitConfig(score);
  };

  const handleSubmitConfig = async (baseScore, publicComments = null, difficulty = null) => {
    if (!difficulty) difficulty = selectedDifficulty;
    
    try {
      const requestData = {
        diffId: difficulty.id,
        baseScore: baseScore
      };

      // Add publicComment if minus2 reason or gimmick reason is selected
      if (publicComments) {
        requestData.publicComments = publicComments;
      }

      const response = await api.put(`${import.meta.env.VITE_LEVELS}/${effectiveId}/timeout`, requestData);
      
      if (response.data.timeout) {
        setLevelTimeout(response.data.timeout);
      }

      if (response.data.level) {
        const levelPatch = { ...response.data.level };
        delete levelPatch.difficulty;
        setRes(prevRes => ({
          ...prevRes,
          level: {
            ...prevRes.level,
            ...levelPatch,
            baseScore: response.data.level.baseScore,
            publicComments: response.data.level.publicComments,
            passes: prevRes?.level?.passes
          }
        }));
      }

      toast.success('Level updated successfully!');
    } catch (error) {
      console.error('Failed to update level:', error);
      toast.error('Failed to update level');
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error(t('levelDetail.errors.loginRequired'));
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const action = res.isLiked ? 'unlike' : 'like';
      const response = await api.put(`${import.meta.env.VITE_LEVELS}/${effectiveId}/like`, { action });
      
      if (response.data.success) {
        setRes(prevRes => ({
          ...prevRes,
          isLiked: action === 'like',
          level: {
            ...prevRes.level,
            likes: response.data.likes
          }
        }));
        toast.success(action === 'like' ? t('levelDetail.messages.liked') : t('levelDetail.messages.unliked'));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(t('levelDetail.errors.likeFailed'));
    } finally {
      setIsLiking(false);
    }
  };

  // Find the download button click handler and replace it with:
  const handleDownloadClick = (e) => {
    e.preventDefault();
    if (isCdnUrl(res.level.dlLink)) {
        setShowDownloadPopup(true);
    } else {
        window.location.href = res.level.dlLink;
    }
  };

  if (notFound) {
    return (
      <div className="level-detail">
        
        <div className="wrapper-level">
          <StatusBanner tone="dangerGradient" placement="content" icon={<LevelBannerWarningIcon />}>
            {t('levelDetail.banners.notFound')}
          </StatusBanner>
        </div>
      </div>
    );
  }

  if (res == null)
    return (
      <div className="level-detail-loading-container">
        
        <div className="loader loader-level-detail"></div>
      </div>
    );

  if (difficulties.length === 0) {
    return (
      <div className="level-detail-loading-container">
        <div className="loader loader-level-detail"></div>
        <p
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            justifyContent: 'center',
            textAlign: 'center',
            marginTop: '1rem',
          }}
        >
          {t('level.loading.difficulties')}
        </p>
      </div>
    );
  }

  const difficulty = difficultyDict[res.level.diffId];
  
  // Use tags from level data, sorted by groupSortOrder then sortOrder
  const tags = [...(res.level.tags || [])].sort((a, b) => {
    const groupOrderA = a.groupSortOrder ?? 0;
    const groupOrderB = b.groupSortOrder ?? 0;
    if (groupOrderA !== groupOrderB) return groupOrderA - groupOrderB;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return (
    <div>
      <MetaTags
        title={getSongDisplayName(res?.level)}
        description={t('levelDetail.meta.description', { song: getSongDisplayName(res?.level), creator: res?.level?.creator })}
        url={currentUrl}
        image={''}
        type="article"
      />
      <div 
        className={`level-detail ${(res?.level?.curation && !externalCssOverride) || externalCssOverride ? 'curated' : ''}`}
        data-custom-styles={(externalCssOverride || curationStyles) ? "true" : undefined}
        data-custom-color={
          (() => {
            const cur = themeCurationHydrated;
            if (!cur?.customColor) return undefined;
            const types = getCurationTypesResolved(cur, curationTypesDict);
            return types.some((t) => hasBit(t.abilities, ABILITIES.CUSTOM_COLOR_THEME))
              ? "true"
              : undefined;
          })()
        }
        style={{
          '--header-bg-image': videoDetail?.image ? `url(${videoDetail.image})` : 'none'
        }}
      >
        

        <div className="wrapper-level">
        {res?.level?.isDeleted ? (
          <StatusBanner tone="dangerGradient" placement="content" icon={<LevelBannerWarningIcon />}>
            {t('levelDetail.banners.deleted')}
          </StatusBanner>
        ) : res?.level?.isHidden ? (
          <StatusBanner tone="neutral" placement="content" icon={<LevelBannerWarningIcon />}>
            {t('levelDetail.banners.hidden')}
          </StatusBanner>
        ) : null}
      
          <div className="header">
            <div className="left">

              {(res?.level?.curationSchedules?.length > 0 || res?.level?.toRate) && (
                <div className="level-detail-header-corner-icons">
                  {res?.level?.curationSchedules?.length > 0 && (
                    <div ref={weeklyHeaderCornerSlotRef} className="header-corner-icon-slot">
                      <div
                        className="header-corner-icon"
                        role="button"
                        tabIndex={0}
                        aria-expanded={showWeeklyAppearanceDropdown}
                        aria-haspopup="dialog"
                        aria-label={t('levelDetail.weeklyAppearance.header')}
                        title={t('levelDetail.weeklyAppearance.header')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWeeklyAppearanceDropdown((open) => !open);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowWeeklyAppearanceDropdown((open) => !open);
                          }
                        }}
                      >
                        <CalendarIcon
                          size={"20px"}
                          color="#fff"
                          className="weekly-appearance-icon-icon"
                        />
                      </div>
                      <WeeklyAppearanceDropdown
                        schedules={res?.level?.curationSchedules}
                        show={showWeeklyAppearanceDropdown}
                        onClose={closeWeeklyAppearanceDropdown}
                        containerRef={weeklyHeaderCornerSlotRef}
                      />
                    </div>
                  )}
                  {res?.level?.toRate && (
                    <div ref={toRateHeaderCornerSlotRef} className="header-corner-icon-slot">
                      <div
                        className="header-corner-icon"
                        role="button"
                        tabIndex={0}
                        aria-expanded={showToRatePendingDropdown}
                        aria-haspopup="dialog"
                        aria-label={t('levelDetail.toRatePending.header')}
                        title={t('levelDetail.toRatePending.header')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowToRatePendingDropdown((open) => !open);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowToRatePendingDropdown((open) => !open);
                          }
                        }}
                      >
                        <RefreshIcon color="#fff" size={"20px"} />
                      </div>
                      <ToRatePendingDropdown
                        level={res.level}
                        show={showToRatePendingDropdown}
                        onClose={closeToRatePendingDropdown}
                        containerRef={toRateHeaderCornerSlotRef}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="level-id mobile">#{effectiveId}</div>
              <div className="difficulty-curation-row">
              <div className="diff rerate-history-container">
                {difficulty?.icon ? (
                  <img
                    src={difficulty.icon}
                    alt={difficulty.name || 'Difficulty icon'}
                    className="difficulty-icon"
                  />
                ) : null}
                {res.ratings?.averageDifficultyId &&
                 difficultyDict[res.ratings?.averageDifficultyId]?.icon &&
                 difficultyDict[res.ratings?.averageDifficultyId]?.type == "PGU" &&
                 difficulty?.name?.includes("Q") ? (
                  <img
                    className="rating-icon"
                    src={difficultyDict[res.ratings?.averageDifficultyId]?.icon}
                    alt="Rating icon"
                  />
                ) : null}
                {res?.rerateHistory?.length > 0 && (
                  <div ref={rerateHistoryAnchorRef} className="rerate-history-dropdown-anchor">
                    <span
                      className={`rerate-arrow ${showRerateDropdown ? 'open' : ''}`}
                      onClick={handleRerateDropdownToggle}
                      title={t('levelDetail.rerateHistory.header', { defaultValue: 'Show rerate history' })}
                      data-disabled={!rerateArrowEnabled}
                    >
                      <HistoryListIcon className="rerate-history-icon" size={"24px"}/>
                      <span className="rerate-arrow-icon">&#9660;</span>
                    </span>
                    <RerateHistoryDropdown
                      rerateHistory={res?.rerateHistory}
                      show={showRerateDropdown}
                      onClose={handleRerateDropdownClose}
                      difficultyDict={difficultyDict}
                      containerRef={rerateHistoryAnchorRef}
                    />
                  </div>
                )}
                <div className="pp-display">
                  {formatBaseScore(res.level.baseScore || difficulty?.baseScore || 0)}PP
                </div>
                <div className="level-id">#{effectiveId}</div>
              </div>
              </div>
              <div className="title-container">
                <div className="level-title">
                  {renderTitleWithAliases('song')}
                </div>
                <div className="level-info">
                  <div className="level-creator">
                    {formatCreatorDisplay(res.level)}
                  </div>
                  <div className="level-separator">-</div>
                  <div className="level-artist">
                  {renderTitleWithAliases('artist')}
                  </div>
                </div>
                {(res.level?.tilecount || res.level?.bpm) && (
                  <div className="metadata-container">  
                  {!!res.level?.levelLengthInMs && (
                    <div className="metadata-item">
                      <TimeIcon size={22} />
                      <span className="metadata-value">{formatDuration(res.level.levelLengthInMs)}</span>
                    </div>
                  )}
                  {!!res.level?.tilecount && (
                    <div className="metadata-item">
                      <ChartIcon size={22} />
                      {/* <span className="metadata-label">Tilecount</span> */}
                      <span className="metadata-value">{res.level.tilecount}</span>
                    </div>
                  )}
                  {!!res.level?.bpm && (
                    <div className="metadata-item">
                      {/* <span className="metadata-icon">ICON</span> */}
                      {/* <span className="metadata-label">Start BPM</span> */}
                      <MetronomeIcon size={22} />
                      <span className="metadata-value">{res.level.bpm}</span>
                    </div>
                  )}
                  </div>
                )}
                
                {/* Tags display */}
                {tags && tags.length > 0 && (
                  <div className="level-tags-container" data-open={showTagsDropdown}>
                    <span 
                      className={`tag-list-arrow ${showTagsDropdown ? 'open' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={handleTagsButtonClick}
                    >
                      ▼
                    </span>
                    <div className="tags-icons-row">
                      {tags.map((tag, index) => (
                        <div
                          key={tag.id}
                          className="tag-icon-preview"
                          style={{
                            '--tag-bg-color': `${tag.color}50`,
                            '--tag-border-color': tag.color,
                            '--tag-text-color': tag.color,
                            '--tag-index': index
                          }}
                          data-letter-only={!tag.icon}
                          title={tag.name}
                        >
                          {tag.icon ? (
                            <img 
                              src={tag.icon} 
                              alt={tag.name}
                            />
                          ) : (
                            <span className="tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <TagsDropdown 
                      tags={tags}
                      show={showTagsDropdown}
                      onClose={handleDropdownClose}
                    />
                  </div>
                )}
              </div>

              {curationsSorted.length > 0 && (
                <div className="level-detail__curation-panel">
                  <div className="level-detail__curation-icons-row">
                    {curationsSorted.map((curation) => {
                      const typesSorted = sortCurationTypesForDisplay(
                        curation.types || [],
                        curationTypesDict
                      );
                      const typeLabel =
                        typesSorted.map((t) => t.name).join(', ') || 'Curation';
                      const assigner = curation.assignedByUser;
                      return (
                        <div
                          key={curation.id}
                          className="level-detail__curation-icon-with-tooltip"
                          ref={(el) => {
                            if (el) {
                              curationTooltipAnchorRefs.current[curation.id] = el;
                            } else {
                              delete curationTooltipAnchorRefs.current[curation.id];
                            }
                          }}
                          onMouseEnter={() => {
                            clearCurationTooltipClose();
                            setHoveredCurationTooltipId(curation.id);
                          }}
                          onMouseLeave={scheduleCurationTooltipClose}
                        >
                          <div
                            className="level-detail__curation-icon-cell"
                            title={typeLabel}
                          >
                          {typesSorted.map((t) => (
                            <img
                              key={t.id ?? t.name ?? t.icon}
                              src={t.icon}
                              alt={t.name || ''}
                              className="level-detail__curation-type-icon-img"
                            />
                          ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expandable Curation Description */}
              {(themeCurationHydrated?.types?.length > 0 || themeCurationHydrated?.type) &&
               themeCurationHydrated?.description &&
               themeCurationHydrated.description.trim() && (
                <div className={`curation-description-container ${isDescriptionExpanded ? 'expanded' : ''} ${isLongDescription ? 'expandable' : ''}`}>
                  <div 
                    className={`curation-description ${isDescriptionExpanded ? 'expanded' : ''}`}
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded && isLongDescription)}
                  >
                    <div className="curation-description-content">
                      {isDescriptionExpanded ? 
                        themeCurationHydrated.description : 
                        isLongDescription ? 
                          `${themeCurationHydrated.description.substring(0, 250)}...` : 
                          themeCurationHydrated.description
                      }
                    </div>
                    {isLongDescription && (
                      <div className="curation-description-toggle">
                        {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div 
                className="like-container"
                data-margin-auto={true}
              >
                <span className="like-count">{res.level.likes || 0}</span>
                <button 
                  data-tooltip-id="like-tooltip"
                  data-tooltip-content={
                    user ?
                      res.isLiked ? t('levelDetail.buttons.unlike') : t('levelDetail.buttons.like')
                    : t('levelDetail.tooltips.loginRequired')
                  }
                  className={
                    `like-button 
                    ${res.isLiked ? 'liked' : ''}
                    ${user ? 'available' : ''}`} 
                  onClick={handleLikeToggle}
                  disabled={isLiking || !user}
                >
                  <LikeIcon color={res.isLiked ? "#ff2222" : "none"} size={"24px"}/>
                </button>
                <Tooltip id="like-tooltip" place="bottom" noArrow />
              </div>
            </div>
            <div className="right">
              {(() => {
                // Check if user is a creator and count CHARTERS
                const isSuperAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
                let isCreator = false;
                const isOwner = res?.level?.levelCredits?.some(
                  credit => credit.creatorId === user?.creatorId && credit.isOwner
                );
                let charterCount = 0;
                let canEdit = false;

                if (user && res?.level?.levelCredits) {
                  // Count CHARTER roles
                  charterCount = res.level.levelCredits.filter(
                    credit => credit.role?.toLowerCase() === 'charter'
                  ).length;

                  // Check if user is one of the creators
                  isCreator = res.level.levelCredits.some(
                    credit => credit.creatorId === user?.creatorId && credit.role?.toLowerCase() === 'charter'
                  );

                  

                  // Determine if user can edit
                  if (isSuperAdmin || isOwner) {
                    canEdit = true;
                  } else if (isCreator && charterCount <= 2) {
                    canEdit = true;
                  } else if (isCreator && charterCount > 2) {
                    canEdit = false;
                  }
                } else if (isSuperAdmin) {
                  canEdit = true;
                }
                if (!isCreator && !isSuperAdmin && !isOwner) {
                  return null;
                }

                return (
                  <div>
                  <button 
                    className={`edit-button svg-stroke ${!canEdit ? 'disabled' : ''}`}
                    onClick={() => canEdit && setOpenEditDialog(true)}
                    disabled={!canEdit}
                    title={t('buttons.edit', { ns: 'common' })}
                    data-tooltip-id={!canEdit ? 'edit-disabled-tooltip' : undefined}
                    data-tooltip-content={!canEdit ? t('levelDetail.tooltips.editDisabled') : undefined}
                    style={
                      {...(
                        !canEdit ? { opacity: 0.5, cursor: 'not-allowed' }: {}),
                      }}
                  >
                    <EditIcon size={"34px"}/>
                  </button>
                  {!hasFlag(user, permissionFlags.SUPER_ADMIN) && (() => {
                const isCreator = user && res?.level?.levelCredits?.some(
                  credit => credit.creatorId === user?.creatorId && credit.isOwner
                );
                const charterCount = res?.level?.levelCredits?.filter(
                  credit => credit.role?.toLowerCase() === 'charter'
                ).length || 0;
                const showTooltip = !isCreator && charterCount > 2;
                
                return showTooltip ? <Tooltip id="edit-disabled-tooltip" place="left" noArrow style={{ zIndex: '1', maxWidth: '400px' }}/> : null;
              })()}
                  </div>
                );
              })()}
              {res.level.dlLink && res.level.dlLink.match(/http[s]?:\/\//) && (
                <button className="svg-stroke" href={res.level.dlLink} target="_blank" title={t('levelDetail.links.download')} onClick={handleDownloadClick}>
                  <DownloadIcon size={"36px"}/>
                  {res.accessCount !== undefined && <span className="access-count">{res.accessCount || 0}</span>}
                </button>
              )}
              {res.level.workshopLink && (
                <button className="svg-stroke" onClick={() => window.open(res.level.workshopLink, '_blank')} target="_blank" title={t('levelDetail.links.workshop')}>
                  <SteamIcon color="#ffffff" size={"34px"} />
                </button>
              )}
              {user && (
                <button 
                  className="svg-stroke" 
                  onClick={() => setShowAddToPackPopup(true)}
                  title={t('levelDetail.buttons.addToPack')}
                >
                  <PackIcon color="#ffffff" size={"34px"} />
                </button>
              )}
              {res.ratings && (
                <button 
                  className="rating-button svg-stroke"
                  onClick={() => setShowRatingPopup(true)}
                  title={t('levelDetail.buttons.viewRating')}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 12L10 15L17 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="level-detail-body">

            <div className="info">
              {sortedLeaderboard.length > 0 ? (<>
              <div className="info-item">
                <p>{t('levelDetail.stats.firstClear.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      t('levelDetail.stats.firstClear.value', {
                        player: getHighScores(getSortedLeaderboard()).firstClear.player.name,
                        date: getHighScores(getSortedLeaderboard()).firstClear.vidUploadTime.slice(0, 10)
                      })
                      : "-")
                    : t('levelDetail.stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{t('levelDetail.stats.highestScore.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      t('levelDetail.stats.highestScore.value', {
                        player: getHighScores(res?.level?.passes).highestScore.player.name,
                        score: getHighScores(res?.level?.passes).highestScore.scoreV2.toFixed(2)
                      })
                      : "-")
                    : t('levelDetail.stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{t('levelDetail.stats.highestSpeed.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 && getHighScores(res?.level?.passes).highestSpeed ? 
                      t('levelDetail.stats.highestSpeed.value', {
                        player: getHighScores(res?.level?.passes).highestSpeed.player.name,
                        speed: getHighScores(res?.level?.passes).highestSpeed.speed || 1
                      })
                      : "-")
                    : t('levelDetail.stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{t('levelDetail.stats.highestAccuracy.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      t('levelDetail.stats.highestAccuracy.value', {
                        player: getHighScores(res?.level?.passes).highestAcc.player.name,
                        accuracy: (getHighScores(res?.level?.passes).highestAcc.accuracy * 100).toFixed(2)
                      })
                      : "-")
                    : t('levelDetail.stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{t('levelDetail.stats.totalClears.label')}</p>
                <span 
                  className="info-desc" 
                  data-tooltip-id="total-clears-tooltip" 
                  data-tooltip-content={
                    hasRepeatedClears 
                      ? t('levelDetail.stats.totalClears.tooltip', { unique: clearCount, total: sortedLeaderboard.length }) 
                      : undefined
                  }
                  >
                    {!infoLoading ? 
                      `${sortedLeaderboard.length} (${clearCount})` 
                      : t('levelDetail.stats.waiting')}
                </span>
                {hasRepeatedClears && <Tooltip id="total-clears-tooltip" place="left" noArrow />}
              </div>
              </>
              ) : (
                <div className="not-beaten-container">
                  <p className="not-beaten-text">{t('levelDetail.leaderboard.notBeaten')}</p>
                  <p className="challenge-text">{t('levelDetail.leaderboard.challenge')}</p>
                </div>
              )}


              <button className="info-button" onClick={changeDialogState}>
                {t('levelDetail.dialog.fullInfo')}
              </button>
            </div>

            <div className="youtube">
              {videoDetail ? 
                <iframe
                  src={videoDetail.embed}
                  title="Video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              :
                <div
                  className="thumbnail-container"
                  style={{
                    '--thumbnail-bg-image': `url(${videoDetail? videoDetail.image: placeholder})`,
                  }}
                >
                  <div className="thumbnail-text">
                    <p>{t('levelDetail.links.thumbnailNotFound.text')}</p>
                    {res.level.videoLink && 
                      <a href={res.level.videoLink}>{t('levelDetail.links.thumbnailNotFound.goToVideo')}</a>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div className="rank">
            <div className="rank-header">
              <h1>{t('levelDetail.leaderboard.header')}</h1>
              {/*
              <button 
                className={`refresh-leaderboard-button ${isRefreshingLeaderboard ? 'refreshing' : ''}`}
                onClick={() => fetchLevelData(true)}
                disabled={isRefreshingLeaderboard}
                title={t('levelDetail.leaderboard.refresh')}
              >
                <RefreshIcon size="20px" />
              </button>
              */}
            </div>
            {sortedLeaderboard.length > 0 ? (
              <div className="leaderboard-sort">
                <Tooltip id="tm" place="top" noArrow>
                  {t('levelDetail.leaderboard.tooltips.time')}
                </Tooltip>
                <Tooltip id="ac" place="top" noArrow>
                  {t('levelDetail.leaderboard.tooltips.accuracy')}
                </Tooltip>
                <Tooltip id="sc" place="top" noArrow>
                  {t('levelDetail.leaderboard.tooltips.score')}
                </Tooltip>
                <Tooltip id="sp" place="top" noArrow>
                  {t('levelDetail.leaderboard.tooltips.speed')}
                </Tooltip>

                <div className="sort-button-container" onClick={() => handleSort("TIME")}>
                  <CalendarIcon 
                  className={`svg-stroke ${leaderboardSort === "TIME" ? "active" : ""}`} 
                  data-tooltip-id = "tm" 
                  value="TIME" 
                  />
                  {leaderboardSort === "TIME" && (
                    <SortIncidator direction={sortDirection} />
                  )}
                </div>

                <div className="sort-button-container" onClick={() => handleSort("ACC")}>
                  <PercentIcon 
                  className={`svg-fill ${leaderboardSort === "ACC" ? "active" : ""}`} 
                  data-tooltip-id = "ac"
                  value="ACC" 
                  />
                  {leaderboardSort === "ACC" && (
                    <SortIncidator direction={sortDirection} />
                  )}
                </div>


                <div className="sort-button-container" onClick={() => handleSort("SPEED")}>
                  <SpeedIcon className={`svg-fill ${leaderboardSort === "SPEED" ? "active" : ""}`} data-tooltip-id = "sp" />
                  {leaderboardSort === "SPEED" && (
                    <SortIncidator direction={sortDirection} />
                  )}
                </div>

                
                <div className="sort-button-container" onClick={() => handleSort("SCR")}>
                  <ScoreIcon className={`svg-fill ${leaderboardSort === "SCR" ? "active" : ""}`} data-tooltip-id = "sc" value="SCR" />
                  {leaderboardSort === "SCR" && (
                    <SortIncidator direction={sortDirection} />
                  )}
                </div>
              </div>
            ) : <></>}
            <div className="rank-list">
              {!infoLoading ? 
                sortedLeaderboard.length > 0 ? (
                  getSortedLeaderboard().map((each, index) => (
                    <ClearCard 
                      scoreData={each} 
                      index={index} 
                      key={`${each.id}`}
                    />
                  ))
                ) : (
                  <h3>{t('levelDetail.leaderboard.noClearsYet')}</h3>
                )
                :
                <div className="loader loader-level-detail-rank"></div>
              }
            </div>
          </div>
          {openEditDialog && (
        <EditLevelPopup
          level={res.level}
          onClose={() => setOpenEditDialog(false)}
          onUpdate={(updatedLevel) => {
            const newLevel = updatedLevel.level || updatedLevel;
            setRes(prevRes => ({
              ...prevRes,
              level: {
                ...prevRes.level,
                ...newLevel,
                aliases: newLevel.aliases ?? prevRes.level?.aliases,
                passes: prevRes?.level?.passes
              },
              rerateHistory: updatedLevel.rerateHistory ?? prevRes.rerateHistory
            }));
          }}
        />
      )}

      {showRatingPopup && res.ratings && (
          <RatingDetailPopup
            selectedRating={{
              ...res.ratings,
              level: res.level
            }}
            showingConfirmed={true}
            setSelectedRating={() => setShowRatingPopup(false)}
            enableReferences={false}
          />
      )}

      {showAddToPackPopup && res.level && (
        <AddToPackPopup
          level={res.level}
          onClose={() => setShowAddToPackPopup(false)}
          onSuccess={() => {
            fetchLevelData(false);
          }}
        />
      )}

      {openDialog && (
        <FullInfoPopup
          level={res.level}
          onClose={changeDialogState}
          videoDetail={videoDetail}
          difficulty={difficulty}
        />
      )}


        </div>
        {showWheel && ENABLE_ROULETTE && (
        <RouletteWheel
          items={Object.values(difficultyDict)}
          onSelect={handleDifficultySelect}
          onClose={() => !isSpinning && setShowWheel(false)}
          enableGimmicks={true}
        />
      )}

      {showMinus2Reason && ENABLE_ROULETTE && (
        <RouletteWheel
          items={minus2Reasons}
          onSelect={handleMinus2ReasonSelect}
          onClose={() => !isSpinning && setShowMinus2Reason(false)}
          mode="text"
          colors={['#e74c3c', '#c0392b']}
        />
      )}

      {showGimmickReason && ENABLE_ROULETTE && (
        <RouletteWheel
          items={gimmickReasons}
          onSelect={handleGimmickReasonSelect}
          onClose={() => !isSpinning && setShowGimmickReason(false)}
          mode="text"
          colors={['#f39c12', '#d35400']}
        />
      )}

      {showSlotMachine && ENABLE_ROULETTE && (
        <SlotMachine
          onComplete={handleBaseScoreComplete}
          onClose={() => setShowSlotMachine(false)}
          slots={slots}
        />
      )}

      {showSongPopup && res.level && hasSongPopup && (
        <SongPopup
          song={res.level.songObject}
          onClose={() => setShowSongPopup(false)}
        />
      )}
      {showArtistPopup && res.level && hasArtistPopup && (
        <ArtistPopup
          artist={clickedArtist}
          onClose={() => {
            setShowArtistPopup(false);
            setClickedArtist(null);
          }}
        />
      )}
      {showDownloadPopup && (
          <LevelDownloadPopup
              isOpen={showDownloadPopup}
              onClose={() => setShowDownloadPopup(false)}
              levelId={id}
              dlLink={res.level.dlLink}
              legacyDllink={res.level.legacyDllink}
              metadata={res.metadata}
              incrementAccessCount={() => setRes(prevRes => ({
                ...prevRes,
                accessCount: (prevRes.accessCount || 0) + 1
              }))}
          />
      )}

      {hoveredCurationForTooltip &&
        createPortal(
          (() => {
            const typesSortedPortal = sortCurationTypesForDisplay(
              hoveredCurationForTooltip.types || [],
              curationTypesDict
            );
            const typeLabelPortal = typesSortedPortal.map((t) => t.name).join(", ") || "Curation";
            const assignerPortal = hoveredCurationForTooltip.assignedByUser;
            return (
              <div
                className="curation-tooltip-dropdown level-detail__curation-inline-assignee curation-tooltip-dropdown--portal"
                role="tooltip"
                style={{
                  position: "fixed",
                  top: curationTooltipCoords.top,
                  left: curationTooltipCoords.left,
                  transform: "translateX(-50%)",
                  zIndex: 121,
                }}
                onMouseEnter={clearCurationTooltipClose}
                onMouseLeave={scheduleCurationTooltipClose}
              >
                <div className="curation-tooltip-type">{typeLabelPortal}</div>
                {typesSortedPortal.every((t) => hasAbility(t, ABILITIES.SHOW_ASSIGNER)) && (
                  <>
                    <div className="curation-tooltip-assigned">assigned by</div>
                    <div className="curation-tooltip-user">
                      {assignerPortal?.avatarUrl && (
                        <img
                          className="curation-tooltip-avatar"
                          src={selectIconSize(assignerPortal.avatarUrl, "small")}
                          alt={assignerPortal.nickname || "User"}
                        />
                      )}
                      <span className="curation-tooltip-name">
                        {assignerPortal?.nickname || "Unknown"}
                      </span>
                      <span className="curation-tooltip-username">
                        @{assignerPortal?.username || "unknown"}
                      </span>
                    </div>
                  </>
                )}
                <div className="curation-tooltip-time">
                  Updated on {formatDate(hoveredCurationForTooltip.updatedAt, i18next?.language)}
                </div>
              </div>
            );
          })(),
          getPortalRoot()
        )}

      </div>
    </div>
  );
};

export default LevelDetailPage;
