import { useNavigate } from "react-router-dom";
import "./playercard.css"
import { useTranslation } from "react-i18next";
import { useContext, useEffect, useState } from "react";
import { PlayerContext } from "@/contexts/PlayerContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { formatScore } from "../Misc/Utility";
import DefaultAvatar from "../Icons/DefaultAvatar";

const nonRoundable = ["topDiff", "top12kDiff"];
const passes = ["totalPasses", "universalPasses", "worldsFirstCount"];

const PlayerCard = ({player}) => {
  const { sortBy } = useContext(PlayerContext);
  const { difficultyDict } = useContext(DifficultyContext);
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.player.${key}`);
  const navigate = useNavigate();

  const sortLabels = {
    rankedScore: tCard('stats.rankedScore'),
    generalScore: tCard('stats.generalScore'),
    ppScore: tCard('stats.ppScore'),
    wfScore: tCard('stats.wfScore'),
    score12K: tCard('stats.score12K'),
    averageXacc: tCard('stats.averageXacc'),
    totalPasses: tCard('stats.totalPasses'),
    universalPasses: tCard('stats.universalPasses'),
    worldsFirstCount: tCard('stats.worldsFirstCount'),
    topDiff: tCard('stats.topDiff'),
    top12kDiff: tCard('stats.top12kDiff')
  };

  const redirect = () => {
    navigate(`/profile/${player.id}`);
  };

  const onAnchorClick = (e) => {
    e.stopPropagation();
  };
    
  const prioritizedField = sortBy || 'rankedScore';

  const getDifficultyName = (diffId) => {
    if (!diffId || diffId === 0) return '-';
    return difficultyDict[diffId]?.name || diffId.toString();
  };

  const scoreFields = {
    rankedScore: {
      label: sortLabels.rankedScore,
      value: formatScore(player.rankedScore),
    },
    generalScore: {
      label: sortLabels.generalScore,
      value: formatScore(player.generalScore),
    },
    averageXacc: {
      label: sortLabels.averageXacc,
      value: `${(player.averageXacc * 100).toFixed(2)}%`,
    },
  };
    
  const primaryField = {
    label: sortLabels[sortBy],
    value: player[sortBy] !== undefined ? 
      nonRoundable.includes(sortBy) 
        ? getDifficultyName(player[sortBy])
        : player[sortBy]
    : player.generalScore,
  };

  const excludeKeys = Object.keys(scoreFields).filter(key => key === prioritizedField);

  // Filter out the excluded keys from secondary fields
  var secondaryFields = Object.keys(scoreFields)
    .filter(key => !excludeKeys.includes(key))
    .map(key => scoreFields[key]);

  if (secondaryFields.length > 2) {
    secondaryFields = secondaryFields.filter(field => field.label !== sortLabels.generalScore);
  }

  if (!nonRoundable.includes(sortBy)) {
    if (!passes.includes(sortBy)) {
      if (sortBy === "averageXacc") {
        primaryField.value = (parseFloat(primaryField.value)*100).toFixed(2).toString()+"%";
      } else {
        primaryField.value = formatScore(parseFloat(primaryField.value));
      }
    } else {
      primaryField.value = Math.round(parseFloat(primaryField.value));
    }
  }
  console.log(player);
  return (
    <div className='player-card' onClick={() => redirect()} style={{backgroundColor: player.isBanned ? "#ff000099" : ""}}>
      <div className="img-wrapper">
        <div className="image-container">
          {player.user?.avatarUrl ? (
            <img src={player.user.avatarUrl} referrerPolicy="no-referrer" alt="" />
          ) : (player.pfp && player.pfp !== "none") ? (
            <img src={player.pfp} referrerPolicy="no-referrer" alt="" />
          ) : (
            <DefaultAvatar />
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
          <p className="player-exp">{tCard('title')} | ID: {player.id}</p>
        </div>
        <div className="name-container">
          <p className='player-name'>{player.name}</p>
          {player.player.user?.username && (
            <span className="player-discord-handle">@{player.player.user?.username}</span>
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


