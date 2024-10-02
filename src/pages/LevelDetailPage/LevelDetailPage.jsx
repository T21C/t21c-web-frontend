/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import "./leveldetailpage.css"
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from 'react-router-dom';
import { CompleteNav } from "../../components";
import {
  fetchLevelInfo,
  fetchPassPlayerInfo,
  getLevelImage,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isoToEmoji,
} from "../../Repository/RemoteRepository";

import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

const LevelDetailPage = () => {
  const {t} = useTranslation()
  const { detailPage } = useLocation();
  // cange how to get param
  const id = new URLSearchParams(window.location.search).get("id");
  const [res, setRes] = useState(null);
  const [player, setPlayer] = useState([]);
  const [initialPlayer, setInitialPlayer] = useState([])

  const [highSpeed, setHighSpeed] = useState(null);
  const [highAcc, setHighAcc] = useState(null);
  const [highScore, setHighScore] = useState(null);
  const [highDate, setHighDate] = useState(null)
  const [passCount, setPassCount] = useState(0)

  const [displayedPlayers, setDisplayedPlayers] = useState([]);

  const [leaderboardSort, setLeaderboardSort] = useState("SCR");

  const [infoLoading, setInfoLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [detailPage]);

  useEffect(() => {
    fetchLevelInfo(id)
      .then((res) => {
        setRes(res);
        const fetchedPlayers = res?.passes.player.results || [];
        const passCount = res?.passes.player.count || 0 ;
        setInitialPlayer(fetchedPlayers);
        setPassCount(passCount)

        if(passCount == 0){
          setInfoLoading(false)
        }
      })
      .catch((error) => {
        console.error("Error fetching level info:", error);
      });
  }, [id]);

  useEffect(() => {
    if (player.length > 0) {
      const maxSpeedIndex = (() => {
        const speeds = player.map(p => p.speed);
        const minSpeed = Math.min(...speeds);
        const maxSpeed = Math.max(...speeds);
      
        if (minSpeed === maxSpeed) {
          return 999; 
        } else {
          return player.reduce((maxIdx, curr, idx, arr) =>
            curr.speed > arr[maxIdx].speed ? idx : maxIdx, 0
          );
        }
      })();
    const maxScoreIndex = player.reduce((maxIndex, player, index, array) =>
      player.scoreV2 > array[maxIndex].scoreV2 ? index : maxIndex, 0);
    
    const maxAccIndex = player.reduce((maxIndex, player, index, array) =>
      player.accuracy > array[maxIndex].accuracy ? index : maxIndex, 0);

      const maxDateIndex = player.reduce((earliestIdx, curr, idx, arr) => {
        const currDate = new Date(curr.vidUploadTime).getTime();
        const earliestDate = new Date(arr[earliestIdx].vidUploadTime).getTime();
        return currDate < earliestDate ? idx : earliestIdx;
      }, 0);


      setHighSpeed(maxSpeedIndex);
      setHighAcc(maxAccIndex);
      setHighScore(maxScoreIndex);
      setHighDate(maxDateIndex)
    } else {
      setHighSpeed(null);
      setHighAcc(null);
      setHighScore(null);
      setHighDate(null)
    }
    //console.log(player)
    //setInfoLoading(false)
    //console.log(res)

  }, [player]);



  useEffect(() => {
    const enrichPlayers = async () => {
      try {
        const playerNames = initialPlayer.map(p => p.player);
        const fetchedPlayersInfo = await fetchPassPlayerInfo(playerNames); 
        console.log(fetchedPlayersInfo)

        
        const enrichedPlayers = initialPlayer
        .map(player => {
          const additionalInfo = fetchedPlayersInfo.find(info => info.name === player.player);
          
          if (additionalInfo && !additionalInfo.isBanned) {
            return {
              ...player,
              country: additionalInfo.country,
            };
          }
          return null; 
        })
        .filter(player => player !== null);
  
  
      setPlayer(enrichedPlayers);
     
      } catch (error) {
        console.error('Failed to fetch or update player info:', error);
      }finally{
        setInfoLoading(false);
      }
  

    };
  
    if (initialPlayer.length > 0 && passCount) {
      enrichPlayers();
    }
  }, [initialPlayer, passCount]);

  useEffect(() => {

    const sortedPlayers = sortLeaderboard(player); 
    setDisplayedPlayers(sortedPlayers);
    //console.log(sortedPlayers) 
    //console.log(player)
  }, [player, leaderboardSort]);



  function handleSort(sort){
    setLeaderboardSort(sort)
  }

  const sortByVidUploadTime = (players) => {
    return [...players].sort((a, b) => new Date(a.vidUploadTime) - new Date(b.vidUploadTime));
  };
  
  const sortByScoreV2 = (players) => {
    return [...players].sort((a, b) => b.scoreV2 - a.scoreV2);
  };
  
  const sortByAccuracy = (players) => {
    return [...players].sort((a, b) => b.accuracy - a.accuracy);
  };

  const sortLeaderboard = (players) => {
    switch (leaderboardSort) {
      case 'TIME':
        return sortByVidUploadTime(players);
      case 'ACC':
        return sortByAccuracy(players);
      case 'SCR':
        return sortByScoreV2(players);
      default:
        return players;
    }
  };

  function changeDialogState(){
    setOpenDialog(!openDialog)
  }

  useEffect(()=>{
    console.log(res)
    console.log(passCount)
  }, [res, passCount])

  function formatString(input) {
    const regex = / & | but /g;
    const parts = input.split(regex);
    const formattedParts = parts.map(part => `${part}`);
    return formattedParts.join(" - ");
  }

  function formatDiff(value) {
    const valueStr = String(value);
      if (valueStr.endsWith('.05')) {
      return valueStr.slice(0, -3) + '+';
    } else {
      return valueStr;
    }
  }


//if (!res || player.length === 0 || highSpeed === null || highAcc === null || highScore === null || displayedPlayers.length === 0)
 if (res == null)
    return (
      <div
        style={{ height: "100vh", width: "100vw", backgroundColor: "#090909" }}
      >
        <div className="background-level"></div>
        <div className="loader loader-level-detail"></div>
      </div>
    );

  return (
  <>
    <div className="close-outer close-outer-levels" style={{ 
      display: openDialog ? 'block' : 'none'}} onClick={changeDialogState}></div>
      
      <div className={`levels-dialog ${openDialog ? 'dialog-scale-up' : ''}`} style={{ display: openDialog ? 'block' : 'none' }}>
        <div className="dialog">

          <div className="header" style={{
              backgroundImage: `url(${res && res.level ? getYouTubeThumbnailUrl(res.level.vidLink, res.level.song): "defaultImageURL"})`, backgroundPosition : "center"}}>
            <h2>{res.level.song}</h2>
            <p> <b>{t("detailPage.dialog.artist")} :</b> {res.level.artist}</p>
            
            <p>
              <b>{t(res.level.team ? "detailPage.dialog.team" : "detailPage.dialog.creator")} :</b>
              {formatString(res.level.team ? res.level.team : res.level.creator)}
            </p>


            <p> <b>{t("detailPage.dialog.id")} :</b> #{res.level.id}</p>

          </div>

          <div className="body">
            
            <div className="diff">
              
              <div className="each-diff">
                <h3>PGU</h3>
                <p>{formatDiff(res.level.pguDiff)}</p>
              </div>


              <div className="each-diff">
                <h3>Legacy</h3>
                <p>{formatDiff(res.level.diff)}</p>
              </div>

              <div className="each-diff">
                <h3>PDN</h3>
                <p>{formatDiff(res.level.pdnDiff)}</p>
              </div>
            
            </div>

            <div className="team-info">

              {res.level.team && (
                <div className="each-info">
                  <h3>{t("detailPage.dialog.team")}</h3>
                  <p>{formatString(res.level.team)}</p>
                </div>
                )}

              {res.level.charter && (
                <div className="each-info">
                  <h3>{t("detailPage.dialog.charter")}</h3>
                  <p>{formatString(res.level.charter)}</p>
                </div>
                )}
                
                {res.level.vfxer && (
                <div className="each-info">
                  <h3>{t("detailPage.dialog.vfxer")}</h3>
                  <p>{formatString(res.level.vfxer)}</p>
                </div>
                )}

             </div> 

              <div className="links">

                {res.level.dlLink && (
                  <a href={res.level.dlLink} target="_blank">
                    <svg className="svg-stroke" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}

                {res.level.workshopLink && (
                  <a href={res.level.workshopLink} target="_blank">
                    <svg className="svg-fill" fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" >
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M 22 6 C 18.745659 6 16.09469 8.6041857 16.007812 11.837891 L 12.337891 17.083984 C 12.065931 17.032464 11.786701 17 11.5 17 C 10.551677 17 9.673638 17.297769 8.9472656 17.800781 L 4 15.84375 L 4 21.220703 L 7.1054688 22.449219 C 7.5429388 24.475474 9.3449541 26 11.5 26 C 13.703628 26 15.534282 24.405137 15.917969 22.310547 L 21.691406 17.984375 C 21.794183 17.989633 21.895937 18 22 18 C 25.309 18 28 15.309 28 12 C 28 8.691 25.309 6 22 6 z M 22 8 C 24.206 8 26 9.794 26 12 C 26 14.206 24.206 16 22 16 C 19.794 16 18 14.206 18 12 C 18 9.794 19.794 8 22 8 z M 22 9 A 3 3 0 0 0 22 15 A 3 3 0 0 0 22 9 z M 11.5 18 C 13.43 18 15 19.57 15 21.5 C 15 23.43 13.43 25 11.5 25 C 10.078718 25 8.8581368 24.145398 8.3105469 22.925781 L 10.580078 23.824219 C 10.882078 23.944219 11.192047 24.001953 11.498047 24.001953 C 12.494047 24.001953 13.436219 23.403875 13.824219 22.421875 C 14.333219 21.137875 13.703922 19.683781 12.419922 19.175781 L 10.142578 18.273438 C 10.560118 18.097145 11.019013 18 11.5 18 z"></path>
                      </g>
                    </svg>
                  </a>
                )}

                {res.level.vidLink && (
                  <a className="svg-fill" href={res.level.vidLink} target="_blank">
                    <svg viewBox="0 -3 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>youtube [#168]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -7442.000000)" fill="#ffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M251.988432,7291.58588 L251.988432,7285.97425 C253.980638,7286.91168 255.523602,7287.8172 257.348463,7288.79353 C255.843351,7289.62824 253.980638,7290.56468 251.988432,7291.58588 M263.090998,7283.18289 C262.747343,7282.73013 262.161634,7282.37809 261.538073,7282.26141 C259.705243,7281.91336 248.270974,7281.91237 246.439141,7282.26141 C245.939097,7282.35515 245.493839,7282.58153 245.111335,7282.93357 C243.49964,7284.42947 244.004664,7292.45151 244.393145,7293.75096 C244.556505,7294.31342 244.767679,7294.71931 245.033639,7294.98558 C245.376298,7295.33761 245.845463,7295.57995 246.384355,7295.68865 C247.893451,7296.0008 255.668037,7296.17532 261.506198,7295.73552 C262.044094,7295.64178 262.520231,7295.39147 262.895762,7295.02447 C264.385932,7293.53455 264.28433,7285.06174 263.090998,7283.18289" id="youtube-[#168]"> </path> </g> </g> </g> </g></svg>
                  </a>
                )}
              </div>

          </div>
          
      </div>
    </div>

    <div className="level-detail">
      <CompleteNav />
      <div className="background-level"></div>

      <div className="wrapper-level wrapper-level-top">
        <div className="header">

          <div className="left"
            style={{
              backgroundImage: `url(${res && res.level ? getYouTubeThumbnailUrl(res.level.vidLink, res.level.song): "defaultImageURL"})`}}>

            <div className="diff">
              <img src={getLevelImage(res.level.pdnDiff, res.level.pguDiff)} alt="" />
            </div>

            <div className="title">
              <h1>{res.level.song}</h1>
              <p>
                #{id}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                {res.level.team ? res.level.team : res.level.creator}
                &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;{res.level.artist}
              </p>
            </div>
          </div>

          <div className="right">
            {res.level.dlLink && (
              <a className="svg-stroke" href={res.level.dlLink} target="_blank">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}

            {res.level.workshopLink && (
              <a href={res.level.workshopLink} target="_blank">
                <svg className="svg-fill" fill="#ffffff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M 22 6 C 18.745659 6 16.09469 8.6041857 16.007812 11.837891 L 12.337891 17.083984 C 12.065931 17.032464 11.786701 17 11.5 17 C 10.551677 17 9.673638 17.297769 8.9472656 17.800781 L 4 15.84375 L 4 21.220703 L 7.1054688 22.449219 C 7.5429388 24.475474 9.3449541 26 11.5 26 C 13.703628 26 15.534282 24.405137 15.917969 22.310547 L 21.691406 17.984375 C 21.794183 17.989633 21.895937 18 22 18 C 25.309 18 28 15.309 28 12 C 28 8.691 25.309 6 22 6 z M 22 8 C 24.206 8 26 9.794 26 12 C 26 14.206 24.206 16 22 16 C 19.794 16 18 14.206 18 12 C 18 9.794 19.794 8 22 8 z M 22 9 A 3 3 0 0 0 22 15 A 3 3 0 0 0 22 9 z M 11.5 18 C 13.43 18 15 19.57 15 21.5 C 15 23.43 13.43 25 11.5 25 C 10.078718 25 8.8581368 24.145398 8.3105469 22.925781 L 10.580078 23.824219 C 10.882078 23.944219 11.192047 24.001953 11.498047 24.001953 C 12.494047 24.001953 13.436219 23.403875 13.824219 22.421875 C 14.333219 21.137875 13.703922 19.683781 12.419922 19.175781 L 10.142578 18.273438 C 10.560118 18.097145 11.019013 18 11.5 18 z"></path>
                  </g>
                </svg>
              </a>
            )} 

            {!res.level.workshopLink && !res.level.dlLink &&(
              <svg className="svg-fill" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#ffffff" fillRule="evenodd" d="M5.781 4.414a7 7 0 019.62 10.039l-9.62-10.04zm-1.408 1.42a7 7 0 009.549 9.964L4.373 5.836zM10 1a9 9 0 100 18 9 9 0 000-18z"></path> </g></svg>
            )}
          </div>
        </div>

        <div className="body">
          <div className="info">

            <div className="info-item">
              <p>
                {/* <span className="one">#1</span> Clear */}
                {t("detailPage.#1Clears.clear")}
              </p>
              <span className="info-desc">
              {!infoLoading ? 
                (player && player[highDate] ? `${player[highDate].player} | ${player[highDate].vidUploadTime.slice(0, 10)}` : "-")
                : t("detailPage.waiting")}
              </span>
            </div>

            <div className="info-item">
              <p>
                {/* <span className="one">#1</span> Score */}
                {t("detailPage.#1Clears.score")}
              </p>
              <span className="info-desc">
              {!infoLoading ? 
                (player && player[highScore] ? `${player[highScore].player} | ${player[highScore].scoreV2.toFixed(2)}` : "-")
                : t("detailPage.waiting")}
              </span>
            </div>

            <div className="info-item">
              <p>
                {t("detailPage.#1Clears.speed")}
              </p>
              <span className="info-desc">
              {!infoLoading ? 
                (player && highSpeed !== 999 && player[highSpeed] ? `${player[highSpeed].player} | ${player[highSpeed].speed || 1}×` 
                : highSpeed === 999 ? "-" : "-")
                : t("detailPage.waiting")}
              </span>
            </div>

            <div className="info-item">
              <p>
                {/* <span className="one">#1</span> Accuracy */}
                {t("detailPage.#1Clears.accuracy")}

                
              </p>
              <span className="info-desc">
              {!infoLoading ? 
                (player && player[highAcc] ? `${player[highAcc].player} | ${(player[highAcc].accuracy * 100).toFixed(2)}%` : "-")
                : t("detailPage.waiting")}
              </span>
            </div>

            <div className="info-item">
              <p>{t("detailPage.#1Clears.numOClear")}</p>
              <span className="info-desc">
                {!infoLoading ? (player ? player.length : "0") : t("detailPage.waiting")}
              </span>
            </div>

            <button onClick={changeDialogState}>{t("detailPage.dialog.fullInfo")}</button>
          </div>

          <div className="youtube">
            {getYouTubeEmbedUrl(res.level.vidLink) ? 
              <iframe
              src={getYouTubeEmbedUrl(res.level.vidLink)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          :
            <img src={getYouTubeThumbnailUrl(res.level.vidLink, res.level.song)} alt="" />
          }
          </div>
        </div>

        <div className="rank">
          <h1>{t("detailPage.leaderboard.header")}</h1>
          {player && player.length > 0 ? (
            <div className="sort">
                <Tooltip id="tm" place="top" noArrow>
                {t("detailPage.leaderboard.toolTip.time")}
                </Tooltip>
                <Tooltip id="ac" place="top" noArrow>
                {t("detailPage.leaderboard.toolTip.accuracy")}
                </Tooltip>
                <Tooltip id="sc" place="top" noArrow>
                {t("detailPage.leaderboard.toolTip.score")}
                </Tooltip>

              <svg className="svg-stroke" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              data-tooltip-id = "tm"
              value="TIME" 
              onClick={() => handleSort("TIME")} 
              style={{
                backgroundColor:
                  leaderboardSort == "TIME" ? "rgba(255, 255, 255, 0.7)" : "",
              }}>
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M3 9H21M7 3V5M17 3V5M6 12H8M11 12H13M16 12H18M6 15H8M11 15H13M16 15H18M6 18H8M11 18H13M16 18H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" ></path>
                </g>
              </svg>

              <svg  className="svg-fill" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                backgroundColor:
                  leaderboardSort == "ACC" ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              data-tooltip-id = "ac"
              value="ACC"
              onClick={() => handleSort("ACC")} >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" ></g>
                <g id="SVGRepo_iconCarrier">

                  <path d="M21.4143 3.29285C21.8048 3.68337 21.8048 4.31653 21.4143 4.70706L4.70718 21.4142C4.31666 21.8047 3.68349 21.8047 3.29297 21.4142L2.58586 20.7071C2.19534 20.3165 2.19534 19.6834 2.58586 19.2928L19.293 2.58574C19.6835 2.19522 20.3167 2.19522 20.7072 2.58574L21.4143 3.29285Z" fill="#ffffff" ></path>
                  <path d="M7.50009 2.99997C5.5671 2.99997 4.00009 4.56697 4.00009 6.49997C4.00009 8.43297 5.5671 9.99997 7.50009 9.99997C9.43309 9.99997 11.0001 8.43297 11.0001 6.49997C11.0001 4.56697 9.43309 2.99997 7.50009 2.99997Z" fill="#ffffff" ></path>
                  <path d="M16.5001 14C14.5671 14 13.0001 15.567 13.0001 17.5C13.0001 19.433 14.5671 21 16.5001 21C18.4331 21 20.0001 19.433 20.0001 17.5C20.0001 15.567 18.4331 14 16.5001 14Z" fill="#ffffff" ></path>
                </g>
              </svg>

              <svg className="svg-fill"  viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                backgroundColor:
                  leaderboardSort == "SCR" ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              data-tooltip-id = "sc"
              value="SCR"
              onClick={() => handleSort("SCR")}
                >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" ></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" fill="#ffffff"></path>
                </g>
              </svg>
            </div>
          ) : <></>}
          <div className="rank-list">
            {!infoLoading ? 
            

            displayedPlayers && displayedPlayers.length > 0 ? (
              displayedPlayers.map((each, index) => (
                <div className="list-detail" key={index} >
                  <p className="name">

                    <span className="index" style={{ color:index === 0 ? "gold" : index === 1? "silver": index === 2? "brown": "inherit"}} >
                      <b>#{index + 1}</b>
                    </span>

                    &nbsp;
                    <img src={isoToEmoji(each.country)} alt=""/>
                    &nbsp;
                    {each.player}
                  </p>
                  <div className="time">{each.vidUploadTime.slice(0, 10)}</div>
                  <p className="general">{each.scoreV2.toFixed(2)}</p>
                  <p className="acc">{(each.accuracy * 100).toFixed(2)}%</p>
                  <div className="speed">{each.speed ? each.speed : "1.0"}×</div>
                  <p className="judgements" onClick={() => window.open(each.vidLink, '_blank')}>
                    <span style={{ color: "red" }}>{each.judgements[0]}</span>
                    &nbsp;
                    <span style={{ color: "orange" }}>
                      {each.judgements[1]}
                    </span>
                    &nbsp;
                    <span style={{ color: "yellow" }}>
                      {each.judgements[2]}
                    </span>
                    &nbsp;
                    <span style={{ color: "lightGreen" }}>
                      {each.judgements[3]}
                    </span>
                    &nbsp;
                    <span style={{ color: "yellow" }}>
                      {each.judgements[4]}
                    </span>
                    &nbsp;
                    <span style={{ color: "orange" }}>
                      {each.judgements[5]}
                    </span>
                    &nbsp;
                    <span style={{ color: "red" }}>{each.judgements[6]}</span>
                  </p>
                </div>
              ))
            ) : (
              <h1>{t("detailPage.leaderboard.notBeaten")}</h1>
            )

            :

            <div className="loader loader-level-detail-rank"></div>

          }
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export default LevelDetailPage;
