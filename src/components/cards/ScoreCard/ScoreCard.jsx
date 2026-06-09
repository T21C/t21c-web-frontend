// tuf-search: #ScoreCard #scoreCard #cards
import { Link } from "react-router-dom";
import "./scorecard.css"
import "@/index.css"
import { useTranslation } from "react-i18next";
import { clampFloat, formatScore, formatPassDate } from "@/utils/Utility"
import { formatNumber } from "@/utils";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { Tooltip } from "react-tooltip";
import { formatCreatorDisplay } from "@/utils/Utility";
import WorldsFirstFlag from "../WorldsFirstFlag/WorldsFirstFlag";
import { VideoLinkIcon } from "@/components/common/icons";  
import i18next from "i18next";

const Judgements = ({judgements}) => {
  return (
    <div className="judgements-container">
      <div className="judgements-grid">
        <span className="e-perfect">{judgements.ePerfect}</span>
        <span className="perfect">{judgements.perfect}</span>
        <span className="l-perfect">{judgements.lPerfect}</span>
        </div>
        <div className="judgements-grid">
        <span className="early-double">{judgements.earlyDouble}</span>
        <span className="early-single">{judgements.earlySingle}</span>
        <span className="late-single">{judgements.lateSingle}</span>
      </div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const ScoreCard = ({scoreData, topScores, potentialTopScores}) => {
  const {t} = useTranslation('components');
  const isHiddenLevel = scoreData.level?.isHidden || false;
  const isHiddenPass = scoreData.isHidden || false;
  const { difficultyDict } = useDifficultyContext();
  const formattedDate = formatPassDate(scoreData.vidUploadTime, i18next?.language);

  return (
    <div className={`score-card ${isHiddenPass ? 'hidden-pass' : ''}`} style={{pointerEvents: isHiddenLevel ? 'none' : 'auto'}}>
      <div className="img-wrapper">
        {!isHiddenLevel && (
          <img src={difficultyDict[scoreData.level.diffId]?.icon} referrerPolicy="no-referrer" alt="" />
        )}
        {isHiddenLevel && (
          <div className="hidden-level-icon">🔒</div>
        )}
      </div>
      <Link className="name-wrapper" to={`/passes/${scoreData.id}`}>
          <p className='score-desc-creator'>{formatCreatorDisplay(scoreData.level)}</p>
          <p className='score-desc score-desc-song'>{scoreData.level.song}</p>
          <p className="score-exp score-exp-artist">{scoreData.level.artist ?? 'Hidden level'}</p>
      </Link>
      {scoreData.isWorldsFirst && (
        <WorldsFirstFlag variant="clear" tooltipIndex={`${scoreData.id}-clear`} className="wf-badge" />
      )}
      {scoreData.isWorldsFirstPP && (
        <WorldsFirstFlag variant="pp" tooltipIndex={`${scoreData.id}-pp`} className="wf-badge" />
      )}
      <div className="score-wrapper">
          <p className="score-exp">{t('score.card.labels.score')}</p>
          <p className='score-desc'>{formatScore(scoreData.scoreV2)}</p>
          {
          topScores.find(score => score.id === scoreData.id) ? 
          <p className="score-impact">+{formatNumber(
            topScores.find(score => score.id === scoreData.id).impact)
          }</p> : 
          potentialTopScores.find(score => score.id === scoreData.id) &&
           <p className="score-impact potential"
           data-tooltip-id="potential-score-tooltip">+{formatNumber(
            potentialTopScores.find(score => score.id === scoreData.id).impact)
          }</p>
          }
          <Tooltip id="potential-score-tooltip" place="bottom" style={{maxWidth: '400px'}}>
            {t('score.card.tooltips.potentialScore')}
          </Tooltip>
      </div>
      <div className="acc-wrapper">
        <div className="acc-wrapper-inner">
          <p className="score-exp">{t('score.card.labels.accuracy')}</p>
          <div className={`score-desc ${scoreData.accuracy == 1 ? 'pure-perfect' : ''}`}>{(scoreData.accuracy*100).toFixed(2)}%</div>
          </div>
          <Judgements judgements={scoreData.judgements} />
      </div>

      <div className="speed-wrapper">
          <p className="score-exp">{t('score.card.labels.speed')}</p>
          <div className="score-desc">{clampFloat(scoreData.speed, 2)}×</div>
      </div>

      <div className="vid-logo-wrapper">
        {scoreData.videoLink && !isHiddenLevel && (
           <a className="svg-fill" href={scoreData.videoLink} target="_blank" title={t('score.card.tooltips.watchVideo')}>
             <VideoLinkIcon size="32px" url={scoreData.videoLink} />
           </a>
         )}
      </div>

      {formattedDate && (
        <time className="score-card__date" dateTime={scoreData.vidUploadTime}>
          {formattedDate}
        </time>
      )}
    </div>
  );
};

export default ScoreCard;


