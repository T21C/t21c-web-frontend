import "./profilePage.css"
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { getLevelImage, getVideoDetails, isoToEmoji } from "../../Repository/RemoteRepository";
import { CompleteNav, ScoreCard } from "../../components";

const parseRankColor = (rank) => {
  var clr;
  switch(rank) {
    case 1:
      clr = "#efff63";
      break;
    case 2:
      clr = "#eeeeee";
      break;
    case 3:
      clr = "#ff834a";
      break;
    default:
      clr = "#777777";
      break;
  }
  console.log("color", clr, rank);
  
  return clr
}




const ProfilePage = () => {
    const {playerName} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    useEffect(() => {
        const fetchPlayer = async () => {
          setLoading(true);
          try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_PROFILE}?${new URLSearchParams({player: playerName})}`);
            
            // Store all the data
            console.log(response.data);
            
            setPlayerData(response.data);
            
          } catch (error) {
            setError(true);
            console.error('Error fetching player data:', error);
          } finally {
            setLoading(false);
          }
        };
      
        fetchPlayer();
      }, []);

      return (
        <div className="player-page">
          <CompleteNav />
    
          <div className="background-level"></div>
        {playerData != null ? (Object.keys(playerData).length > 0 ? (
          <div className="player-body">
          <div className="player-content">
            <div className="player-header">
              <div className="player-info-container">
                <div className="player-picture-container">
                  <img
                    src={playerData.pfp}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="player-picture"
                  />
                </div>
                <div className="player-info">
                  <div className="player-name-rank">
                    <h1>{playerData.player}</h1>
                    <h2
                      style={{
                        color: parseRankColor(playerData.ranks.rankedScore), 
                        backgroundColor: `${parseRankColor(playerData.ranks.rankedScore)}27`}}
                    >#{playerData.ranks.rankedScore}</h2>
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
                  <p>Top clear</p>
                  <img
                    src={getLevelImage(playerData.topDiff, playerData.topDiff, playerData.topDiff, playerData.topDiff)}
                    alt={playerData.topDiff}
                    className="diff-image"
                  />
                </div>
        
                <div className="diff-info">
                  <p>Top 12k clear</p>
                  <img
                    src={getLevelImage(playerData.top12kDiff, playerData.top12kDiff, playerData.top12kDiff, playerData.top12kDiff)}
                    alt={playerData.top12kDiff}
                    className="diff-image"
                  />
                </div>
              </div>
            </div>
        
          
            <div className="score-container">
              <div className="score-item">
                <p className="score-name">Ranked Score</p>
                <p className="score-value">{playerData.rankedScore.toFixed(2)}</p>
              </div>
              <div className="score-item">
                <p className="score-name">General Score</p>
                <p className="score-value">{playerData.generalScore.toFixed(2)}</p>
              </div>
              <div className="score-item">
                <p className="score-name">PP Score</p>
                <p className="score-value">{playerData.ppScore.toFixed(2)}</p>
              </div>
              <div className="score-item">
                <p className="score-name">12k Score</p>
                <p className="score-value">{playerData["12kScore"].toFixed(2)}</p>
              </div>
            </div>
        
            <div className="passes-container">
              <div className="score-item">
                <p className="score-name">WF Passes</p>
                <p className="score-value">{playerData.WFPasses}</p>
              </div>
              <div className="score-item">
                <p className="score-name">Average X Accuracy</p>
                <p className="score-value">{(playerData.avgXacc*100).toFixed(2)}%</p>
              </div>
              <div className="score-item">
                <p className="score-name">Total Passes</p>
                <p className="score-value">{playerData.totalPasses}</p>
              </div>
              <div className="score-item">
                <p className="score-name">Universal Passes</p>
                <p className="score-value">{playerData.universalPasses}</p>
              </div>
            </div>
          </div>
          {playerData.allScores && playerData.allScores.length > 0 && (
              <div className="all-scores">
                <h2>All Scores</h2>
                <ul>
                  {playerData.allScores.map((score, index) => (
                    <li key={index}>
                      <ScoreCard scoreData={score} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      
        :

        
            <h1 className="player-notfound">No player found</h1>)
        
        
        :

        <div className="loader"></div>}
        </div>
      );
}

export default ProfilePage