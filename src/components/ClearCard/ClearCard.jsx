import { useNavigate } from "react-router-dom";
import { isoToEmoji } from "../../Repository/RemoteRepository";
import "./clearcard.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import axios from "axios";
import { Encoder } from "base32.js";

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
function encodeToBase32(input) {
  const encoder = new Encoder();
  const buffer = new TextEncoder().encode(input);
  return encoder.write(buffer).finalize();
}
// eslint-disable-next-line react/prop-types
const ClearCard = ({scoreData, index}) => {
  console.log(scoreData)
  const {t} = useTranslation()  
  const navigate = useNavigate()
  
  console.log(scoreData);
  
    const redirect = () => {
      navigate(`/profile/${encodeToBase32(scoreData.player)}`);
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

    console.log(scoreData);
    
  return (
    <div className="clear-card" key={index} >
                  <p className="name"  onClick={() => redirect()}>

                    <span className="index" style={{ color:index === 0 ? "gold" : index === 1? "silver": index === 2? "brown": "inherit"}} >
                      <b>#{index + 1}</b>
                    </span>
                    &nbsp;
                    {scoreData.pfp? (
                    <img src={scoreData.pfp} referrerPolicy="no-referrer" className="pfp" alt="" />)
                      :(<svg fill="#ffffff" viewBox="-0.32 -0.32 32.64 32.64" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="0.32"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 0c-8.836 0-16 7.163-16 16s7.163 16 16 16c8.837 0 16.001-7.163 16.001-16s-7.163-16-16.001-16zM16 30.032c-7.72 0-14-6.312-14-14.032s6.28-14 14-14 14.001 6.28 14.001 14-6.281 14.032-14.001 14.032zM14.53 25.015h2.516v-2.539h-2.516zM15.97 6.985c-1.465 0-2.672 0.395-3.62 1.184s-1.409 2.37-1.386 3.68l0.037 0.073h2.295c0-0.781 0.261-1.904 0.781-2.308s1.152-0.604 1.893-0.604c0.854 0 1.511 0.232 1.971 0.696s0.689 1.127 0.689 1.989c0 0.725-0.17 1.343-0.512 1.855-0.343 0.512-0.916 1.245-1.721 2.198-0.831 0.749-1.344 1.351-1.538 1.806s-0.297 1.274-0.305 2.454h2.405c0-0.74 0.047-1.285 0.14-1.636s0.36-0.744 0.799-1.184c0.945-0.911 1.703-1.802 2.277-2.674 0.573-0.87 0.86-1.831 0.86-2.881 0-1.465-0.443-2.607-1.331-3.424s-2.134-1.226-3.736-1.226z"></path> </g></svg>)
      
                    }
                    &nbsp;
                    <img src={isoToEmoji(scoreData.country)} className="country" alt=""/>
                    &nbsp;
                    <span className="player-name">
                    {scoreData.player}
                    </span>
                  </p>
                  <div className="time">{scoreData.date.slice(0, 10)}</div>
                  <p className="general">{scoreData.score.toFixed(2)}</p>
                  <p className="feeling">Feeling: <b>{scoreData.feelingRating? scoreData.feelingRating : "(None)"}</b></p>
                  <p className="acc">{(scoreData.Xacc * 100).toFixed(2)}%</p>
                  <div className="speed">{scoreData.speed ? scoreData.speed : "1.0"}×</div>
                  <p className="judgements">
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
                  <div className="vid-logo-wrapper">
                  <a className="svg-fill" href={scoreData.vidLink} target="_blank">
                    <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>Watch video</title> <desc></desc> <defs> </defs> <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"> </path> </g> </g> </g> </g></svg>
                  </a>
                  </div>
                </div>
  );
};

export default ClearCard;


