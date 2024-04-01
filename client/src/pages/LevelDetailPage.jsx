/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useEffect, useRef, useState } from "react";
import { CompleteNav } from "../components";
import {
  fetchLevelInfo,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "../Repository/RemoteRepository";
import {
  calculateAccuracy,
  calculatePP,
} from "../Repository/RemoteRepository/tc-21";

const LevelDetailPage = () => {
  const id = new URLSearchParams(window.location.search).get("id");
  const [res, setRes] = useState(null);
  const [player, setPlayer] = useState(null);
  const [highSpeed, setHighSpeed] = useState(null);
  const [highAcc, setHighAcc] = useState(null);
  const [highScore, setHighScore] = useState(null);

  useEffect(() => {
    fetchLevelInfo(id).then((res) => setRes(res));
  }, [id]);

  function changePlayer(res) {
    if (res && res.passes.results.length > 0) {
      const levelDetail = {
        baseScore: res.level.baseScore,
        isDesertBus: res.level.diff == 64,
      };
      const transformedResults = res.passes.results.map((each) => {
        const playerDetail = {
          acc: calculateAccuracy(each.judgements),
          tileCount: each.judgements.reduce((sum, cur) => sum + cur, 0),
          speed: each.speed ? each.speed : 1,
          misses: each.judgements[0],
        };

        return {
          id: each.id,
          player: each.player,
          judgements: each.judgements,
          speed: playerDetail.speed,
          time: each.vidUploadTime,
          vidLink: each.vidLink,
          vidTitlte: each.vidTitle,
          acc: playerDetail.acc,
          score: calculatePP(
            playerDetail.acc,
            playerDetail.speed,
            levelDetail.baseScore,
            levelDetail.isDesertBus,
            playerDetail.tileCount,
            playerDetail.misses
          ),
        };
      });

      return transformedResults;
    }
  }

  useEffect(() => {
    setPlayer(changePlayer(res));
  }, [res]);

  useEffect(() => {
    if (player && player.length > 0) {
      const maxSpeedIndex = player.reduce(
        (maxIdx, curr, idx, arr) =>
          curr.speed > arr[maxIdx].speed ? idx : maxIdx,
        0
      );
      const maxScoreIndex = player.reduce(
        (maxIdx, curr, idx, arr) =>
          curr.score > arr[maxIdx].score ? idx : maxIdx,
        0
      );
      const maxAccIndex = player.reduce(
        (maxIdx, curr, idx, arr) => (curr.acc > arr[maxIdx].acc ? idx : maxIdx),
        0
      );
      setHighSpeed(maxSpeedIndex);
      setHighAcc(maxAccIndex);
      setHighScore(maxScoreIndex);
    }
  }, [player]);

  changePlayer(res);

  function redirect() {
    window.history.go(-1);
  }

  if (res == null)
    return (
      <div style={{height:"100vh", width:"100vw", backgroundColor:"#090909"}}>
        <div className="background-level"></div>
        <div className="loader loader-level-detail"></div>
      </div>
    );

  return (
    <div className="level-detail">
      <CompleteNav />
      <div className="background-level"></div>

      <div className="wrapper-level wrapper-level-top">
        <button onClick={() => redirect()}>Back</button>
        <div className="header">
          <div
            className="left"
            style={{
              backgroundImage: `url(${
                res.level
                  ? getYouTubeThumbnailUrl(res.level.vidLink, res.level.title)
                  : "defaultImageURL"
              })`,
            }}
          >
            <div className="diff">
              <p>20</p>
            </div>

            <div className="title">
              <h1>{res.level.creator}</h1>
              <p>
                #{id}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;{res.level.song}
                &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;{res.level.artist}
              </p>
            </div>
          </div>

          <div className="right">
            {res.level.dlLink && (
              <a href={res.level.dlLink} target="_blank">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M17 17H17.01M17.4 14H18C18.9319 14 19.3978 14 19.7654 14.1522C20.2554 14.3552 20.6448 14.7446 20.8478 15.2346C21 15.6022 21 16.0681 21 17C21 17.9319 21 18.3978 20.8478 18.7654C20.6448 19.2554 20.2554 19.6448 19.7654 19.8478C19.3978 20 18.9319 20 18 20H6C5.06812 20 4.60218 20 4.23463 19.8478C3.74458 19.6448 3.35523 19.2554 3.15224 18.7654C3 18.3978 3 17.9319 3 17C3 16.0681 3 15.6022 3.15224 15.2346C3.35523 14.7446 3.74458 14.3552 4.23463 14.1522C4.60218 14 5.06812 14 6 14H6.6M12 15V4M12 15L9 12M12 15L15 12"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}

            {res.level.wsLink && (
              <a href={res.level.wsLink} target="_blank">
                <svg
                  fill="#ffffff"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M 22 6 C 18.745659 6 16.09469 8.6041857 16.007812 11.837891 L 12.337891 17.083984 C 12.065931 17.032464 11.786701 17 11.5 17 C 10.551677 17 9.673638 17.297769 8.9472656 17.800781 L 4 15.84375 L 4 21.220703 L 7.1054688 22.449219 C 7.5429388 24.475474 9.3449541 26 11.5 26 C 13.703628 26 15.534282 24.405137 15.917969 22.310547 L 21.691406 17.984375 C 21.794183 17.989633 21.895937 18 22 18 C 25.309 18 28 15.309 28 12 C 28 8.691 25.309 6 22 6 z M 22 8 C 24.206 8 26 9.794 26 12 C 26 14.206 24.206 16 22 16 C 19.794 16 18 14.206 18 12 C 18 9.794 19.794 8 22 8 z M 22 9 A 3 3 0 0 0 22 15 A 3 3 0 0 0 22 9 z M 11.5 18 C 13.43 18 15 19.57 15 21.5 C 15 23.43 13.43 25 11.5 25 C 10.078718 25 8.8581368 24.145398 8.3105469 22.925781 L 10.580078 23.824219 C 10.882078 23.944219 11.192047 24.001953 11.498047 24.001953 C 12.494047 24.001953 13.436219 23.403875 13.824219 22.421875 C 14.333219 21.137875 13.703922 19.683781 12.419922 19.175781 L 10.142578 18.273438 C 10.560118 18.097145 11.019013 18 11.5 18 z"></path>
                  </g>
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="body">
          <div className="info">
            <div className="info-item">
              <p> <span className="one">#1</span> Clear</p>
              <span className="info-desc">
                {player
                  ? `${player[0].player} | ${player[0].time.slice(0, 10)}`
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <p> <span className="one">#1</span> Score</p>
              <span className="info-desc">
                {highScore
                  ? `${player[highScore].player} | ${player[
                      highScore
                    ].score.toFixed(2)}`
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <p> <span className="one">#1</span> Speed</p>
              <span className="info-desc">
                {highSpeed
                  ? `${player[highSpeed].player} | ${player[highSpeed].speed}`
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <p> <span className="one">#1</span> Accuracy</p>
              <span className="info-desc">
                {highAcc
                  ? `${player[highAcc].player} | ${player[highAcc].acc.toFixed(
                      2
                    )}%`
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <p>Number Of Clears</p>
              <span className="info-desc">
                {res.passes.count ? res.passes.count : "0"}
              </span>
            </div>

            <button>Full Info</button>
          </div>

          <div className="youtube">
            <iframe
              src={getYouTubeEmbedUrl(res.level.vidLink)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div className="rank">
          <h1>Ranks</h1>

          <div className="rank-list">
            {player ? (
              player.map((each, index) => (
                <div className="list" key={index}>
                  <p className="name">{each.player}</p>
                  <p className="general">{each.score.toFixed(2)}</p>
                  <p className="acc">{each.acc.toFixed(2)}%</p>
                  <p className="judgements">
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
              <h1>This Level Has not Been Beaten Yet</h1>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelDetailPage;
