import { useNavigate } from "react-router-dom";
import { isoToEmoji } from "@/utils";
import "./clearcard.css"
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { PassIcon, YoutubeIcon } from "@/components/common/icons";
import { UserAvatar } from "@/components/layout";
import { selectIconSize } from "@/utils/Utility";

const ClearCard = ({scoreData, index}) => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false);
  
  const redirect = () => {
    navigate(`/profile/${scoreData.playerId}`);
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderFeeling = () => {
    if (!scoreData.feelingRating) return "(None)";
    const needsExpansion = scoreData.feelingRating.length > 20;
    
    return (
      <div className={`feeling-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="feeling-content" onClick={needsExpansion ? toggleExpand : undefined}>
          <span className="feeling-text">
            {scoreData.feelingRating}
          </span>
          {needsExpansion && (
            <span className={`expand-arrow ${isExpanded ? 'collapse' : ''}`}>
              {isExpanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`clear-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Left Section - Player Info */}
      <div className="card-section player-section">
        <div className="rank-display">
          <span className="index" style={{ 
            color: index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "#f66" : "inherit"
          }}>
            <b>#{index + 1}</b>
          </span>
        </div>
        
        <div className="player-info" onClick={redirect}>
          <div className="avatar-container">
            <UserAvatar 
              primaryUrl={selectIconSize(scoreData.player.user?.avatarUrl, "small")}
              fallbackUrl={scoreData.player.pfp}
              className="pfp"
            />
          </div>
          <div className="name-container">
            <span className="player-name">{scoreData.player.name}</span>
            <img src={isoToEmoji(scoreData.player.country)} className="country" alt=""/>
          </div>
        </div>
      </div>

      {/* Right Section - Score Info & Judgements */}
      <div className="card-section details-section">
        <div className={`collapsible-fields ${isExpanded ? 'hidden' : ''}`}>
          <div className="score-info">
            <div className="score-value">{scoreData.scoreV2.toFixed(2)}</div>
            <div className="score-accuracy">{(scoreData.accuracy * 100).toFixed(2)}%</div>
            <div className="score-speed">{scoreData.speed ? scoreData.speed : "1.0"}×</div>
            <div className="judgements">
              <span className="early-double">{scoreData.judgements.earlyDouble}</span>
              <span className="early-single">{scoreData.judgements.earlySingle}</span>
              <span className="e-perfect">{scoreData.judgements.ePerfect}</span>
              <span className="perfect">{scoreData.judgements.perfect}</span>
              <span className="l-perfect">{scoreData.judgements.lPerfect}</span>
              <span className="late-single">{scoreData.judgements.lateSingle}</span>
              <span className="late-double">{scoreData.judgements.lateDouble}</span>
            </div>
            <div className="link-container">
            <PassIcon 
            size={32}
            className="video-link"
            onClick={() => {
              navigate(`/passes/${scoreData.id}`);
            }} 
            style={{
              cursor: "pointer"
            }}/>
            {scoreData.videoLink && (
              <a className="video-link" href={scoreData.videoLink} target="_blank" rel="noopener noreferrer">
                <YoutubeIcon size={'32px'} />
              </a>
            )}
            </div>
          </div>
        </div>

        <div className="bottom-row">
          <div className="feeling-rating">
            <span className="feeling-label">{t('levelDetail.components.clearCard.feeling')}</span>
            {renderFeeling()}
          </div>
          <div className="time-info">{scoreData.vidUploadTime.slice(0, 10)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClearCard;


