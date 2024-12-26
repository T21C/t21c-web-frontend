import "./profilePage.css"
import api from "../../utils/api";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom"
import { isoToEmoji } from "../../Repository/RemoteRepository";
import { CompleteNav, ScoreCard, MetaTags } from "../../components";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useDifficultyContext } from "../../contexts/DifficultyContext";
import AdminPlayerPopup from "../../components/AdminPlayerPopup/AdminPlayerPopup";

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
    const {playerId} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const { t } = useTranslation('pages');
    const tProfile = (key, params = {}) => t(`profile.${key}`, params);
    const { isSuperAdmin } = useAuth();
    const { difficultyList } = useDifficultyContext();
    const [showAdminPopup, setShowAdminPopup] = useState(false);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;

    var valueLabels = {
      rankedScore: tProfile('valueLabels.rankedScore'),
      generalScore: tProfile('valueLabels.generalScore'),
      ppScore: tProfile('valueLabels.ppScore'),
      wfScore: tProfile('valueLabels.wfScore'),
      score12k: tProfile('valueLabels.score12k'),
      avgXacc: tProfile('valueLabels.avgXacc'),
      totalPasses: tProfile('valueLabels.totalPasses'),
      universalPasses: tProfile('valueLabels.universalPasses'),
      WFPasses: tProfile('valueLabels.WFPasses'),
      topDiff: tProfile('valueLabels.topDiff'),
      top12kDiff: tProfile('valueLabels.top12kDiff')
    };

    useEffect(() => {
        const fetchPlayer = async () => {
          setLoading(true);
          try {
            const response = await api.get(import.meta.env.VITE_PLAYERS+"/"+playerId);
            setPlayerData(response.data);
          } catch (error) {
            setError(true);
            console.error('Error fetching player data:', error);
          } finally {
            setLoading(false);
          }
        };
      
        fetchPlayer();
      }, [playerId]);

      const handlePlayerUpdate = (updatedPlayer) => {
        setPlayerData(updatedPlayer);
      };

      const handleEditClick = () => {
        if (!playerData) {
          console.error('No player data available');
          return;
        }
        setShowEditPopup(true);
      };

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
          <div className="background-level"></div>
          {playerData != null ? (Object.keys(playerData).length > 0 ? (
            <div className="player-body">
              <div className="player-content">
                <div className="player-header">
                  <div className="player-header-content">

                    <div className="player-info-container">
                      <div className="player-picture-container">
                      {playerData.discordAvatar ? (
                        <img src={playerData.discordAvatar} referrerPolicy="no-referrer" className="player-picture" alt="" />
                      ) : (playerData.pfp && playerData.pfp !== "none") ? (
                        <img src={playerData.pfp} referrerPolicy="no-referrer" className="player-picture" alt="" />
                      ) : (
                        <svg fill="#ffffff" className="player-picture" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>
                      )}
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
                            color: parseRankColor(playerData.ranks.rankedScoreRank), 
                            backgroundColor: `${parseRankColor(playerData.ranks.rankedScoreRank)}27`,
                            transform: playerData.discordUsername ? "translateY(-0.45rem)" : "translateY(0)"
                        }}
                        >#{playerData.ranks.rankedScoreRank}</h2>
                      </div>
                      <img
                        src={isoToEmoji(playerData.country)}
                        alt={playerData.country}
                        className="country-flag"
                      />
                    </div>
                  </div>
                  </div>
            
                  <div className="diff-container">
                    <div className="diff-info">
                      <p>{valueLabels.topDiff}</p>
                      <img
                        src={playerData.topDiff?.icon}
                        alt={playerData.topDiff?.name || 'None'}
                        className="diff-image"
                      />
                    </div>
            
                    <div className="diff-info">
                      <p>{valueLabels.top12kDiff}</p>
                      <img
                        src={playerData.top12kDiff?.icon}
                        alt={playerData.top12kDiff?.name || 'None'}
                        className="diff-image"
                      />
                    </div>
                  </div>
                  {isSuperAdmin && (
                  <button 
                    className="admin-edit-button"
                    onClick={handleEditClick}
                  >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  </button>
                )}
                </div>
            
              
                <div className="score-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.rankedScore}</p>
                    <p className="score-value">{playerData.rankedScore.toFixed(2)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.generalScore}</p>
                    <p className="score-value">{playerData.generalScore.toFixed(2)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.ppScore}</p>
                    <p className="score-value">{playerData.ppScore.toFixed(2)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.wfScore}</p>
                    <p className="score-value">{playerData.wfScore.toFixed(2)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.score12k}</p>
                    <p className="score-value">{playerData.score12k.toFixed(2)}</p>
                  </div>
                </div>
            
                <div className="passes-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.WFPasses}</p>
                    <p className="score-value">{playerData.WFPasses}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.avgXacc}</p>
                    <p className="score-value">{(playerData.avgXacc*100).toFixed(2)}%</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.totalPasses}</p>
                    <p className="score-value">{playerData.totalPasses}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.universalPasses}</p>
                    <p className="score-value">{playerData.universalPasses}</p>
                  </div>
                </div>
              </div>
              {playerData.passes && playerData.passes.length > 0 && (
                <div className="scores-section">
                  <h2>{tProfile('sections.scores.title')}</h2>
                  <div className="scores-list">
                    {playerData.passes.filter(score => !score.isDeleted && !score.level?.isHidden).sort((a, b) => b.scoreV2 - a.scoreV2).map((score, index) => (
                      <li key={index}>
                        <ScoreCard scoreData={score} />
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
        </div>
      );
}

export default ProfilePage