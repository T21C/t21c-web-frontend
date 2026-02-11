import { useNavigate } from "react-router-dom";
import "./scorecard.css"
import "@/index.css"
import { useTranslation } from "react-i18next";
import { formatSpeed, formatScore } from "@/utils/Utility"
import { formatNumber } from "@/utils";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { Tooltip } from "react-tooltip";
import { formatCreatorDisplay } from "@/utils/Utility";

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
  const navigate = useNavigate()
  const {t} = useTranslation('components');
  const isHiddenLevel = scoreData.level?.isHidden || false;
  const isHiddenPass = scoreData.isHidden || false;
  const { difficultyDict } = useDifficultyContext();

  return (
    <div className={`score-card ${isHiddenPass ? 'hidden-pass' : ''}`} style={{pointerEvents: isHiddenLevel ? 'none' : 'auto'}}>
      <div className="img-wrapper">
        {!isHiddenLevel && (
          <img src={difficultyDict[scoreData.level.difficulty.id]?.icon} referrerPolicy="no-referrer" alt="" />
        )}
        {isHiddenLevel && (
          <div className="hidden-level-icon">🔒</div>
        )}
      </div>
      <div className="name-wrapper" onClick={() => 
        navigate(`/passes/${scoreData.id}`)
      }>
          <p className='score-desc-creator'>{formatCreatorDisplay(scoreData.level)}</p>
          <p className='score-desc score-desc-song'>{scoreData.level.song}</p>
          <p className="score-exp score-exp-artist">{scoreData.level.artist ?? 'Hidden level'}</p>
      </div>
      {scoreData.isWorldsFirst && <div className="wf-badge">🏆<div className="wf-text">WF</div></div>}
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
          <div className="score-desc">{formatSpeed(scoreData.speed)}×</div>
      </div>

      <div className="vid-logo-wrapper">
        {scoreData.videoLink && !isHiddenLevel && (
           <a className="svg-fill" href={scoreData.videoLink} target="_blank" title={t('score.card.tooltips.watchVideo')}>
             <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>Watch video</title> <desc></desc> <defs> </defs> <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"> </path> </g> </g> </g> </g></svg>
           </a>
         )}
      </div>
    </div>
  );
};

export default ScoreCard;


