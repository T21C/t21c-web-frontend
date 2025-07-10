import { useNavigate } from "react-router-dom";
import "./playercard.css"
import { useTranslation } from "react-i18next";
import { useContext, useEffect, useState } from "react";
import { PlayerContext } from "@/contexts/PlayerContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { formatNumber } from "@/utils";
import { UserAvatar } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";

const diffFields = ["topDiff", "top12kDiff"];
const passes = ["totalPasses", "universalPassCount", "worldsFirstCount"];

const PlayerCard = ({player, onCreatorAssignmentClick}) => {
  const { sortBy } = useContext(PlayerContext);
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.player.${key}`) || key;
  const navigate = useNavigate();
  const { user } = useAuth();

  const sortLabels = {
    rankedScore: tCard('stats.rankedScore'),
    generalScore: tCard('stats.generalScore'),
    ppScore: tCard('stats.ppScore'),
    wfScore: tCard('stats.wfScore'),
    score12K: tCard('stats.score12K'),
    averageXacc: tCard('stats.averageXacc'),
    totalPasses: tCard('stats.totalPasses'),
    universalPassCount: tCard('stats.universalPassCount'),
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

  const handleCreatorAssignmentClick = (e) => {
    e.stopPropagation();
    if (onCreatorAssignmentClick && player.player?.user) {
      onCreatorAssignmentClick(player.player.user);
    }
  };

  const handleCreatorAssignmentClose = () => {
    setShowCreatorAssignment(false);
  };

  const handleCreatorAssignmentUpdate = () => {
    // Refresh the page data by triggering a context update
    // This will cause the leaderboard to refetch data
    window.dispatchEvent(new CustomEvent('auth:permission-changed'));
    setShowCreatorAssignment(false);
  };
    
  const prioritizedField = sortBy || 'rankedScore';

  const scoreFields = {
    rankedScore: {
      label: sortLabels.rankedScore,
      value: formatNumber(player.rankedScore),
    },
    generalScore: {
      label: sortLabels.generalScore,
      value: formatNumber(player.generalScore),
    },
    averageXacc: {
      label: sortLabels.averageXacc,
      value: `${(player.averageXacc * 100).toFixed(2)}%`,
    },
  };
    
  const primaryField = {
    label: sortLabels[sortBy],
    value: player[sortBy] !== undefined ? 
      diffFields.includes(sortBy) 
        ? player[sortBy].name
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

  if (!diffFields.includes(sortBy)) {
    if (!passes.includes(sortBy)) {
      if (sortBy === "averageXacc") {
        primaryField.value = (parseFloat(primaryField.value)*100).toFixed(2).toString()+"%";
      } else {
        primaryField.value = formatNumber(parseFloat(primaryField.value));
      }
    } else {
      primaryField.value = Math.round(parseFloat(primaryField.value));
    }
  }

  // Add difficulty icons if the sort field is a difficulty type
  const difficultyIcon = diffFields.includes(sortBy) ? player[sortBy].icon : null;

  return (
    <div className='player-card' onClick={() => redirect()} style={{backgroundColor: player.isBanned ? "#ff000099" : ""}}>
      <div className="img-wrapper">
        <div className="image-container">
          <UserAvatar  
            primaryUrl={player.avatarUrl}
            fallbackUrl={player.pfp}
          />
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
          <p className='player-name'>
            {player.name}
            
        {user?.isSuperAdmin && player.player?.user && (
          <button
            className="creator-assignment-btn"
            onClick={handleCreatorAssignmentClick}
            title="Assign Creator"
          >
            <span 
              className="creator-assignment-icon"
              style={{
                color: player.player.user.creator ? '#5f5' : '#fff'
              }}
            >🛠</span>
          </button>
        )}
            </p>
          {player.player.user?.username && (
            <span className="player-discord-handle">@{player.player.user?.username}</span>
          )}
        </div>
      </div>

      <div className="info-wrapper">
        <div className="score-wrapper">
          <p className="player-exp">{primaryField.label}</p>
          <div className="player-desc">
            {difficultyIcon ? (
              <div className="difficulty-display">
                <img src={difficultyIcon} alt={primaryField.value} className="difficulty-icon" />
                <span>{primaryField.value}</span>
              </div>
            ) : (
              primaryField.value
            )}
          </div>
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


