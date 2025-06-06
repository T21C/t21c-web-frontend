import "./passdetailpage.css";
import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from 'react-router-dom';
import { CompleteNav, UserAvatar } from "@/components/layout";
import { formatNumber, getVideoDetails, isoToEmoji } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import { EditPassPopup } from "@/components/popups";
import { MetaTags } from "@/components/common/display";
import { DefaultAvatar } from "@/components/common/icons";

const currentUrl = window.location.origin + location.pathname;

const parseRankColor = (rank) => {
  var clr;
  switch(rank) {
    case 1: clr = "#efff63"; break;
    case 2: clr = "#eeeeee"; break;
    case 3: clr = "#ff834a"; break;
    default: clr = "#777777"; break;
  }
  return clr
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const PassDetailPage = () => {
  const { t } = useTranslation('pages');
  const tPass = (key, params = {}) => t(`passDetail.${key}`, params);
  const { id } = useParams();
  const [res, setRes] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [videoDetail, setVideoDetail] = useState(null);
  const { user } = useAuth();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [particles, setParticles] = useState([]);

  // Function to generate random particle properties
  const generateParticle = (index) => ({
    id: `${index}-${Date.now()}`, // Unique ID for React key
    moveDuration: (2 + Math.random()) * 2, // Movement duration
    angle: Math.random() * 360,
    distance: 5 + Math.random() * 5,
    delay: index * 0.7,
    size: 14 + Math.random() * 6,
    startX: 15 + Math.random() * 70, // Random starting X position (0-100%)
    startY: 15 + Math.random() * 70  // Random starting Y position (0-100%)
  });

  // Function to generate all particles
  const generateParticles = () => {
    const newParticles = Array(20).fill(null).map((_, i) => generateParticle(i));
    setParticles(newParticles);
  };

  // Handle particle animation end and regenerate with new timing
  const handleAnimationEnd = (index) => {
    setTimeout(() => {
      setParticles(prevParticles => {
        const newParticles = [...prevParticles];
        newParticles[index] = {
          ...generateParticle(index),
          delay: 0 // No staggered delay for subsequent cycles
        };
        return newParticles;
      });
    }, Math.random() * 300); // Small random delay before regenerating
  };

  const fetchPassData = async () => {
    try {
      const passData = await api.get(`${import.meta.env.VITE_PASSES}/${id}`);
      setRes(prevRes => ({
        ...prevRes,
        pass: passData.data
      }));
      setInfoLoading(false);
    } catch (error) {
      console.error("Error fetching pass data:", error);
      setInfoLoading(false);
    }
  };

  useEffect(() => {
    fetchPassData();
  }, [id]);

  useEffect(() => {
    if (res?.pass?.videoLink) {
      getVideoDetails(res.pass.videoLink).then(setVideoDetail);
    }
  }, [res?.pass?.videoLink]);

  useEffect(() => {
    if (res?.pass) {
      const accuracy = res.pass.accuracy;
      if (accuracy === 1) {
        generateParticles();
      }
    }
  }, [res?.pass]);

  if (res == null)
    return (
      <div style={{ height: "100vh", width: "100vw", backgroundColor: "#090909" }}>
        <CompleteNav />
        <div className="background-level"></div>
        <div className="loader loader-pass-detail"></div>
      </div>
    );

  const { pass } = res;
  const accuracy = pass.accuracy;
  const baseScore = pass.level?.baseScore || pass.level?.difficulty?.baseScore;

  return (
    <>
      <MetaTags
        title={tPass('meta.title', { song: pass.level?.song })}
        description={tPass('meta.description', { 
          playerName: pass.player?.name,
          song: pass.level?.song,
          artist: pass.level?.artist
        })}
        url={currentUrl}
        image={pass.level?.videoLink ? pass.level?.videoLink : "/leaderboard-preview.jpg"}
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="pass-detail">
        {pass?.isDeleted && (
          <div className="deletion-banner-wrapper">
            <div className="deletion-banner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{tPass('banners.deleted')}</span>
            </div>
          </div>
        )}

        <div className="pass-content">
          <div className="header">
            <div className="level-card">
              <div className="difficulty-section">
                <div className="difficulty-icon">
                  <img src={pass.level?.difficulty?.icon} alt={pass.level?.difficulty?.name} />
                </div>
                {baseScore && <span className="base-score">{tPass('level.baseScore', { score: baseScore })}</span>}
              </div>
              <div className="level-info">
                <Link to={`/levels/${pass.level?.id}`} className="level-title">
                  <h1>{pass.level?.song}</h1>
                  <p className="artist">{pass.level?.artist}</p>
                </Link>
                <div className="credits">
                  {pass.level?.team && <p className="team">{tPass('level.credits.team', { team: pass.level?.team })}</p>}
                  <p className="charter">{tPass('level.credits.charter', { charter: pass.level?.charter })}</p>
                  {pass.level?.vfxer && <p className="vfxer">{tPass('level.credits.vfxer', { vfxer: pass.level?.vfxer })}</p>}
                </div>
              </div>
            </div>

            <div className="pass-player-card">
              <div className="player-avatar">
                <UserAvatar 
                  primaryUrl={pass.player?.avatarUrl}
                  fallbackUrl={pass.player?.pfp}
                />
              </div>
              <div className="player-info">
                <Link to={`/profile/${pass.player?.id}`} className="player-name">
                  <div className="player-name-rank">
                    <div className="player-name-container">
                      <h2>{pass.player?.name}</h2>
                      {pass.player?.discordUsername && (
                        <span className="discord-tag">@{pass.player.discordUsername}</span>
                      )}
                      <img
                        src={isoToEmoji(pass.player?.country)}
                        alt={pass.player?.country}
                        className="country-flag"
                      />
                    </div>
                    <div className="player-rank-flag">
                      {pass.ranks && (
                        <h2
                          style={{
                            color: parseRankColor(pass.ranks.rankedScoreRank), 
                            backgroundColor: `${parseRankColor(pass.ranks.rankedScoreRank)}27`
                          }}
                        >{tPass('player.rank', { rank: pass.ranks.rankedScoreRank })}</h2>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="score-impact">
                  {pass.scoreInfo && (
                    <div className="score-container">
                      <div className="current-score">
                        <span className="score-value">{tPass('player.score.current', { score: formatNumber(pass.scoreInfo.currentRankedScore) })}</span>
                        {pass.scoreInfo.impact > 0 && (
                          <span className="score-difference positive">
                            {tPass('player.score.difference.positive', { score: formatNumber(pass.scoreInfo.impact) })}
                          </span>
                        )}
                      </div>
                      <div className="previous-score">
                        {tPass('player.score.previous', { score: formatNumber(pass.scoreInfo.previousRankedScore) })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="pass-date">{tPass('player.clearDate', { date: formatDate(pass.vidUploadTime) })}</div>
              </div>
            </div>
          </div>

          <div className="body">
            <div className="info">
              <div className="info-items">
                <div className="info-item">
                  <p>{tPass('stats.score.label')}</p>
                  <span className="info-desc">{tPass('stats.score.value', { score: formatNumber(pass.scoreV2) })}</span>
                </div>
                <div className="info-item">
                  <p>{tPass('stats.accuracy.label')}</p>
                  <span className={`info-desc ${accuracy === 1 ? 'perfect-shine' : ''}`}>
                    {tPass('stats.accuracy.value', { accuracy: (100*accuracy).toFixed(2) })}
                  </span>
                </div>
                <div className="info-item">
                  <p>{tPass('stats.speed.label')}</p>
                  <span className="info-desc">{tPass('stats.speed.value', { speed: pass.speed })}</span>
                </div>
                <div className="info-item">
                  <p>{tPass('stats.feelingRating.label')}</p>
                  <span className="info-desc">
                    {pass.feelingRating ? tPass('stats.feelingRating.value', { rating: pass.feelingRating }) : tPass('stats.feelingRating.none')}
                  </span>
                </div>
              </div>
              {(pass.isWorldsFirst || pass.is12K || pass.is16K || pass.isNoHoldTap) && (
                <div className="flags-container">
                  {pass.isWorldsFirst && (
                    <span className="worlds-first">{tPass('flags.worldsFirst')}</span>
                  )}
                  {(pass.is12K || pass.is16K || pass.isNoHoldTap) && (
                    <div className="flags">
                      {pass.is12K && <span className="flag">{tPass('flags.12k')}</span>}
                      {pass.is16K && <span className="flag">{tPass('flags.16k')}</span>}
                      {pass.isNoHoldTap && <span className="flag">{tPass('flags.noHoldTap')}</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="judgements">
                <h3>{tPass('judgements.title')}</h3>
                <div className="judgement-grid">
                  <div className="top">
                    <div className="judgement-item early-perfect">
                      <label>{tPass('judgements.types.earlyPerfect.label')}</label>
                      <span>{tPass('judgements.types.earlyPerfect.value', { count: pass.judgements?.ePerfect || 0 })}</span>
                    </div>
                    <div className={`judgement-item perfect ${accuracy === 1 ? 'perfect-shine' : ''}`}>
                      <label>{tPass('judgements.types.perfect.label')}</label>
                      <div className="value-container">
                        {accuracy === 1 && (
                          <div className="particles">
                            {particles.map((particle, i) => (
                              <div 
                                key={particle.id}
                                className="particle" 
                                style={{ 
                                  '--move-duration': `${particle.moveDuration}s`,
                                  '--fade-in-duration': `${particle.fadeInDuration}s`,
                                  '--fade-out-duration': `${particle.fadeOutDuration}s`,
                                  '--angle': `${particle.angle}deg`,
                                  '--distance': `${particle.distance}px`,
                                  '--delay': `${particle.delay}s`,
                                  '--size': `${particle.size}px`,
                                  '--start-x': `${particle.startX}%`,
                                  '--start-y': `${particle.startY}%`
                                }}
                                onAnimationEnd={() => handleAnimationEnd(i)}
                              />
                            ))}
                          </div>
                        )}
                        <span>{tPass('judgements.types.perfect.value', { count: pass.judgements?.perfect || 0 })}</span>
                      </div>
                    </div>
                    <div className="judgement-item late-perfect">
                      <label>{tPass('judgements.types.latePerfect.label')}</label>
                      <span>{tPass('judgements.types.latePerfect.value', { count: pass.judgements?.lPerfect || 0 })}</span>
                    </div>
                  </div>
                  <div className="bottom">
                    <div className={`judgement-item too-early ${pass.judgements?.earlyDouble === 0 && pass.level?.difficulty?.name[0] !== "P" && accuracy !== 1 ? 'zero-shine' : ''}`}>
                      <label>{tPass('judgements.types.tooEarly.label')}</label>
                      <span>{tPass('judgements.types.tooEarly.value', { count: pass.judgements?.earlyDouble || 0 })}</span>
                    </div>
                    <div className="judgement-item early">
                      <label>{tPass('judgements.types.early.label')}</label>
                      <span>{tPass('judgements.types.early.value', { count: pass.judgements?.earlySingle || 0 })}</span>
                    </div>
                    <div className="judgement-item late">
                      <label>{tPass('judgements.types.late.label')}</label>
                      <span>{tPass('judgements.types.late.value', { count: pass.judgements?.lateSingle || 0 })}</span>
                    </div>
                    <div className="judgement-item too-late">
                      <label>{tPass('judgements.types.tooLate.label')}</label>
                      <span>{tPass('judgements.types.tooLate.value', { count: pass.judgements?.lateDouble || 0 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="youtube">
              {videoDetail ? (
                <iframe
                  src={videoDetail.embed}
                  title="Video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <div className="thumbnail-container">
                  <div className="thumbnail-text">
                    <p>{tPass('video.notAvailable.text')}</p>
                    {pass.videoLink && (
                      <a href={pass.videoLink} target="_blank" rel="noopener noreferrer">
                        {tPass('video.notAvailable.watchOnYoutube')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {user?.isSuperAdmin && (
            <button className="edit-button" onClick={() => setOpenEditDialog(true)}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {openEditDialog && (
          <EditPassPopup
            pass={pass}
            onClose={() => setOpenEditDialog(false)}
            onUpdate={() => {
              setOpenEditDialog(false);
              fetchPassData();
            }}
          />
        )}
      </div>
    </>
  );
};

export default PassDetailPage;
