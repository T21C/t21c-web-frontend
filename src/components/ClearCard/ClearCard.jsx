import { useNavigate } from "react-router-dom";
import { isoToEmoji } from "../../Repository/RemoteRepository";
import "./clearcard.css"
import { useTranslation } from "react-i18next";
import { useState } from "react";
import DefaultAvatar from "../Icons/DefaultAvatar";
import { PassIcon } from "../Icons/PassIcon";

const ClearCard = ({scoreData, index}) => {
  const {t} = useTranslation()  
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
            {scoreData.player.user?.avatarUrl ? (
              <img src={scoreData.player.user.avatarUrl} referrerPolicy="no-referrer" className="pfp" alt="" />
            ) : scoreData.player.pfp ? (
              <img src={scoreData.player.pfp} referrerPolicy="no-referrer" className="pfp" alt="" />
            ) : (
              <DefaultAvatar className="pfp" />
            )}
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
            <PassIcon 
            size={40}
            className="video-link"
            onClick={() => {
              navigate(`/passes/${scoreData.id}`);
            }} 
            style={{
              cursor: "pointer"
            }}/>
            {scoreData.videoLink && (
              <a className="video-link" href={scoreData.videoLink} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_iconCarrier">
                    <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                      <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff">
                        <g id="icons" transform="translate(56.000000, 160.000000)">
                          <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"></path>
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="bottom-row">
          <div className="feeling-rating">
            <span className="feeling-label">Feeling:</span>
            {renderFeeling()}
          </div>
          <div className="time-info">{scoreData.vidUploadTime.slice(0, 10)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClearCard;


