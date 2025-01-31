/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import "./leveldetailpage.css"
import placeholder from "../../assets/placeholder/3.png";
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from 'react-router-dom';
import { CompleteNav } from "../../components";
import {
  getVideoDetails,
  isoToEmoji,
} from "../../Repository/RemoteRepository";

import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { use } from "i18next";
import ClearCard from "../../components/ClearCard/ClearCard";
import { EditLevelPopup } from "../../components/EditLevelPopup/EditLevelPopup";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import { useDifficultyContext } from "../../contexts/DifficultyContext";
import { MetaTags } from '../../components';
import { SteamIcon } from "../../components/Icons/SteamIcon";

const getHighScores = (players) => {
  if (!players?.length) return null;
  
  return {
    firstClear: players.reduce((a, b) => 
      new Date(a.vidUploadTime) < new Date(b.vidUploadTime) ? a : b),
    highestScore: players.reduce((a, b) => 
      b.scoreV2 > a.scoreV2 ? b : a),
    highestAcc: players.reduce((a, b) => 
      b.accuracy > a.accuracy ? b : a),
    highestSpeed: players.some(p => p.speed) ? 
      players.reduce((a, b) => (b.speed || 0) > (a.speed || 0) ? b : a) : null
  };
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

const FullInfoPopup = ({ level, onClose }) => {
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
      const creatorName = credit.creator.aliases?.length > 0 
        ? `${credit.creator.name} (${credit.creator.aliases.join(', ')})`
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
      <div className="close-outer-levels" onClick={onClose}></div>
      <div className="levels-dialog dialog-scale-up">
        <div className="dialog">
          <div className="header">
            <h2>{level.song}</h2>
            <p>{level.artist}</p>
            <button className="close-button" onClick={onClose} title={tLevel('buttons.close')}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="body">
            <div className="team-info">
              {level.teamObject && (
                <div className="each-info team-name">
                  <span>{tLevel('info.team')}:</span>
                  <span>{level.teamObject.name}</span>
                </div>
              )}
              <div className="each-info">
                <span>{tLevel('info.difficulty')}:</span>
                <span>{level.difficulty.name}</span>
              </div>
              {(level.baseScore || level.difficulty.baseScore) && (
                <div className="each-info">
                  <span>{tLevel('info.baseScore')}:</span>
                  <span>{level.baseScore || level.difficulty.baseScore}PP</span>
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

const LevelDetailPage = () => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`levelDetail.${key}`, params);
  
  const { detailPage } = useLocation();
  const {id} = useParams()
  const [res, setRes] = useState(null);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [leaderboardSort, setLeaderboardSort] = useState("SCR");
  const [infoLoading, setInfoLoading] = useState(true);
  const [videoDetail, setVideoDetail] = useState(null);

  const { user } = useAuth();
  const [passCount, setPassCount] = useState(0)

  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const { difficultyDict } = useDifficultyContext();

  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  const [showSongAliases, setShowSongAliases] = useState(false);
  const [showArtistAliases, setShowArtistAliases] = useState(false);
  const songAliasButtonRef = useRef(null);
  const artistAliasButtonRef = useRef(null);

  const [activeAliasDropdown, setActiveAliasDropdown] = useState(null);

  const handleAliasButtonClick = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveAliasDropdown(current => current === field ? null : field);
  };

  const handleDropdownClose = () => {
    setActiveAliasDropdown(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const levelData = await api.get(`${import.meta.env.VITE_LEVELS}/${id}`);
        const passesData = await api.get(`${import.meta.env.VITE_PASSES}/level/${id}`);
        setRes(prevRes => ({
          ...prevRes,
          level: levelData.data,
          passes: passesData.data
        }));
        setDisplayedPlayers(sortLeaderboard(passesData.data));
        
        setInfoLoading(false);
      } catch (error) {
        console.error("Error fetching level data:", error);
        setInfoLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (res?.level?.videoLink) {
      getVideoDetails(res.level.videoLink).then(setVideoDetail);
    }
  }, [res?.level?.videoLink]);

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
    setLeaderboardSort(sort);
    if (res?.passes) {
      const newSortedPlayers = sortLeaderboard([...res.passes]);
      setDisplayedPlayers(newSortedPlayers);
    }
  }

  const sortLeaderboard = (players) => {
    if (!players) return [];
    
    const sortedPlayers = [...players];

    switch (leaderboardSort) {
      case 'TIME':
        return sortedPlayers.sort((a, b) => 
          new Date(b.vidUploadTime) - new Date(a.vidUploadTime)
        );
      case 'ACC':
        return sortedPlayers.sort((a, b) => 
          (b.accuracy || 0) - (a.accuracy || 0)
        );
      case 'SCR':
        return sortedPlayers.sort((a, b) => 
          (b.scoreV2 || 0) - (a.scoreV2 || 0)
        );
      default:
        return sortedPlayers;
    }
  };

  useEffect(() => {
    if (res?.passes) {
      setDisplayedPlayers(sortLeaderboard(res.passes));
    }
  }, [leaderboardSort, res?.passes]);

  function changeDialogState(){
    setOpenDialog(!openDialog)
  }

  function formatString(input) {
    return input.split(/ & | but /g).join(" - ");
  }

  function formatDiff(value) {
    const valueStr = String(value);
      if (valueStr.endsWith('.05')) {
      return valueStr.slice(0, -3) + '+';
    } else {
      return valueStr;
    }
  }

  const getMetaImage = () => {
    if (videoDetail?.image) return videoDetail.image;
    if (res?.level?.videoLink) return `https://img.youtube.com/vi/${res.level.videoLink.split('v=')[1]}/maxresdefault.jpg`;
    return placeholder;
  };

  const renderTitleWithAliases = (title, field) => {
    const aliases = res?.level?.aliases?.filter(a => a.field === field) || [];
    const isOpen = activeAliasDropdown === field;

    return (
      <div className="level-title">
        {title}
        {aliases.length > 0 && (
          <>
            <span 
              className={`alias-arrow ${isOpen ? 'open' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => handleAliasButtonClick(e, field)}
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
      </div>
    );
  };

  const formatCreatorDisplay = () => {
    // If team exists, it takes priority
    if (res.level.teamObject) {
      return res.level.teamObject.name;
    }

    // If no credits, fall back to creator field
    if (!res.level.levelCredits || res.level.levelCredits.length === 0) {
      return res.level.creator;
    }

    // Group credits by role
    const creditsByRole = res.level.levelCredits.reduce((acc, credit) => {
      const role = credit.role.toLowerCase();
      if (!acc[role]) {
        acc[role] = [];
      }
      // Use the creator's first alias if available, otherwise use name
      const creatorName = credit.creator.aliases?.length > 0 
        ? credit.creator.aliases[0]
        : credit.creator.name;
      acc[role].push(creatorName);
      return acc;
    }, {});

    const charters = creditsByRole['charter'] || [];
    const vfxers = creditsByRole['vfxer'] || [];

    // Handle different cases based on number of credits
    if (res.level.levelCredits.length >= 3) {
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
    } else if (res.level.levelCredits.length === 2) {
      if (charters.length === 2) {
        return `${charters[0]} & ${charters[1]}`;
      }
      if (charters.length === 1 && vfxers.length === 1) {
        return `${charters[0]} | ${vfxers[0]}`;
      }
    }

    // Single credit or fallback
    return res.level.levelCredits[0]?.creator.name || res.level.creator;
  };

  //if (!res || player.length === 0 || highSpeed === null || highAcc === null || highScore === null || displayedPlayers.length === 0)
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

  return (
  <>
    <MetaTags
      title={res?.level?.song}
      description={tLevel('meta.description', { song: res?.level?.song, creator: res?.level?.creator })}
      url={currentUrl}
      image={''}
      type="article"
    />
    <div className="level-detail">
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
          <div className="left"
            style={{
              backgroundImage: `url(${res && videoDetail ? videoDetail.image: "defaultImageURL"})`}}>

            <div className="diff">
              <img 
                src={difficultyDict[res.level.difficulty.id]?.icon} 
                alt={difficultyDict[res.level.difficulty.id]?.name || 'Difficulty icon'} 
                className="difficulty-icon"
              />
            </div>

            <div className="title">
              {renderTitleWithAliases(res.level.song, 'song')}
              <p>
                #{id}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                {formatCreatorDisplay()}
                &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                {renderTitleWithAliases(res.level.artist, 'artist')}
              </p>
            </div>
          </div>
          {user?.isSuperAdmin && (
            <button 
              className="edit-button svg-stroke"
              onClick={() => setOpenEditDialog(true)}
              title={tLevel('buttons.edit')}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className="right"> 
            {res.level.dlLink && (
              <a className="svg-stroke" href={res.level.dlLink} target="_blank" title={tLevel('links.download')}>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
            {res.level.workshopLink && (
              <a href={res.level.workshopLink} target="_blank" title={tLevel('links.workshop')}>
                <SteamIcon color="#ffffff" size={24} />
              </a>
            )}
          </div>
        </div>

        <div className="body">
          <div className="info">
            <div className="info-item">
              <p>{tLevel('stats.firstClear.label')}</p>
              <span className="info-desc">
                {!infoLoading ? 
                  (displayedPlayers.length > 0 ? 
                    tLevel('stats.firstClear.value', {
                      player: getHighScores(displayedPlayers).firstClear.player.name,
                      date: getHighScores(displayedPlayers).firstClear.vidUploadTime.slice(0, 10)
                    })
                    : "-")
                  : tLevel('stats.waiting')}
              </span>
            </div>

            <div className="info-item">
              <p>{tLevel('stats.highestScore.label')}</p>
              <span className="info-desc">
                {!infoLoading ? 
                  (displayedPlayers.length > 0 ? 
                    tLevel('stats.highestScore.value', {
                      player: getHighScores(displayedPlayers).highestScore.player.name,
                      score: getHighScores(displayedPlayers).highestScore.scoreV2.toFixed(2)
                    })
                    : "-")
                  : tLevel('stats.waiting')}
              </span>
            </div>

            <div className="info-item">
              <p>{tLevel('stats.highestSpeed.label')}</p>
              <span className="info-desc">
                {!infoLoading ? 
                  (displayedPlayers.length > 0 && getHighScores(displayedPlayers).highestSpeed ? 
                    tLevel('stats.highestSpeed.value', {
                      player: getHighScores(displayedPlayers).highestSpeed.player.name,
                      speed: getHighScores(displayedPlayers).highestSpeed.speed || 1
                    })
                    : "-")
                  : tLevel('stats.waiting')}
              </span>
            </div>

            <div className="info-item">
              <p>{tLevel('stats.highestAccuracy.label')}</p>
              <span className="info-desc">
                {!infoLoading ? 
                  (displayedPlayers.length > 0 ? 
                    tLevel('stats.highestAccuracy.value', {
                      player: getHighScores(displayedPlayers).highestAcc.player.name,
                      accuracy: (getHighScores(displayedPlayers).highestAcc.accuracy * 100).toFixed(2)
                    })
                    : "-")
                  : tLevel('stats.waiting')}
              </span>
            </div>

            <div className="info-item">
              <p>{tLevel('stats.totalClears.label')}</p>
              <span className="info-desc">
                {!infoLoading ? 
                  tLevel('stats.totalClears.value', { count: displayedPlayers.length }) 
                  : tLevel('stats.waiting')}
              </span>
            </div>

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
          {displayedPlayers && displayedPlayers.length > 0 ? (
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

              <svg className="svg-stroke" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              data-tooltip-id = "tm"
              value="TIME" 
              onClick={() => handleSort("TIME")} 
              style={{
                backgroundColor:
                  leaderboardSort == "TIME" ? "rgba(255, 255, 255, 0.7)" : "",
              }}>
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M3 9H21M7 3V5M17 3V5M6 12H8M11 12H13M16 12H18M6 15H8M11 15H13M16 15H18M6 18H8M11 18H13M16 18H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" ></path>
                </g>
              </svg>

              <svg  className="svg-fill" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                backgroundColor:
                  leaderboardSort == "ACC" ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              data-tooltip-id = "ac"
              value="ACC"
              onClick={() => handleSort("ACC")} >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" ></g>
                <g id="SVGRepo_iconCarrier">

                  <path d="M21.4143 3.29285C21.8048 3.68337 21.8048 4.31653 21.4143 4.70706L4.70718 21.4142C4.31666 21.8047 3.68349 21.8047 3.29297 21.4142L2.58586 20.7071C2.19534 20.3165 2.19534 19.6834 2.58586 19.2928L19.293 2.58574C19.6835 2.19522 20.3167 2.19522 20.7072 2.58574L21.4143 3.29285Z" fill="#ffffff" ></path>
                  <path d="M7.50009 2.99997C5.5671 2.99997 4.00009 4.56697 4.00009 6.49997C4.00009 8.43297 5.5671 9.99997 7.50009 9.99997C9.43309 9.99997 11.0001 8.43297 11.0001 6.49997C11.0001 4.56697 9.43309 2.99997 7.50009 2.99997Z" fill="#ffffff" ></path>
                  <path d="M16.5001 14C14.5671 14 13.0001 15.567 13.0001 17.5C13.0001 19.433 14.5671 21 16.5001 21C18.4331 21 20.0001 19.433 20.0001 17.5C20.0001 15.567 18.4331 14 16.5001 14Z" fill="#ffffff" ></path>
                </g>
              </svg>

              <svg className="svg-fill"  viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                backgroundColor:
                  leaderboardSort == "SCR" ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              data-tooltip-id = "sc"
              value="SCR"
              onClick={() => handleSort("SCR")}
                >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" ></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" fill="#ffffff"></path>
                </g>
              </svg>
            </div>
          ) : <></>}
          <div className="rank-list">
            {!infoLoading ? 
              displayedPlayers && displayedPlayers.length > 0 ? (
                displayedPlayers.map((each, index) => (
                  <ClearCard scoreData={each} index={index} key={index}/>
                ))
              ) : (
                <h3>{tLevel('leaderboard.notBeaten')}</h3>
              )
              :
              <div className="loader loader-level-detail-rank"></div>
            }
          </div>
        </div>
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
            }
          }));
        }}
      />
    )}

    {openDialog && (
      <FullInfoPopup
        level={res.level}
        onClose={changeDialogState}
      />
    )}
  </>
  );
};

export default LevelDetailPage;
