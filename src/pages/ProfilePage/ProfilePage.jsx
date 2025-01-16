import "./profilePage.css"
import api from "../../utils/api";
import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { isoToEmoji } from "../../Repository/RemoteRepository";
import { CompleteNav, ScoreCard, MetaTags } from "../../components";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useDifficultyContext } from "../../contexts/DifficultyContext";
import AdminPlayerPopup from "../../components/AdminPlayerPopup/AdminPlayerPopup";
import DefaultAvatar from "../../components/Icons/DefaultAvatar";
import { ShieldIcon } from "../../components/Icons/ShieldIcon";
import { EditIcon } from "../../components/Icons/EditIcon";

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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const { t } = useTranslation('pages');
    const tProfile = (key, params = {}) => t(`profile.${key}`, params);
    const { user } = useAuth();
    const { difficultyList } = useDifficultyContext();
    const [showAdminPopup, setShowAdminPopup] = useState(false);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;
    const navigate = useNavigate();


    if (!playerId) {
      playerId = user?.playerId;
    }

    var valueLabels = {
      rankedScore: tProfile('valueLabels.rankedScore'),
      generalScore: tProfile('valueLabels.generalScore'),
      ppScore: tProfile('valueLabels.ppScore'),
      wfScore: tProfile('valueLabels.wfScore'),
      score12k: tProfile('valueLabels.score12k'),
      averageXacc: tProfile('valueLabels.averageXacc'),
      totalPasses: tProfile('valueLabels.totalPasses'),
      universalPasses: tProfile('valueLabels.universalPasses'),
      worldsFirstCount: tProfile('valueLabels.worldsFirstCount'),
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
                        <DefaultAvatar className="player-picture" />
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
                  <div className="edit-button-container">
                  {user && user.id && (
                    <button 
                      className="edit-button"
                      onClick={() => navigate('/profile/edit')}
                    >
                      <EditIcon color="#fff" size={24} />
                    </button>
                  )}
                  {user?.isSuperAdmin && (
                    <button 
                      className="edit-button"
                      onClick={handleAdminEditClick}
                    >
                      <ShieldIcon color="#fff" size={24} />
                    </button>
                  )}
                  </div>
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