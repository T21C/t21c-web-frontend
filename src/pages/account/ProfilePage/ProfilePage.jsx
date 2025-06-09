import "./profilePage.css"
import api from "@/utils/api";
import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { isoToEmoji, formatNumber } from "@/utils";
import { CompleteNav, UserAvatar } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { ScoreCard } from "@/components/cards";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { AdminPlayerPopup } from "@/components/popups";
import { DefaultAvatar, ShieldIcon, EditIcon } from "@/components/common/icons";
import { CaseOpenSelector } from "@/components/common/selectors";
import caseOpen from "@/assets/icons/case.png";

const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

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

const ProfilePage = () => {
    let {playerId} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [showCaseOpen, setShowCaseOpen] = useState(false);
    const { t } = useTranslation('pages');
    const tProfile = (key, params = {}) => t(`profile.${key}`, params);
    const { user } = useAuth();
    const [showEditPopup, setShowEditPopup] = useState(false);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);

    const isOwnProfile = !playerId || Number(playerId) === user?.playerId;

    if (!playerId) {
      playerId = user?.playerId;
    }
    

    var valueLabels = {
      rankedScore: tProfile('valueLabels.rankedScore'),
      generalScore: tProfile('valueLabels.generalScore'),
      ppScore: tProfile('valueLabels.ppScore'),
      wfScore: tProfile('valueLabels.wfScore'),
      score12K: tProfile('valueLabels.score12K'),
      averageXacc: tProfile('valueLabels.averageXacc'),
      totalPasses: tProfile('valueLabels.totalPasses'),
      universalPassCount: tProfile('valueLabels.universalPassCount'),
      worldsFirstCount: tProfile('valueLabels.worldsFirstCount'),
      topDiff: tProfile('valueLabels.topDiff'),
      top12kDiff: tProfile('valueLabels.top12kDiff')
    };

    useEffect(() => {
        const fetchPlayer = async () => {
          try {
            const response = await api.get(import.meta.env.VITE_PLAYERS+"/"+playerId);
            setPlayerData(response.data);

          } catch (error) {
            console.error('Error fetching player data:', error);
          }
        };
      
        fetchPlayer();
      }, [playerId]);

      const handlePlayerUpdate = (updatedPlayer) => {
        setPlayerData(updatedPlayer);
      };

      const handleAdminEditClick = () => {
        if (!playerData) {
          console.error('No player data available');
          return;
        }
        setShowEditPopup(true);
      };

      const handleSearchForOther = () => {
        navigate('/leaderboard');
      }

      const handleCaseOpenClick = () => {
        setShowCaseOpen(true);
      };

      const handleCaseOpenClose = () => {
        setShowCaseOpen(false);
      };

      if (playerId && !playerData) {
        return (
          <div className="player-page">
            <CompleteNav />
            <div className="background-level"></div>
            <div className="loader"/>  
          </div>
        );
      }

      if (!playerId && !user) {
        return (
          <div className="player-page">
            <MetaTags
              title={tProfile('meta.defaultTitle')}
              description={tProfile('meta.description')}
              url={currentUrl}
              image={'/default-avatar.jpg'}
              type="profile"
          />
            <CompleteNav />
            <div className="background-level"></div>
            <h1 className="player-notfound">{tProfile('notLoggedIn')}</h1>
            <h2 className="player-search-for-other" onClick={handleSearchForOther}>{tProfile('searchForOther')}</h2>
          </div>
        );
      }

      return (
        <div className="player-page">
          <MetaTags
            title={playerData?.name ? tProfile('meta.title', { name: playerData.name }) : tProfile('meta.defaultTitle')}
            description={tProfile('meta.description', { name: playerData?.name || '' })}
            url={currentUrl}
            image={playerData?.avatar || '/default-avatar.jpg'}
            type="profile"
          />
          <CompleteNav />
          {user && !user.isEmailVerified && isOwnProfile ? (
            <div className="email-verification-banner" onClick={() => navigate('/profile/verify-email')}>
              <span className="email-verification-text">Please verify your email address to access all features</span>
              <span className="email-verification-arrow">→</span>
            </div>
          ): <br />}
          <div className="background-level"></div>
          {playerData != null ? (Object.keys(playerData).length > 0 ? (
            <div className="player-body">
              <div className="player-content">
                <div className="player-header">
                  {ENABLE_ROULETTE && (
                    <button 
                      className="case-open-button" 
                      onClick={handleCaseOpenClick}
                      disabled={!user && !playerId}
                  >
                    <img src={caseOpen} alt="Case Open" />
                  </button>
                  )}
                  <div className="player-header-content">

                    <div className="player-info-container">
                      <div className="player-picture-container">
                      <UserAvatar 
                        primaryUrl={playerData.avatarUrl}
                        fallbackUrl={playerData.pfp}
                        className="player-picture"
                      />
                      <div className="player-id">ID: {playerData.id}</div>
                    </div>
                    <div className="player-info">
                      <div className="player-name-rank">
                        <div className="player-name-container">
                          <h1>{playerData.name}</h1>
                          {playerData.discordUsername && (
                            <span className="player-discord-handle">@{playerData.discordUsername}</span>
                          )}
                        </div>
                        <h2
                          style={{
                            color: parseRankColor(playerData.stats.rankedScoreRank), 
                            backgroundColor: `${parseRankColor(playerData.stats.rankedScoreRank)}27`,
                            transform: playerData.discordUsername ? "translateY(-0.45rem)" : "translateY(0)"
                        }}
                        >#{playerData.stats.rankedScoreRank}</h2>
                      </div>
                      <img
                        src={isoToEmoji(playerData.country)}
                        alt={playerData.country}
                        className="country-flag"
                      />
                    </div>
                  </div>
                  <div className="diff-container">
                    <div className="diff-info">
                      <p>{valueLabels.topDiff}</p>
                      <img
                        src={playerData.stats.topDiff?.icon}
                        alt={playerData.stats.topDiff?.name || 'None'}
                        className="diff-image"
                      />
                    </div>

                    <div className="diff-info">
                      <p>{valueLabels.top12kDiff}</p>
                      <img
                        src={playerData.stats.top12kDiff?.icon}
                        alt={playerData.stats.top12kDiff?.name || 'None'}
                        className="diff-image"
                      />
                    </div>
                  </div>
                  </div>
                  <div className="edit-button-container">
                  {user && isOwnProfile && (
                    <button 
                      className="edit-button"
                      //style={{cursor: "not-allowed", pointerEvents: "none"}}
                      onClick={() => navigate('/profile/edit')}
                    >
                      <EditIcon color="#fff" size={"24px"} />
                    </button>
                  )}
                  {user?.isSuperAdmin && (
                    <button 
                      className="edit-button"
                      onClick={handleAdminEditClick}
                    >
                      <ShieldIcon color="#fff" size={"24px"} />
                    </button>
                  )}
                  </div>
                </div>
            
              
                <div className="score-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.rankedScore}</p>
                    <p className="score-value">{formatNumber(playerData.rankedScore)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.generalScore}</p>
                    <p className="score-value">{formatNumber(playerData.generalScore)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.ppScore}</p>
                    <p className="score-value">{formatNumber(playerData.ppScore)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.wfScore}</p>
                    <p className="score-value">{formatNumber(playerData.wfScore)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.score12K}</p>
                    <p className="score-value">{formatNumber(playerData.score12K)}</p>
                  </div>
                </div>
            
                <div className="passes-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.worldsFirstCount}</p>
                    <p className="score-value">{playerData.worldsFirstCount}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.averageXacc}</p>
                    <p className="score-value">{(playerData.averageXacc*100).toFixed(2)}%</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.totalPasses}</p>
                    <p className="score-value">{playerData.totalPasses}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.universalPassCount}</p>
                    <p className="score-value">{playerData.universalPassCount}</p>
                  </div>
                </div>
              </div>
              {playerData.passes && playerData.passes.length > 0 && (
                <div className="scores-section">
                  <h2>{tProfile('sections.scores.title')}</h2>
                  <div className="scores-list">
                    {playerData.passes.filter(score => !score.isDeleted).sort((a, b) => b.scoreV2 - a.scoreV2).map((score, index) => (
                      <li key={index}>
                        <ScoreCard scoreData={score} topScores={playerData.topScores} />
                      </li>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <h1 className="player-notfound">{tProfile('notFound')}</h1>)
          : <div className="loader"></div>}
          
          {showEditPopup && playerData && (
            <AdminPlayerPopup
              player={playerData}
              onClose={() => setShowEditPopup(false)}
              onUpdate={handlePlayerUpdate}
            />
          )}

          {showCaseOpen && ENABLE_ROULETTE && (
            <div className={`case-open-popup ${isSpinning ? 'case-open-popup--spinning' : ''}`}>
              <div className="case-open-popup__overlay" onClick={!isSpinning ? handleCaseOpenClose : undefined}></div>
              <div className="case-open-popup__content">
                <CaseOpenSelector 
                  targetPlayerId={playerId || user?.playerId} 
                  onClose={handleCaseOpenClose}
                  isSpinning={setIsSpinning}
                />
              </div>
            </div>
          )}
        </div>
      );
}

export default ProfilePage