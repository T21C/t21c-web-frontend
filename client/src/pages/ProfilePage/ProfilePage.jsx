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
                  {playerData.pfp? (
                    <img src={playerData.pfp} referrerPolicy="no-referrer" className="player-picture" alt="" />)
                      :(<svg fill="#ffffff" className="player-picture" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>)
      
                    }
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