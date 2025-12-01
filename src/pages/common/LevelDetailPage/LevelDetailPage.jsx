/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import "./leveldetailpage.css"
import placeholder from "@/assets/placeholder/3.png";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocation, useParams } from 'react-router-dom';
import { CompleteNav } from "@/components/layout";
import {
  getVideoDetails
} from "@/utils";

import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { ClearCard } from "@/components/cards";
import { EditLevelPopup } from "@/components/popups/EditLevelPopup/EditLevelPopup";
import { RatingDetailPopup } from "@/components/popups/RatingDetailPopup/RatingDetailPopup";
import { AddToPackPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { MetaTags } from "@/components/common/display";
import { 
  DownloadIcon, 
  EditIcon,
  HistoryListIcon, 
  InfoIcon, 
  LikeIcon, 
  SteamIcon, 
  PackIcon, 
  ChartIcon, 
  MetronomeIcon, 
  SpeedIcon, 
  LegacyDiffIcon, 
  PercentIcon, 
  CalendarIcon, 
  ScoreIcon
} from "@/components/common/icons";
import { createEventSystem, formatCreatorDisplay, formatDate } from "@/utils/Utility";
import { RouletteWheel, SlotMachine } from '@/components/common/selectors';
import { toast } from 'react-hot-toast';
import LevelDownloadPopup from '../../../components/popups/LevelDownloadPopup/LevelDownloadPopup';
import { ABILITIES, hasBit } from '@/utils/Abilities';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import i18next from "i18next";

const minus2Reasons = []
const gimmickReasons = []


const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

const accuracyLabel = {
  "-5": "Extremely underrated",
  "-4": "Very underrated",
  "-3": "Significantly underrated",
  "-2": "Underrated",
  "-1": "Slightly underrated",
  "0": "Perfect",
  "1": "Slightly overrated",
  "2": "Overrated",
  "3": "Significantly overrated",
  "4": "Very overrated",
  "5": "Extremely overrated"
};

const getRatingAccuracyColor = (value) => {
  const digit = Math.abs(value).toString()[0];
  if (digit === "0") return "#00ff00";
  if (digit === "1") return "#99ff00"; 
  if (digit === "2") return "#ffff00";
  if (digit === "3") return "#ff9900";
  if (digit === "4") return "#ff6600";
  if (digit === "5") return "#ff0000";
  return "#ff0000";
};

const getHighScores = (players) => {
  if (!players?.length) return null;
  
  return {
    firstClear: players
    .sort(((a, b) => 
      new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b))
    .reduce((a, b) => 
      new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b),
    highestScore: players
    .sort(((a, b) => 
      new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b))
    .reduce((a, b) => 
      b.scoreV2 > a.scoreV2 ? b : a),
    highestAcc: players
    .sort(((a, b) => 
      new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b))
    .reduce((a, b) => 
      b.accuracy > a.accuracy ? b : a),
    highestSpeed: players.some(p => p.speed) ? 
      players
      .sort(((a, b) => 
        new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b))
      .sort((a, b) => (b.scoreV2 || 0) - (a.scoreV2 || 0))
      .reduce((a, b) => (b.speed || 0) > (a.speed || 0) ? b : a) : null
  };
};


const SortIncidator = ({ direction }) => {
  return (
    <span className={`sort-direction-indicator ${direction === "desc" ? "flip-up" : "flip-down"}`}>
      🠇
    </span>
  );
};

const AliasesDropdown = ({ field, aliases, show, onClose }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
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
      <div className="aliases-header">{tLevel('aliases.header')}</div>
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

const RatingVotesDropdown = ({ votes, show, onClose }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
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

  if (!show) return null;

  return (
    <div className="rating-votes-dropdown" ref={dropdownRef} onClick={handleDropdownClick}>
      <div className="rating-votes-header">{tLevel('ratingAccuracy.votesHeader')}</div>
      <div className="rating-votes-list">
        {votes.length > 0 ? votes.map((vote, index) => (
          <div key={index} className="rating-vote-item">
            <span className="rating-vote-user">{vote.user.name}</span>
            <span 
              className="rating-vote-value"
            >
              {vote.user.player.name} - <span 
                style={{ 
                  color: getRatingAccuracyColor(vote.vote),
                  textShadow: `0 0 5px ${getRatingAccuracyColor(vote.vote)}66`,
                  whiteSpace: 'nowrap'
                }}>{accuracyLabel[vote.vote.toString()]}</span>
            </span>
          </div>
        )) : <div className="rating-votes-empty">{tLevel('ratingAccuracy.noVotes')}</div>}
      </div>
    </div>
  );
};

const FullInfoPopup = ({ level, onClose, videoDetail, difficulty }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);

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
          <span>{tLevel('info.creator')}:</span>
          <span>{level.creator}</span>
        </div>
      );
    }

    const creditsByRole = level.levelCredits.reduce((acc, credit) => {
      const role = credit.role.toLowerCase();
      if (!acc[role]) {
        acc[role] = [];
      }
      
      const creatorName = credit.creator.creatorAliases?.length > 0 
        ? `${credit.creator.name} (${
          credit.creator.creatorAliases
          .slice(0, 6)
          .map(alias => alias.name)
          .join(', ')}
          ${credit.creator.creatorAliases.length > 6 ? `(${credit.creator.creatorAliases.length - 6} more)` : ''})`
        : credit.creator.name;
      acc[role].push(creatorName);
      return acc;
    }, {});

    const charters = creditsByRole['charter'] || [];
    const vfxers = creditsByRole['vfxer'] || [];

    return (
      <div className="credits-grid">
        <div className="credits-column">
          <div className="role-header">{tLevel('info.roles.charter')}</div>
          {charters.map((charter, index) => (
            <div key={`charter-${index}`} className="creator-name">{charter}</div>
          ))}
        </div>
        <div className="credits-column">
          <div className="role-header">{tLevel('info.roles.vfxer')}</div>
          {vfxers.map((vfxer, index) => (
            <div key={`vfxer-${index}`} className="creator-name">{vfxer}</div>
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
          <div className="popup-header" style={{ backgroundColor: `#${difficulty.color}ff` }}>
            <h2>{level.song}</h2>
            <p>{level.artist}</p>
            <span className="createdAt">{tLevel('info.createdAt')}: {formatDate(videoDetail?.timestamp || level.createdAt, i18next?.language)}</span>
            <button className="popup-close-button" onClick={onClose} title={tLevel('buttons.close')}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="popup-body">
            <div className="team-info">
              {level.teamObject && (
                <div className="each-info team-name">
                  <span>{tLevel('info.team')}:</span>
                  <span>{level.teamObject.name}</span>
                </div>
              )}
              <div className="each-info">
                <span>{tLevel('info.difficulty')}:</span>
                <span>{difficulty.name}</span>
              </div>
              {(level.baseScore || difficulty.baseScore) && (
                <div className="each-info">
                  <span>{tLevel('info.baseScore')}:</span>
                  <span>{level.baseScore || difficulty.baseScore}PP</span>
                </div>
              )}
              {level.aliases && level.aliases.length > 0 && (
                <div className="each-info">
                  <span>{tLevel('info.aliases')}:</span>
                  <span>
                    {level.aliases.map(alias => 
                      `${alias.field}: ${alias.alias}`
                    ).join(', ')}
                  </span>
                </div>
              )}
              {level.publicComments && (
                <div className="each-info">
                  <span>{tLevel('info.comments')}:</span>
                  <span>{level.publicComments}</span>
                </div>
              )}
            </div>
            {formatCredits()}
            <div className="links">
              {level.videoLink && (
                <a href={level.videoLink} target="_blank" rel="noopener noreferrer" title={tLevel('links.thumbnailNotFound.goToVideo')}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ffffff" strokeWidth="1.5"/>
                    <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" stroke="#ffffff" strokeWidth="1.5"/>
                  </svg>
                </a>
              )}
              {level.dlLink && (
                <a href={level.dlLink} target="_blank" rel="noopener noreferrer" title={tLevel('links.download')}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
              {level.workshopLink && (
                <a href={level.workshopLink} target="_blank" rel="noopener noreferrer" title={tLevel('links.workshop')}>
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


// Rating Accuracy Vote Dialog
const RatingAccuracyDialog = ({ isOpen, onClose, onSave, initialValue = 0 }) => {
  const [value, setValue] = useState(initialValue);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);

  // Reset value when dialog opens
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  // Handle pointer move during drag (works for both mouse and touch)
  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = sliderRef.current.getBoundingClientRect();
    const pixelRange = rect.width;
    const valueRange = 10; // -5 to 5 = 10 range
    const pixelMoved = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, pixelMoved / pixelRange));
    const newValue = Math.round((percentage * valueRange) - 5);
    
    setValue(newValue);
  }, [isDragging]);

  // Handle pointer up (works for both mouse and touch)
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Handle track click
  const handleTrackClick = useCallback((e) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pixelMoved = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, pixelMoved / rect.width));
    const newValue = Math.round((percentage * 10) - 5);
    
    setValue(newValue);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Prevent default drag behavior
  const preventDrag = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(value);
    onClose();
  }, [value, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="rating-accuracy-dialog">
      <div className="rating-accuracy-dialog-content">
        <div className="rating-accuracy-dialog-header">
          <div className="rating-accuracy-dialog-title">
            {tLevel('components.ratingAccuracy.title')}
          </div>
          <button 
            className="rating-accuracy-dialog-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="rating-accuracy-dialog-description">
          {tLevel('components.ratingAccuracy.description')}
        </div>
        
        <div className="rating-accuracy-dialog-slider">
          <div 
            ref={sliderRef}
            className="rating-accuracy-dialog-slider-container"
            onClick={handleTrackClick}
            onTouchStart={handleTrackClick}
          >
            <div 
              className="rating-accuracy-dialog-slider-marker"
              style={{ 
                left: `${((value + 5) / 10) * 100}%`,
                backgroundColor: getRatingAccuracyColor(value)
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              onDragStart={preventDrag}
              draggable="false"
            >
              {value}
            </div>
          </div>
        </div>
        
        <div className="rating-accuracy-dialog-slider-labels">
          <span 
            style={{ 
              color: getRatingAccuracyColor(value),
              textShadow: `0 0 10px ${getRatingAccuracyColor(value)}66`
            }}
          >
            {accuracyLabel[Math.round(value)]}
          </span>
        </div>
        
        <div className="rating-accuracy-dialog-buttons">
          <button 
            className="rating-accuracy-dialog-button rating-accuracy-dialog-cancel"
            onClick={onClose}
          >
            {tLevel('components.ratingAccuracy.cancelButton')}
          </button>
          <button 
            className="rating-accuracy-dialog-button rating-accuracy-dialog-save"
            onClick={handleSave}
          >
            {tLevel('components.ratingAccuracy.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Refactor RerateHistoryDropdown to match AliasesDropdown pattern
const CurationTooltip = ({ curation, show, onClose }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
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

  if (!show || !curation) return null;

  return (
    <div className="curation-tooltip-dropdown" ref={dropdownRef} onClick={handleDropdownClick}>
      <div className="curation-tooltip-type">{curation.type.name}</div>
      <div className="curation-tooltip-assigned">assigned by</div>
      <div className="curation-tooltip-user">
        {curation.assignedByUser?.avatarUrl && (
          <img 
            className="curation-tooltip-avatar" 
            src={curation.assignedByUser.avatarUrl} 
            alt={curation.assignedByUser.nickname || 'User'} 
          />
        )}
        <span className="curation-tooltip-name">
          {curation.assignedByUser?.nickname || 'Unknown'}
        </span>
        <span className="curation-tooltip-username">
          @{curation.assignedByUser?.username || 'unknown'}
        </span>
      </div>
      <div className="curation-tooltip-time">
        At {formatDate(curation.createdAt, i18next?.language)}
      </div>
    </div>
  );
};

const RerateHistoryDropdown = ({ show, onClose, rerateHistory, difficultyDict }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
      event.stopPropagation();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);


  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  if (!show || !rerateHistory?.length) return null;

  return (
    <div className="rerate-history-dropdown" ref={dropdownRef} onClick={handleDropdownClick}>
      <div className="rerate-history-header">{tLevel('rerateHistory.header', { defaultValue: 'Rerate History' })}</div>
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
                  <span className="rerate-history-date">{formatDate(entry.createdAt, i18next?.language)}</span>
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

const LevelDetailPage = ({ mockData = null }) => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
  const { id } = useParams();
  const detailPage = useLocation();
  
  // Use previewLevelId if in preview mode, otherwise use URL parameter
  const effectiveId = id || mockData?.level.id;
  const [res, setRes] = useState(null);
  const [leaderboardSort, setLeaderboardSort] = useState("SCR");
  const [sortDirection, setSortDirection] = useState("desc"); // "desc" or "asc"
  const [infoLoading, setInfoLoading] = useState(true);
  const [sortedLeaderboard, setSortedLeaderboard] = useState([]);
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

  const { difficultyDict } = useDifficultyContext();

  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  const [isLongDescription, setIsLongDescription] = useState(false);

  useEffect(() => {
    setIsLongDescription(res?.level?.curation?.description?.length > 250);
  }, [res?.level?.curation?.description]);


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

  // Scope CSS to level-detail.curated with higher specificity
  const scopeCSS = useCallback((css) => {
    if (!css) return '';

    // Extract @import statements to the beginning of the CSS
    const importStatements = [];
    let cssWithoutImports = css.replace(/@font-face\s+\{[\s\S]+?}/g, (match) => {
      importStatements.push(match);
      return '';
    });
    
    cssWithoutImports = cssWithoutImports.replace(/([^{}]+){/g, '.level-detail.curated[data-custom-styles="true"] $1{')
    
    // Combine imports at the beginning with the rest of the CSS
    const scopedCSS = importStatements.join('\n') + '\n' + cssWithoutImports;
    return scopedCSS;
  }, []);

  // Generate custom color CSS based on curation's custom color
  const createCustomColorCSS = useCallback((curation) => {
    if (!curation?.customColor || !curation?.type) {
      return null;
    }

    // Check if the curation type has the CUSTOM_COLOR_THEME ability
    if (!hasBit(curation.type.abilities, ABILITIES.CUSTOM_COLOR_THEME)) {
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
        --curation-primary-alpha: ${customColor}40;
        --curation-glow: ${customColor}80;
        --curation-type-color: ${customColor};
        --curation-type-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};
        --curation-type-alpha: ${customColor}40;
        --curation-hue-shift: ${hueShiftedColor};
        --glass-bg: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12);
        --glass-border: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3);
        --accent-color: ${customColor};
      }
    `;
  }, []);

  // Custom CSS injection system for curations
  const createCurationStyleSheet = useCallback((curation) => {
    if (!curation || !curation.customCSS) {
      return null;
    }

    // Check if the curation type has the CUSTOM_CSS ability
    if (curation.type && !hasBit(curation.type.abilities, ABILITIES.CUSTOM_CSS)) {
      return null;
    }

    const sanitizedCSS = sanitizeCSS(curation.customCSS);
    const scopedCSS = scopeCSS(sanitizedCSS);
    return scopedCSS;
  }, [sanitizeCSS, scopeCSS]);

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
    
    // Apply scoping for external overrides
    const sanitizedCSS = sanitizeCSS(css);
    const scopedCSS = scopeCSS(sanitizedCSS);

    style.innerHTML = scopedCSS;
    style.setAttribute('data-external-override', 'true');
    style.setAttribute('data-level-id', effectiveId);
    style.setAttribute('data-hmr-id', `external-${effectiveId}-${Date.now()}`);
    
    // Add to document head
    document.head.appendChild(style);
    setExternalStyleElement(style);
    setExternalCssOverride(css);
  }, [effectiveId, externalStyleElement, sanitizeCSS, scopeCSS]);

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

  const [activeAliasDropdown, setActiveAliasDropdown] = useState(null);
  const [showCurationTooltip, setShowCurationTooltip] = useState(false);

  const [showRatingPopup, setShowRatingPopup] = useState(false);

  const [levelTimeout, setLevelTimeout] = useState(null);
  const [showWheel, setShowWheel] = useState(false);
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [slots, setSlots] = useState(3);
  const [showMinus2Reason, setShowMinus2Reason] = useState(false);
  const [showGimmickReason, setShowGimmickReason] = useState(false);

  const [isRatingAccuracyDialogOpen, setIsRatingAccuracyDialogOpen] = useState(false);
  const [isAllVotesOpen, setIsAllVotesOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [showRerateDropdown, setShowRerateDropdown] = useState(false);
  const [rerateArrowEnabled, setRerateArrowEnabled] = useState(true);



  const handleRerateDropdownToggle = () => {
    if (!rerateArrowEnabled) return;
    setShowRerateDropdown(true);
    setRerateArrowEnabled(false);
  };

  const handleRerateDropdownClose = () => {
    setShowRerateDropdown(false);
    // Wait for mouseup before re-enabling the arrow
    const enableArrow = () => {
      setRerateArrowEnabled(true);
      window.removeEventListener('mouseup', enableArrow);
    };
    window.addEventListener('mouseup', enableArrow);
  };

  const handleOpenRatingAccuracyInfo = () => {
    setIsAllVotesOpen(!isAllVotesOpen);
  };

  const handleCloseRatingAccuracyInfo = () => {
    setIsAllVotesOpen(false);
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

  // Rating accuracy helper functions
  const getPosition = (value) => {
    // Map -5 to 5 to 0 to 100
    return ((value + 5) / 10) * 100;
  };

  const handleSliderMouseMove = (e) => {
    if (isDragging) {
      updateSliderValue(e);
    }
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };

  const updateSliderValue = (e) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const value = Math.round((percentage * 10) - 5);
    
    handleRatingAccuracyVote(value);
  };

  // Add event listeners for drag behavior
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
    };
  }, [isDragging]);

  const handleAliasButtonClick = (field) => {
    setActiveAliasDropdown(current => current === field ? null : field);
  };

  const handleDropdownClose = () => {
    setActiveAliasDropdown(null);
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

  useEffect(() => {
    const fetchData = async () => {
      // Use mock data if provided - completely override everything
      if (mockData) {
        setRes(mockData);
        setNotFound(false);
        setInfoLoading(false);
        return;
      }
      
      try {
        const levelData = await api.get(`${import.meta.env.VITE_LEVELS}/${effectiveId}`);

        if (levelData.data.timeout) {
          setLevelTimeout(levelData.data.timeout);
        }
        
        setRes(prevRes => ({
          ...prevRes,
          ...levelData.data
        }));
        setNotFound(false);
      } catch (error) {
        console.error("Error fetching level data:", error);
        if (error.response?.status === 404 || error.response?.status === 403) {
          setNotFound(true);
        }
      } finally {
        setInfoLoading(false);
      }
    };
    fetchData();
  }, [effectiveId, mockData]);

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

    if (!res?.level?.curation) {
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

    const curation = res.level.curation;
    
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
  }, [res?.level?.curation, createCurationStyleSheet, createCustomColorCSS, effectiveId, externalCssOverride, disableDefaultStyling]);



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
      document.title = `${res.level.song} - ${res.level.artist} | TUF`;
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

  const renderTitleWithAliases = (title, field) => {
    const aliases = res?.level?.aliases?.filter(a => a.field === field) || [];
    const isOpen = activeAliasDropdown === field;

    return (
      <>
        {title}
        {aliases.length > 0 && (
          <>
            <span 
              className={`alias-arrow ${isOpen ? 'open' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleAliasButtonClick(field)}
            >
              ▼
            </span>
            <AliasesDropdown 
              field={field}
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
        setRes(prevRes => ({
          ...prevRes,
          level: {
            ...prevRes.level,
            ...response.data.level,
            difficulty: response.data.level.difficulty,
            baseScore: response.data.level.baseScore,
            publicComments: response.data.level.publicComments
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
      toast.error(tLevel('errors.loginRequired'));
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
        
        toast.success(action === 'like' ? tLevel('messages.liked') : tLevel('messages.unliked'));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(tLevel('errors.likeFailed'));
    } finally {
      setIsLiking(false);
    }
  };

  const handleRatingAccuracyVote = async (vote) => {
    if (!user || !res?.isCleared) return;
    try {
      const response = await api.put(`${import.meta.env.VITE_LEVELS}/${effectiveId}/rating-accuracy-vote`, { vote });
      
      if (response.data.level) {
        setRes(prevRes => ({
          ...prevRes,
          level: {
            ...prevRes.level,
            ratingAccuracy: response.data.level.ratingAccuracy
          },
          totalVotes: response.data.totalVotes,
          votes: response.data.votes ? response.data.votes : prevRes.votes
        }));
        
        toast.success(tLevel('messages.voteSubmitted'));
      }
    } catch (error) {
      console.error('Error submitting rating accuracy vote:', error);
      toast.error(tLevel('errors.voteFailed'));
    }
  };

  // Add this function to check if a URL is from the local CDN
  const isCdnUrl = (url) => {
    return url?.startsWith(import.meta.env.VITE_CDN_URL);
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
        <CompleteNav />
        <div className="background-level"></div>
        <div className="wrapper-level wrapper-level-top">
          <div className="deletion-banner-wrapper">
            <div className="deletion-banner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{tLevel('banners.notFound')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (res == null)
    return (
      <div
        style={{ height: "100vh", width: "100vw", backgroundColor: "#090909" }}
      >
        <CompleteNav />
        <div className="background-level"></div>
        <div className="loader loader-level-detail"></div>
      </div>
    );

  const difficulty = difficultyDict[res.level.diffId];
  const averageDifficulty = difficultyDict[res.ratings?.averageDifficultyId];
  return (
    <div>
      <MetaTags
        title={res?.level?.song}
        description={tLevel('meta.description', { song: res?.level?.song, creator: res?.level?.creator })}
        url={currentUrl}
        image={''}
        type="article"
      />
      <div 
        className={`level-detail ${(res?.level?.curation && !externalCssOverride) || externalCssOverride ? 'curated' : ''}`}
        data-custom-styles={(externalCssOverride || curationStyles) ? "true" : undefined}
        data-custom-color={
          res?.level?.curation?.customColor && 
          res?.level?.curation?.type && 
          hasBit(res.level.curation.type.abilities, ABILITIES.CUSTOM_COLOR_THEME) 
            ? "true" : undefined
        }
        style={{
          '--header-bg-image': videoDetail?.image ? `url(${videoDetail.image})` : 'none'
        }}
      >
        <CompleteNav />
        <div className="background-level"></div>

        <div className="wrapper-level wrapper-level-top">
        {res?.level?.isDeleted ? (
          <div className="deletion-banner-wrapper">
            <div className="deletion-banner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{tLevel('banners.deleted')}</span>
            </div>
          </div>
        ) : res?.level?.isHidden ? (
          <div className="deletion-banner-wrapper">
            <div className="deletion-banner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{tLevel('banners.hidden')}</span>
            </div>
          </div>
        ) : null}
      
          <div className="header">
            <div className="left">

              <div className="level-id mobile">#{effectiveId}</div>
              <div className="difficulty-curation-row">
              <div className="diff rerate-history-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img 
                  src={difficulty.icon} 
                  alt={difficulty.name || 'Difficulty icon'} 
                  className="difficulty-icon"
                />
                {(res.ratings?.averageDifficultyId && 
                 averageDifficulty?.icon) &&
                 averageDifficulty?.type == "PGU" &&
                 difficulty.name.startsWith("Q") ?
                <img 
                    className="rating-icon"
                    src={averageDifficulty.icon}
                    alt="Rating icon" />
                : null
                }
                {res?.rerateHistory?.length > 0 && (
                  <span
                    className={`rerate-arrow ${showRerateDropdown ? 'open' : ''}`}
                    onClick={handleRerateDropdownToggle}
                    title={tLevel('rerateHistory.header', { defaultValue: 'Show rerate history' })}
                    style={{ pointerEvents: rerateArrowEnabled ? 'auto' : 'none', opacity: rerateArrowEnabled ? 1 : 0.5 }}
                  >
                    <HistoryListIcon className="rerate-history-icon" size={"24px"}/>
                    <span className="rerate-arrow-icon">&#9660;</span>
                  </span>
                )}
                <RerateHistoryDropdown
                  rerateHistory={res?.rerateHistory}
                  show={showRerateDropdown}
                  onClose={handleRerateDropdownClose}
                  difficultyDict={difficultyDict}
                />
                <div className="pp-display">
                  {(res.level.baseScore || difficulty.baseScore || 0).toFixed(1)}PP
                </div>
                <div className="level-id">#{effectiveId}</div>
              </div>
              {res?.level?.curation?.type && (
                <div className="curation-type-container-wrapper mobile">
                  <div 
                    className="curation-type-container"
                    onMouseEnter={() => setShowCurationTooltip(true)}
                    onMouseLeave={() => setShowCurationTooltip(false)}
                  >
                    <img 
                      className="curation-type-icon" 
                      src={res.level.curation.type.icon} 
                      alt={res.level.curation.type.name} 
                    />
                  </div>
                  <CurationTooltip 
                    curation={res.level.curation}
                    show={showCurationTooltip}
                    onClose={() => setShowCurationTooltip(false)}
                  />
                </div>
              )}
              </div>
              <div className="title-container">
                <div className="level-title">
                  {renderTitleWithAliases(res.level.song, 'song')}
                </div>
                <div className="level-info">
                  <div className="level-creator">
                    {formatCreatorDisplay(res.level)}
                  </div>
                  <div className="level-separator">-</div>
                  <div className="level-artist">
                  {renderTitleWithAliases(res.level.artist, 'artist')}
                  </div>
                </div>
                <div className="metadata-container">  
                  {res.tilecount && (
                    <div className="metadata-item">
                      <ChartIcon size={18} />
                      {/* <span className="metadata-label">Tilecount</span> */}
                      <span className="metadata-value">{res.tilecount}</span>
                    </div>
                  )}
                  {res.bpm && (
                    <div className="metadata-item">
                      {/* <span className="metadata-icon">ICON</span> */}
                      {/* <span className="metadata-label">Start BPM</span> */}
                      <MetronomeIcon size={18} />
                      <span className="metadata-value">{res.bpm}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Curation Type */}
              {res?.level?.curation?.type && (
                <div className="curation-type-container-wrapper">
                  <div 
                    className="curation-type-container"
                    onMouseEnter={() => setShowCurationTooltip(true)}
                    onMouseLeave={() => setShowCurationTooltip(false)}
                  >
                    <img 
                      className="curation-type-icon" 
                      src={res.level.curation.type.icon} 
                      alt={res.level.curation.type.name} 
                    />
                  </div>
                  <CurationTooltip 
                    curation={res.level.curation}
                    show={showCurationTooltip}
                    onClose={() => setShowCurationTooltip(false)}
                  />
                </div>
              )}

              {/* Expandable Curation Description */}
              {res?.level?.curation?.type && 
               res?.level?.curation?.description && 
               res.level.curation.description.trim() && (
                <div className={`curation-description-container ${isDescriptionExpanded ? 'expanded' : ''} ${isLongDescription ? 'expandable' : ''}`}>
                  <div 
                    className={`curation-description ${isDescriptionExpanded ? 'expanded' : ''}`}
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded && isLongDescription)}
                  >
                    <div className="curation-description-content">
                      {isDescriptionExpanded ? 
                        res.level.curation.description : 
                        isLongDescription ? 
                          `${res.level.curation.description.substring(0, 250)}...` : 
                          res.level.curation.description
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
              
              {/* Rating Accuracy Display, disabled for now */}
              {1==0 && difficulty.type === "PGU" && res.level.clears > 0 && (
                <div className="rating-accuracy-container">
                  <div className="rating-accuracy-display-title">Rating Accuracy</div>
                  <div 
                  className="rating-accuracy-display-scale"
                >
                  <div 
                    className="rating-accuracy-display-marker" 
                    style={{ 
                      left: `${getPosition(res.level.ratingAccuracy || 0)}%`,
                      backgroundColor: getRatingAccuracyColor(res.level.ratingAccuracy || 0)
                    }}
                  >
                  </div>
                </div>
                <div className="rating-accuracy-labels">
                  <span style={{
                    color: getRatingAccuracyColor(res.level.ratingAccuracy || 0),
                    textShadow: `0 0 10px ${getRatingAccuracyColor(res.level.ratingAccuracy || 0)}66`
                  }}>{accuracyLabel[Math.round(res.level.ratingAccuracy || 0).toString()]}</span>
                </div>
                <button 
                  className="rating-accuracy-vote-button"
                  onClick={() => setIsRatingAccuracyDialogOpen(true)}
                  disabled={!user || !res?.isCleared}
                  data-tooltip-id="rating-accuracy-tooltip"
                  data-tooltip-content={
                    !user 
                      ? tLevel('ratingAccuracy.loginToVote')
                      : !res?.isCleared 
                        ? tLevel('tooltips.clearRequired')
                        : tLevel('components.ratingAccuracy.voteButton')
                  }
                >
                  {tLevel('components.ratingAccuracy.voteButton')}
                </button>
                <span className="rating-accuracy-vote-count">Votes: {res.totalVotes || 0}</span>
                {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                  <>
                <InfoIcon 
                className="rating-accuracy-info-button"  
                size={"20px"} 
                
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleOpenRatingAccuracyInfo} 
                data-tooltip-id="rating-accuracy-info-tooltip"
                data-tooltip-content={
                  tLevel('ratingAccuracy.viewAllVotes')
                }
                />
                <RatingVotesDropdown 
                  votes={res.votes} 
                  show={isAllVotesOpen} 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClose={handleCloseRatingAccuracyInfo} 
                />
                </>
                )}
                <Tooltip id="rating-accuracy-tooltip" place="bottom" noArrow />
                <Tooltip id="rating-accuracy-info-tooltip" place="bottom" noArrow />

              </div>
              )}
              
              <div className="like-container"
                style={{
                  marginLeft:
                   difficulty.type === "PGU"
                   && res.level.clears > 0
                   ? "" : "auto"
                }}
              >
                <span className="like-count">{res.level.likes || 0}</span>
                <button 
                  data-tooltip-id="like-tooltip"
                  data-tooltip-content={
                    user ?
                      res.isLiked ? tLevel('buttons.unlike') : tLevel('buttons.like')
                    : tLevel('tooltips.loginRequired')
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
            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <button 
                  className="edit-button svg-stroke"
                  onClick={() => setOpenEditDialog(true)}
                  title={tLevel('buttons.edit')}
                >
                  <EditIcon size={"34px"}/>
                </button>
              )}
              {res.level.dlLink && res.level.dlLink.match(/http[s]?:\/\//) && (
                <button className="svg-stroke" href={res.level.dlLink} target="_blank" title={tLevel('links.download')} onClick={handleDownloadClick}>
                  <DownloadIcon size={"36px"}/>
                  {res.accessCount !== undefined && <span className="access-count">{res.accessCount || 0}</span>}
                </button>
              )}
              {res.level.workshopLink && (
                <button className="svg-stroke" onClick={() => window.open(res.level.workshopLink, '_blank')} target="_blank" title={tLevel('links.workshop')}>
                  <SteamIcon color="#ffffff" size={"34px"} />
                </button>
              )}
              {user && (
                <button 
                  className="svg-stroke" 
                  onClick={() => setShowAddToPackPopup(true)}
                  title={tLevel('buttons.addToPack')}
                >
                  <PackIcon color="#ffffff" size={"34px"} />
                </button>
              )}
              {res.ratings && (
                <button 
                  className="rating-button svg-stroke"
                  onClick={() => setShowRatingPopup(true)}
                  title={tLevel('buttons.viewRating')}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 12L10 15L17 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="body">

            <div className="info">
              {sortedLeaderboard.length > 0 ? (<>
              <div className="info-item">
                <p>{tLevel('stats.firstClear.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      tLevel('stats.firstClear.value', {
                        player: getHighScores(getSortedLeaderboard()).firstClear.player.name,
                        date: getHighScores(getSortedLeaderboard()).firstClear.vidUploadTime.slice(0, 10)
                      })
                      : "-")
                    : tLevel('stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{tLevel('stats.highestScore.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      tLevel('stats.highestScore.value', {
                        player: getHighScores(res?.level?.passes).highestScore.player.name,
                        score: getHighScores(res?.level?.passes).highestScore.scoreV2.toFixed(2)
                      })
                      : "-")
                    : tLevel('stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{tLevel('stats.highestSpeed.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 && getHighScores(res?.level?.passes).highestSpeed ? 
                      tLevel('stats.highestSpeed.value', {
                        player: getHighScores(res?.level?.passes).highestSpeed.player.name,
                        speed: getHighScores(res?.level?.passes).highestSpeed.speed || 1
                      })
                      : "-")
                    : tLevel('stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{tLevel('stats.highestAccuracy.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    (sortedLeaderboard.length > 0 ? 
                      tLevel('stats.highestAccuracy.value', {
                        player: getHighScores(res?.level?.passes).highestAcc.player.name,
                        accuracy: (getHighScores(res?.level?.passes).highestAcc.accuracy * 100).toFixed(2)
                      })
                      : "-")
                    : tLevel('stats.waiting')}
                </span>
              </div>

              <div className="info-item">
                <p>{tLevel('stats.totalClears.label')}</p>
                <span className="info-desc">
                  {!infoLoading ? 
                    tLevel('stats.totalClears.value', { count: sortedLeaderboard.length }) 
                    : tLevel('stats.waiting')}
                </span>
              </div>
              </>
              ) : (
                <div className="not-beaten-container">
                  <p className="not-beaten-text">{tLevel('leaderboard.notBeaten')}</p>
                  <p className="challenge-text">{tLevel('leaderboard.challenge')}</p>
                </div>
              )}


              <button className="info-button" onClick={changeDialogState}>
                {tLevel('dialog.fullInfo')}
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
                    backgroundImage: `url(${videoDetail? videoDetail.image: placeholder})`,
                  }}
                >
                  <div className="thumbnail-text">
                    <p>{tLevel('links.thumbnailNotFound.text')}</p>
                    {res.level.videoLink && 
                      <a href={res.level.videoLink}>{tLevel('links.thumbnailNotFound.goToVideo')}</a>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div className="rank">
            <h1>{tLevel('leaderboard.header')}</h1>
            {sortedLeaderboard.length > 0 ? (
              <div className="sort">
                <Tooltip id="tm" place="top" noArrow>
                  {tLevel('leaderboard.tooltips.time')}
                </Tooltip>
                <Tooltip id="ac" place="top" noArrow>
                  {tLevel('leaderboard.tooltips.accuracy')}
                </Tooltip>
                <Tooltip id="sc" place="top" noArrow>
                  {tLevel('leaderboard.tooltips.score')}
                </Tooltip>
                <Tooltip id="sp" place="top" noArrow>
                  {tLevel('leaderboard.tooltips.speed')}
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
                  <h3>{tLevel('leaderboard.noClearsYet')}</h3>
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
                aliases: newLevel.aliases || prevRes.level.aliases
              },
              rerateHistory: updatedLevel.rerateHistory || prevRes.rerateHistory // ensure rerateHistory is updated
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
            // Optionally refresh data or show success message
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

      {/* Rating Accuracy Dialog */}
      <RatingAccuracyDialog 
        isOpen={isRatingAccuracyDialogOpen}
        onClose={() => setIsRatingAccuracyDialogOpen(false)}
        onSave={handleRatingAccuracyVote}
        initialValue={0}
      />

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
                accessCount: prevRes.accessCount + 1
              }))}
          />
      )}

      </div>
    </div>
  );
};

export default LevelDetailPage;
