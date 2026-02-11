import "./passdetailpage.css";
import { useEffect, useState } from "react";
import { useParams, Link } from 'react-router-dom';
import { UserAvatar } from "@/components/layout";
import { formatNumber, getVideoDetails, isoToEmoji } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import { EditPassPopup } from "@/components/popups/Passes";
import { MetaTags } from "@/components/common/display";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { formatDate } from "@/utils/Utility";
import i18next from "i18next";
import { EyeIcon, EyeOffIcon, TrashIcon } from "@/components/common/icons";

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

const PassDetailPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { id } = useParams();
  const [res, setRes] = useState(null);
  const [videoDetail, setVideoDetail] = useState(null);
  const { user } = useAuth();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [particles, setParticles] = useState([]);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [isTogglingHidden, setIsTogglingHidden] = useState(false);

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
    } catch (error) {
      console.error("Error fetching pass data:", error);
    }
  };

  const handleToggleHidden = async () => {
    if (!showHideConfirm) {
      setShowHideConfirm(true);
      return;
    }

    setIsTogglingHidden(true);
    try {
      await api.patch(`${import.meta.env.VITE_PASSES}/${id}/toggle-hidden`);
      await fetchPassData();
      setShowHideConfirm(false);
    } catch (error) {
      console.error("Error toggling pass hidden status:", error);
      alert(t('passDetail.errors.toggleHidden'));
    } finally {
      setIsTogglingHidden(false);
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
        
        <div className="loader loader-pass-detail"></div>
      </div>
    );

  const { pass } = res;
  const accuracy = pass.accuracy;
  const baseScore = pass.level?.baseScore || pass.level?.difficulty?.baseScore;

  return (
    <>
      <MetaTags
        title={t('passDetail.meta.title', { song: pass.level?.song })}
        description={t('passDetail.meta.description', { 
          playerName: pass.player?.name,
          song: pass.level?.song,
          artist: pass.level?.artist
        })}
        url={currentUrl}
        image={pass.level?.videoLink ? pass.level?.videoLink : "/leaderboard-preview.jpg"}
        type="website"
      />
      
      <div className="pass-detail">
        {pass?.isDeleted && (
          <div className="deletion-banner-wrapper">
            <div className="deletion-banner">
              <TrashIcon />
              <span>{t('passDetail.banners.deleted')}</span>
            </div>
          </div>
        )}
        {pass?.isHidden && !pass?.isDeleted && (
          <div className="hidden-banner-wrapper">
            <div className="hidden-banner">
              <EyeOffIcon />
              <span>{t('passDetail.banners.hidden')}</span>
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
                {baseScore && <span className="base-score">{t('passDetail.level.baseScore', { score: baseScore })}</span>}
              </div>
              <div className="level-info">
                <Link to={`/levels/${pass.level?.id}`} className="level-title">
                  <h1>{pass.level?.song}</h1>
                  <p className="artist">{pass.level?.artist}</p>
                </Link>
                <div className="credits">
                  {pass.level?.team && <p className="team">{t('passDetail.level.credits.team', { team: pass.level?.team })}</p>}
                  <p className="charter">{t('passDetail.level.credits.charter', { charter: pass.level?.charter })}</p>
                  {pass.level?.vfxer && <p className="vfxer">{t('passDetail.level.credits.vfxer', { vfxer: pass.level?.vfxer })}</p>}
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
                        >{t('passDetail.player.rank', { rank: pass.ranks.rankedScoreRank })}</h2>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="score-impact">
                  {pass.scoreInfo && (
                    <div className="score-container">
                      <div className="current-score">
                        <span className="score-value">{t('passDetail.player.score.current', { score: formatNumber(pass.scoreInfo.currentRankedScore) })}</span>
                        {pass.scoreInfo.impact > 0 && (
                          <span className="score-difference positive">
                            {t('passDetail.player.score.difference.positive', { score: formatNumber(pass.scoreInfo.impact) })}
                          </span>
                        )}
                      </div>
                      <div className="previous-score">
                        {t('passDetail.player.score.previous', { score: formatNumber(pass.scoreInfo.previousRankedScore) })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="pass-date">{t('passDetail.player.clearDate', { date: formatDate(pass.vidUploadTime, i18next?.language) })}</div>
              </div>
            </div>
          </div>

          <div className="body">
            <div className="info">
              <div className="info-items">
                <div className="info-item">
                  <p>{t('passDetail.stats.score.label')}</p>
                  <span className="info-desc">{t('passDetail.stats.score.value', { score: formatNumber(pass.scoreV2) })}</span>
                </div>
                <div className="info-item">
                  <p>{t('passDetail.stats.accuracy.label')}</p>
                  <span className={`info-desc ${accuracy === 1 ? 'perfect-shine' : ''}`}>
                    {t('passDetail.stats.accuracy.value', { accuracy: (100*accuracy).toFixed(2) })}
                  </span>
                </div>
                <div className="info-item">
                  <p>{t('passDetail.stats.speed.label')}</p>
                  <span className="info-desc">{t('passDetail.stats.speed.value', { speed: pass.speed })}</span>
                </div>
                <div className="info-item">
                  <p>{t('passDetail.stats.feelingRating.label')}</p>
                  <span className="info-desc">
                    {pass.feelingRating ? t('passDetail.stats.feelingRating.value', { rating: pass.feelingRating }) : t('passDetail.stats.feelingRating.none')}
                  </span>
                </div>
              </div>
              {(pass.isWorldsFirst || pass.is12K || pass.is16K || pass.isNoHoldTap) && (
                <div className="flags-container">
                  {pass.isWorldsFirst && (
                    <span className="worlds-first">{t('passDetail.flags.worldsFirst')}</span>
                  )}
                  {(pass.is12K || pass.is16K || pass.isNoHoldTap) && (
                    <div className="flags">
                      {pass.is12K && <span className="flag">{t('passDetail.flags.12k')}</span>}
                      {pass.is16K && <span className="flag">{t('passDetail.flags.16k')}</span>}
                      {pass.isNoHoldTap && <span className="flag">{t('passDetail.flags.noHoldTap')}</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="judgements">
                <h3>{t('passDetail.judgements.title')}</h3>
                <div className="judgement-grid">
                  <div className="top">
                    <div className="judgement-item early-perfect">
                      <label>{t('passDetail.judgements.types.earlyPerfect.label')}</label>
                      <span>{t('passDetail.judgements.types.earlyPerfect.value', { count: pass.judgements?.ePerfect || 0 })}</span>
                    </div>
                    <div className={`judgement-item perfect ${accuracy === 1 ? 'perfect-shine' : ''}`}>
                      <label>{t('passDetail.judgements.types.perfect.label')}</label>
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
                        <span>{t('passDetail.judgements.types.perfect.value', { count: pass.judgements?.perfect || 0 })}</span>
                      </div>
                    </div>
                    <div className="judgement-item late-perfect">
                      <label>{t('passDetail.judgements.types.latePerfect.label')}</label>
                      <span>{t('passDetail.judgements.types.latePerfect.value', { count: pass.judgements?.lPerfect || 0 })}</span>
                    </div>
                  </div>
                  <div className="bottom">
                    <div className={`judgement-item too-early ${pass.judgements?.earlyDouble === 0 && pass.level?.difficulty?.name[0] !== "P" && accuracy !== 1 ? 'zero-shine' : ''}`}>
                      <label>{t('passDetail.judgements.types.tooEarly.label')}</label>
                      <span>{t('passDetail.judgements.types.tooEarly.value', { count: pass.judgements?.earlyDouble || 0 })}</span>
                    </div>
                    <div className="judgement-item early">
                      <label>{t('passDetail.judgements.types.early.label')}</label>
                      <span>{t('passDetail.judgements.types.early.value', { count: pass.judgements?.earlySingle || 0 })}</span>
                    </div>
                    <div className="judgement-item late">
                      <label>{t('passDetail.judgements.types.late.label')}</label>
                      <span>{t('passDetail.judgements.types.late.value', { count: pass.judgements?.lateSingle || 0 })}</span>
                    </div>
                    <div className="judgement-item too-late">
                      <label>{t('passDetail.judgements.types.tooLate.label')}</label>
                      <span>{t('passDetail.judgements.types.tooLate.value', { count: pass.judgements?.lateDouble || 0 })}</span>
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
                    <p>{t('passDetail.video.notAvailable.text')}</p>
                    {pass.videoLink && (
                      <a href={pass.videoLink} target="_blank" rel="noopener noreferrer">
                        {t('passDetail.video.notAvailable.watchOnYoutube')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pass-actions">
            {user && user.playerId === pass.player?.id && (
              <button 
                className={`hide-button ${pass.isHidden ? 'hidden' : ''}`}
                onClick={handleToggleHidden}
                disabled={isTogglingHidden}
                title={pass.isHidden ? t('passDetail.actions.unhide') : t('passDetail.actions.hide')}
              >
                {isTogglingHidden ? (
                  <div className="spinner"></div>
                ) : pass.isHidden ? (
                  <EyeIcon />
                ) : (
                  <EyeOffIcon />
                )}
              </button>
            )}
            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <button className="edit-button" onClick={() => setOpenEditDialog(true)}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {showHideConfirm && (
          <div className="hide-confirm-overlay" onClick={() => setShowHideConfirm(false)}>
            <div className="hide-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>{pass.isHidden ? t('passDetail.confirm.unhide.title') : t('passDetail.confirm.hide.title')}</h3>
              <p>{pass.isHidden ? t('passDetail.confirm.unhide.message') : t('passDetail.confirm.hide.message')}</p>
              <div className="hide-confirm-actions">
                <button className="confirm-button" onClick={handleToggleHidden} disabled={isTogglingHidden}>
                  {isTogglingHidden 
                    ? (pass.isHidden ? t('passDetail.confirm.unhide.processing') : t('passDetail.confirm.hide.processing'))
                    : (pass.isHidden ? t('passDetail.confirm.unhide.confirm') : t('passDetail.confirm.hide.confirm'))
                  }
                </button>
                <button className="cancel-button" onClick={() => setShowHideConfirm(false)} disabled={isTogglingHidden}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        )}

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
