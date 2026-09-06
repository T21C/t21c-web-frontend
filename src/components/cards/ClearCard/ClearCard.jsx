// tuf-search: #ClearCard #clearCard #cards
import { Link } from "react-router-dom";
import { isoToEmoji } from "@/utils";
import "./clearcard.css"
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ChevronIcon, PassIcon, VideoLinkIcon } from "@/components/common/icons";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { getPrimaryVideoLink } from "@/utils/videoLink";
import { clampFloat, formatPassDate } from "@/utils/Utility";
import WorldsFirstFlag from "../WorldsFirstFlag/WorldsFirstFlag";
import PassFlags from "../PassFlags";
import i18next from "i18next";

const JUDGEMENT_KEYS = [
  ["earlyDouble", "early-double"],
  ["earlySingle", "early-single"],
  ["ePerfect", "e-perfect"],
  ["perfect", "perfect"],
  ["lPerfect", "l-perfect"],
  ["lateSingle", "late-single"],
  ["lateDouble", "late-double"],
];

const ClearCard = ({scoreData, index}) => {
  const { t } = useTranslation(["pages", "components"]);
  const [isExpanded, setIsExpanded] = useState(false);
  const countryCode = scoreData.player?.country;
  const judgements = scoreData.judgements;
  const feelingRating = scoreData.feelingRating;
  const needsExpansion = Boolean(feelingRating && feelingRating.length > 20);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const rankColor = index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "#f66" : "inherit";

  return (
    <div className={`clear-card ${isExpanded ? "expanded" : ""}`}>
      <span className="rank-display" style={{ color: rankColor }}>
        <b>#{index + 1}</b>
      </span>

      <div className="clear-card__header">
        <Link className="player-info" to={`/profile/${scoreData.playerId}`}>
          <UserAvatar
            {...userAvatarUrls(scoreData.player)}
            className="pfp"
          />
          <div className="name-container">
            <span className="player-name">{scoreData.player?.name}</span>
            {countryCode ? (
              <img src={isoToEmoji(countryCode)} className="country" alt="" />
            ) : null}
          </div>
        </Link>

        <div className="link-container">
          <Link className="video-link" to={`/passes/${scoreData.id}`}>
            <PassIcon size={28} />
          </Link>
          {scoreData.videoLink && (
            <a
              className="video-link"
              href={getPrimaryVideoLink(scoreData.videoLink)}
              target="_blank"
              rel="noopener noreferrer"
              title={t("score.card.tooltips.watchVideo", { ns: "components" })}
            >
              <VideoLinkIcon url={scoreData.videoLink} size="28px" />
            </a>
          )}
        </div>
      </div>

      <div className="clear-card__body">
        <div className="score-stats">
          <div className="score-value">{scoreData.scoreV2.toFixed(2)}</div>
          <div className="score-accuracy">{formatAccuracyRatio(scoreData.accuracy)}</div>
          <div className="score-speed">{clampFloat(scoreData.speed, 2)}×</div>
        </div>

        {judgements ? (
          <div className="judgements">
            {JUDGEMENT_KEYS.map(([key, className]) => (
              <span key={key} className={className}>{judgements[key] ?? 0}</span>
            ))}
          </div>
        ) : null}

        {scoreData.isWorldsFirst && (
          <WorldsFirstFlag variant="clear" tooltipIndex={`${scoreData.id}-clear`} className="wf-badge" />
        )}
        {scoreData.isWorldsFirstPP && (
          <WorldsFirstFlag variant="pp" tooltipIndex={`${scoreData.id}-pp`} className="wf-badge" />
        )}
        <PassFlags pass={scoreData} />
      </div>

      <div className="clear-card__meta">
        <div className="feeling-rating">
          <span className="feeling-label">{t("levelDetail.components.clearCard.feeling")}</span>
          <div className={`feeling-container ${isExpanded ? "expanded" : ""}`}>
            <div
              className={`feeling-content${needsExpansion ? " feeling-content--expandable" : ""}`}
              onClick={needsExpansion ? toggleExpand : undefined}
            >
              <span className="feeling-text">
                {feelingRating || "(None)"}
              </span>
              {needsExpansion && (
                <span className={`expand-arrow ${isExpanded ? "collapse" : ""}`}>
                  <ChevronIcon size={16} direction="right"/>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="time-info">{formatPassDate(scoreData.vidUploadTime, i18next?.language)}</div>
      </div>
    </div>
  );
};

export default ClearCard;
