import { routes } from '@/api/routes';
// tuf-search: #PassDetailPage #passDetailPage #pass #passDetail — {{song}}
import "./passdetailpage.css";
import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from 'react-router-dom';
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { formatNumber, getVideoDetails, isoToEmoji } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import { EditPassPopup } from "@/components/popups/Passes";
import { MetaTags } from "@/components/common/display";
import { buildPassMeta } from "@/utils/meta";
import { StatusBanner } from "@/components/common/display/StatusBanner/StatusBanner";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { formatDate, normalizeKeyCount, validateFeelingRating } from "@/utils/Utility";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import i18next from "i18next";
import { EyeIcon, EyeOffIcon, TrashIcon } from "@/components/common/icons";
import PassAdofaiV2Flag from "@/components/cards/PassAdofaiV2Flag";
import WorldsFirstFlag from "@/components/cards/WorldsFirstFlag/WorldsFirstFlag";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
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
  const location = useLocation();
  const [res, setRes] = useState(null);
  const [videoDetail, setVideoDetail] = useState(null);
  const { user } = useAuth();
  const { difficultyDict } = useDifficultyContext();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openEditFeelingRatingPopup, setOpenEditFeelingRatingPopup] = useState(false);
  const [particles, setParticles] = useState([]);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [isTogglingHidden, setIsTogglingHidden] = useState(false);
  const [feelingRating, setFeelingRating] = useState('');
  const [isSavingFeelingRating, setIsSavingFeelingRating] = useState(false);
  const [feelingRatingError, setFeelingRatingError] = useState(null);

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
      const passData = await api.get(routes.database.passes.byIdPath(id));
      setRes(prevRes => ({
        ...prevRes,
        pass: passData.data
      }));
    } catch (error) {
      console.error("Error fetching pass data:", error);
    }
  };

  const handleOpenFeelingRatingPopup = () => {
    setFeelingRating(res?.pass?.feelingRating || '');
    setFeelingRatingError(null);
    setOpenEditFeelingRatingPopup(true);
  };

  const handleCloseFeelingRatingPopup = () => {
    if (isSavingFeelingRating) return;
    setOpenEditFeelingRatingPopup(false);
    setFeelingRatingError(null);
  };

  const handleSaveFeelingRating = async () => {
    const value = feelingRating.trim();
    if (!value) {
      setFeelingRatingError(t('passDetail.errors.feelingRatingRequired'));
      return;
    }

    setIsSavingFeelingRating(true);
    setFeelingRatingError(null);
    try {
      await api.patch(routes.database.passes.feelingRating(id), {
        feelingRating: value,
      });
      await fetchPassData();
      setOpenEditFeelingRatingPopup(false);
    } catch (error) {
      console.error("Error updating feeling rating:", error);
      const serverMessage = error?.response?.data?.error;
      setFeelingRatingError(serverMessage || t('passDetail.errors.updateFeelingRating'));
    } finally {
      setIsSavingFeelingRating(false);
    }
  };

  const handleToggleHidden = async () => {
    if (!showHideConfirm) {
      setShowHideConfirm(true);
      return;
    }

    setIsTogglingHidden(true);
    try {
      await api.patch(routes.database.passes.toggleHidden(id));
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

  const passMeta = useMemo(
    () => (res?.pass ? buildPassMeta(res.pass, t, { pathname: location.pathname }) : null),
    [res?.pass, t, location.pathname],
  );

  if (res == null)
    return (
      <div className="pass-detail-page">
        
        <div className="loader loader-pass-detail"></div>
      </div>
    );

  const { pass } = res;
  const accuracy = pass.accuracy;
  const levelDiff = difficultyDict[pass.level?.diffId];
  const baseScore = pass.level?.baseScore || levelDiff?.baseScore;
  const isOwnPass = user && user.playerId === pass.player?.id;

  return (
    <>
      {passMeta ? <MetaTags {...passMeta} /> : null}
      
      <div className="pass-detail">
        {pass?.isDeleted && (
          <StatusBanner dismissible tone="danger" placement="centered" icon={<TrashIcon color="#fff" size="24px" />}>
            {t('passDetail.banners.deleted')}
          </StatusBanner>
        )}
        {pass?.isHidden && !pass?.isDeleted && (
          <StatusBanner dismissible tone="muted" placement="centered" icon={<EyeOffIcon color="rgba(255,255,255,0.6)" size="24px" />}>
            {t('passDetail.banners.hidden')}
          </StatusBanner>
        )}

        <div className="pass-content">
          <div className="header">
            <div className="level-card">
              <div className="difficulty-section">
                <div className="difficulty-icon">
                  <img src={levelDiff?.icon} alt={levelDiff?.name} />
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
                  {...userAvatarUrls(pass.player)}
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

          <div className="pass-detail-body">
            <div className="info">
              <div className="info-items">
                <div className="info-item">
                  <p>{t('passDetail.stats.score.label')}</p>
                  <span className="info-desc">{t('passDetail.stats.score.value', { score: formatNumber(pass.scoreV2) })}</span>
                </div>
                <div className="info-item">
                  <p>{t('passDetail.stats.accuracy.label')}</p>
                  <span className={`info-desc ${accuracy === 1 ? 'perfect-shine' : ''}`}>
                    {t('passDetail.stats.accuracy.value', { accuracy: formatAccuracyRatio(accuracy, { withPercent: false }) })}
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
                <div className="info-item">
                  <p>{t('passDetail.stats.expectedRating.label')}</p>
                  <span className="info-desc">
                    {pass.expectedRating ? t('passDetail.stats.expectedRating.value', { rating: pass.expectedRating }) : t('passDetail.stats.expectedRating.none')}
                  </span>
                </div>
              </div>
              {(pass.isWorldsFirst || pass.isWorldsFirstPP || normalizeKeyCount(pass.keyCount) != null || pass.is12K || pass.is16K || pass.isNoHoldTap || pass.isAdofaiV2) && (
                <div className="flags-container">
                  {pass.isWorldsFirst && (
                    <WorldsFirstFlag variant="clear" tooltipIndex={`${pass.id}-detail-clear`} className="worlds-first" />
                  )}
                  {pass.isWorldsFirstPP && (
                    <WorldsFirstFlag variant="pp" tooltipIndex={`${pass.id}-detail-pp`} className="worlds-first" />
                  )}
                  {(normalizeKeyCount(pass.keyCount) != null || pass.is12K || pass.is16K || pass.isNoHoldTap || pass.isAdofaiV2) && (
                    <div className="flags">
                      {normalizeKeyCount(pass.keyCount) != null ? (
                        <span className="flag">{t('passDetail.flags.keyCount', { count: normalizeKeyCount(pass.keyCount) })}</span>
                      ) : (
                        <>
                          {pass.is12K && <span className="flag">{t('passDetail.flags.12k')}</span>}
                          {pass.is16K && <span className="flag">{t('passDetail.flags.16k')}</span>}
                        </>
                      )}
                      {pass.isNoHoldTap && <span className="flag">{t('passDetail.flags.noHoldTap')}</span>}
                      {pass.isAdofaiV2 && (
                        <PassAdofaiV2Flag
                          className="flag flag--adofai-v2"
                          i18nKey="passDetail.flags.adofaiV2"
                          ns="pages"
                          title={t('passDetail.flags.adofaiV2Note')}
                        />
                      )}
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
                    <div className={`judgement-item too-early ${pass.judgements?.earlyDouble === 0 && levelDiff?.name?.[0] !== "P" && accuracy !== 1 ? 'zero-shine' : ''}`}>
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
            {isOwnPass && (
              <button 
                className={`hide-button btn-fill-glass ${pass.isHidden ? 'hidden' : ''}`}
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
            {hasFlag(user, permissionFlags.SUPER_ADMIN) ? (
              <button className="edit-button btn-fill-accent" onClick={() => setOpenEditDialog(true)}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : 
            isOwnPass && (
            <button className="edit-button btn-fill-glass" onClick={handleOpenFeelingRatingPopup}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            )
            }
          </div>
        </div>

        {showHideConfirm && (
          <div className="hide-confirm-overlay" onClick={() => setShowHideConfirm(false)}>
            <div className="hide-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>{pass.isHidden ? t('passDetail.confirm.unhide.title') : t('passDetail.confirm.hide.title')}</h3>
              <p>{pass.isHidden ? t('passDetail.confirm.unhide.message') : t('passDetail.confirm.hide.message')}</p>
              <div className="hide-confirm-actions">
                <button className="confirm-button btn-fill-primary" onClick={handleToggleHidden} disabled={isTogglingHidden}>
                  {isTogglingHidden 
                    ? (pass.isHidden ? t('passDetail.confirm.unhide.processing') : t('passDetail.confirm.hide.processing'))
                    : (pass.isHidden ? t('passDetail.confirm.unhide.confirm') : t('passDetail.confirm.hide.confirm'))
                  }
                </button>
                <button className="cancel-button btn-fill-neutral-dark" onClick={() => setShowHideConfirm(false)} disabled={isTogglingHidden}>
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

        {openEditFeelingRatingPopup && (
          <div className="hide-confirm-overlay" onClick={handleCloseFeelingRatingPopup}>
            <div className="hide-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>{t('passDetail.feelingRating.title')}</h3>
              <input
                type="text"
                value={feelingRating}
                onChange={(e) => {
                  setFeelingRating(e.target.value);
                  if (feelingRatingError) setFeelingRatingError(null);
                }}
                placeholder={t('passDetail.feelingRating.placeholder')}
                disabled={isSavingFeelingRating}
              />
              {feelingRatingError && (
                <p className="feeling-rating-error">{feelingRatingError}</p>
              )}
              <div className="hide-confirm-actions">
                <button
                  className="confirm-button btn-fill-primary"
                  onClick={handleSaveFeelingRating}
                  disabled={isSavingFeelingRating}
                >
                  {isSavingFeelingRating
                    ? t('passDetail.feelingRating.saving')
                    : t('buttons.confirm', { ns: 'common' })}
                </button>
                <button
                  className="cancel-button btn-fill-neutral-dark"
                  onClick={handleCloseFeelingRatingPopup}
                  disabled={isSavingFeelingRating}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PassDetailPage;
