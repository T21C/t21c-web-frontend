import { useNavigate } from "react-router-dom";
import "./scorecard.css"
import "../../index.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { formatSpeed, formatScore } from "../../components/Misc/Utility"


// eslint-disable-next-line react/prop-types
const ScoreCard = ({scoreData}) => {
  const {t} = useTranslation()  
  const navigate = useNavigate()
  
    const redirect = () => {
      navigate(`/passes/${scoreData.id}`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };

    /*
  #  Xacc: 0.9865883166263395
    levelId: 3569
    date: "2024-08-07T03:12:46"
    is12K: false
    isNoHold: false
    isWorldsFirst: true
    judgements: Array(7) [ 8, 60, 71, … ]
    passId: 10751
  #  pguDiff: "U14"
  #  player: "Jipper"
  #  score: 21431.06075461851
  #  song: "Hello (BPM) 2024"
    speed: 1
    videoLink: "\nhttps://www.youtube.com/watch?v=H7SHcejTyYY"
    */


  return (
    <div className='score-card'>
      <div className="img-wrapper">
        <img src={scoreData.level.difficulty.icon} referrerPolicy="no-referrer" alt="" />
      </div>
      <div className="name-wrapper" onClick={() => redirect()}>
          <p className="score-exp">{scoreData.level.artist}</p>
          <p className='score-desc'>{scoreData.level.song}</p>
      </div>
      <div className="score-wrapper">
          <p className="score-exp">{t("scoreCardComponent.score")}</p>
          <p className='score-desc'>{formatScore(scoreData.scoreV2)}</p>
      </div>
      <div className="acc-wrapper">
          <p className="score-exp">{t("scoreCardComponent.accuracy")}</p>
          <div className="score-desc">{(scoreData.accuracy*100).toFixed(2)}%</div>
      </div>

      <div className="speed-wrapper">
          <p className="score-exp">{t("scoreCardComponent.speed")}</p>
          <div className="score-desc">{formatSpeed(scoreData.speed)}×</div>
      </div>

      <div className="vid-logo-wrapper">
      {scoreData.videoLink && (
                  <a className="svg-fill" href={scoreData.videoLink} target="_blank">
                    <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>Watch video</title> <desc></desc> <defs> </defs> <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"> </path> </g> </g> </g> </g></svg>
                  </a>
                )}
      </div>
    </div>
  );
};

export default ScoreCard;


