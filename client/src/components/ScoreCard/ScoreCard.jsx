import { useNavigate } from "react-router-dom";
import { getLevelImage, getVideoDetails } from "../../Repository/RemoteRepository";
import "./scorecard.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const formatSpeed = (speed) => {
  const speedTwoDecimals = speed.toFixed(2);
  if (speedTwoDecimals[speedTwoDecimals.length - 1] !== '0') {
    return speedTwoDecimals;
  }
  const speedOneDecimal = speed.toFixed(2);
  if (speedOneDecimal[speedOneDecimal.length - 1] !== '0') {
    return speedOneDecimal;
  }

  return Math.round(speed);
};

// eslint-disable-next-line react/prop-types
const ScoreCard = ({scoreData}) => {
  const {t} = useTranslation()  
  const navigate = useNavigate()
    const redirect = () => {
      navigate(`#`);
    };

    const onAnchorClick = (e) => {
      e.stopPropagation();
    };

    /*
  #  Xacc: 0.9865883166263395
    chartId: 3569
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
    vidLink: "\nhttps://www.youtube.com/watch?v=H7SHcejTyYY"
    */


  return (
    <div className='score-card' onClick={() => redirect()}>
      <div className="img-wrapper">
        <img src={getLevelImage(scoreData.pguDiff, scoreData.pguDiff ,scoreData.pguDiff ,scoreData.pguDiff)} referrerPolicy="no-referrer" alt="" />
      </div>
      <div className="name-wrapper">
          <p className="score-exp">{t("scoreCardComponent.song")}</p>
          <p className='score-desc'>{scoreData.song}</p>
      </div>
      <div className="name-wrapper">
          <p className="score-exp">{t("scoreCardComponent.score")}</p>
          <p className='score-desc'>{scoreData.score.toFixed(2)}</p>
      </div>
      <div className="score-wrapper">
          <p className="score-exp">{t("scoreCardComponent.accuracy")}</p>
          <div className="score-desc">{(scoreData.Xacc*100).toFixed(2)}%</div>
      </div>

      <div className="acc-wrapper">
          <p className="score-exp">{t("scoreCardComponent.speed")}</p>
          <div className="score-desc">{formatSpeed(scoreData.speed)}x</div>
      </div>

      

    </div>
  );
};

export default ScoreCard;


