import { useNavigate } from "react-router-dom";
import "./playercard.css"
import { useTranslation } from "react-i18next";
import { useContext, useEffect, useState } from "react";
import { PlayerContext } from "@/contexts/PlayerContext";
import { formatScore } from "../Misc/Utility";




// eslint-disable-next-line react/prop-types
const nonRoundable = ["topDiff", "top12kDiff"]
const passes = ["totalPasses", "universalPasses", "WFPasses"] 

const PlayerCard = ({player}) => {
  const {sortBy
  } = useContext(PlayerContext);
  const {t} = useTranslation()  
  const navigate = useNavigate()

  
  var sortLabels = {
    rankedScore: t("valueLabels.rankedScore"),
    generalScore: t("valueLabels.generalScore"),
    ppScore: t("valueLabels.ppScore"),
    wfScore: t("valueLabels.wfScore"),
    "12kScore": t("valueLabels.12kScore"),
    avgXacc: t("valueLabels.avgXacc"),
    totalPasses: t("valueLabels.totalPasses"),
    universalPasses: t("valueLabels.universalPasses"),
    WFPasses: t("valueLabels.WFPasses"),
    topDiff: t("valueLabels.topDiff"),
    top12kDiff: t("valueLabels.top12kDiff")
  };
    const redirect = () => {
      navigate(`/profile/${player.id}`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };
    const prioritizedField = sortBy || 'rankedScore';

    const scoreFields = {
      rankedScore: {
        label: sortLabels.rankedScore,
        value: formatScore(player.rankedScore),
      },
      generalScore: {
        label: sortLabels.generalScore,
        value: formatScore(player.generalScore),
      },
      avgXacc: {
        label: sortLabels.avgXacc,
        value: `${(player.avgXacc * 100).toFixed(2)}%`,
      },
    };
    
    const primaryField = {
      label: sortLabels[sortBy],
      value: player[sortBy] !== undefined ? 

      player[sortBy]
      
      : player.generalScore,
    };

    const excludeKeys = Object.keys(scoreFields).filter(key => key === prioritizedField);

    // Filter out the excluded keys from secondary fields
    var secondaryFields = Object.keys(scoreFields)
      .filter(key => !excludeKeys.includes(key)) // Exclude the primary field
      .map(key => scoreFields[key]);

      if (secondaryFields.length > 2) {
        secondaryFields = secondaryFields.filter(field => field.label !== sortLabels.generalScore);
      }


    
    if (!nonRoundable.includes(sortBy)){
      if (!passes.includes(sortBy)){
        if (sortBy === "avgXacc"){
          primaryField.value = (parseFloat(primaryField.value)*100).toFixed(2).toString()+"%"
        }
        else primaryField.value = formatScore(parseFloat(primaryField.value))
      }
      else primaryField.value = Math.round(parseFloat(primaryField.value))
    }

  return (
    <div className='player-card' onClick={() => redirect()} style={{backgroundColor: player.isBanned ? "#ff000099" : ""}}>

      <div className="img-wrapper">
        <div className="image-container">
          {player.discordAvatar ? (
          <img src={player.discordAvatar} referrerPolicy="no-referrer" alt="" />
        ) : (player.pfp && player.pfp !== "none") ? (
          <img src={player.pfp} referrerPolicy="no-referrer" alt="" />
        ) : (
          <svg fill="#ffffff" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>
        )}
        </div>
        
        <div style={{fontSize: `${Math.max(0.8, 1.3 - (player.rank.toString().length * 0.15))}rem`}} className={`rank-display ${player.rank <= 3 ? `rank-${player.rank}` : ''}`}>
          <span style={{fontSize: `${Math.max(0.8, 1.3 - (player.rank.toString().length * 0.15))*0.7}rem`}}>
            #
          </span>
          {player.rank}
        </div>
      </div>
      <div className="name-wrapper">
          <div className="group">
              <p className="player-exp">{t("playerCardComponent.player")}</p>
          </div>
          <div className="name-container">
            <p className='player-name'>{player.name}</p>
            {player.discordUsername && (
              <span className="player-discord-handle">@{player.discordUsername}</span>
            )}
          </div>
      </div>
      <div className="info-wrapper">
      <div className="score-wrapper">
        <p className="player-exp">{primaryField.label}</p>
        <div className="player-desc">{primaryField.value}</div>
      </div>
      
      {secondaryFields.map((field, index) => (
        <div className="score-wrapper secondary" key={field.label}>
          <p className="player-exp">{field.label}</p>
          <div className="player-desc">{field.value}</div>
        </div>
      ))}
      </div>
      

    </div>
  );
};

export default PlayerCard;


