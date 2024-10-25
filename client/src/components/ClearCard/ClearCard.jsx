import { useNavigate } from "react-router-dom";
import { getLevelImage, getVideoDetails, isoToEmoji } from "../../Repository/RemoteRepository";
import "./clearcard.css"
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
const ClearCard = ({scoreData, index}) => {
  const {t} = useTranslation()  
  const navigate = useNavigate()
  console.log(scoreData);
  
    const redirect = () => {
      navigate(`/profile/${scoreData.player}`);
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
    <div className="clear-card" key={index} onClick={() => redirect()} >
                  <p className="name">

                    <span className="index" style={{ color:index === 0 ? "gold" : index === 1? "silver": index === 2? "brown": "inherit"}} >
                      <b>#{index + 1}</b>
                    </span>
                    &nbsp;
                    <img src={isoToEmoji(scoreData.country)} alt=""/>
                    &nbsp;
                    {scoreData.player}
                  </p>
                  <div className="time">{scoreData.vidUploadTime.slice(0, 10)}</div>
                  <p className="general">{scoreData.scoreV2.toFixed(2)}</p>
                  <p className="acc">{(scoreData.accuracy * 100).toFixed(2)}%</p>
                  <div className="speed">{scoreData.speed ? scoreData.speed : "1.0"}×</div>
                  <p className="judgements" onClick={() => window.open(scoreData.vidLink, '_blank')}>
                    <span style={{ color: "red" }}>{scoreData.judgements[0]}</span>
                    &nbsp;
                    <span style={{ color: "orange" }}>
                      {scoreData.judgements[1]}
                    </span>
                    &nbsp;
                    <span style={{ color: "yellow" }}>
                      {scoreData.judgements[2]}
                    </span>
                    &nbsp;
                    <span style={{ color: "lightGreen" }}>
                      {scoreData.judgements[3]}
                    </span>
                    &nbsp;
                    <span style={{ color: "yellow" }}>
                      {scoreData.judgements[4]}
                    </span>
                    &nbsp;
                    <span style={{ color: "orange" }}>
                      {scoreData.judgements[5]}
                    </span>
                    &nbsp;
                    <span style={{ color: "red" }}>{scoreData.judgements[6]}</span>
                  </p>
                </div>
  );
};

export default ClearCard;


