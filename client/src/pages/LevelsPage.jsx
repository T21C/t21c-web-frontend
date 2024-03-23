/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext, useEffect, useState } from "react";
import { CompleteNav, LevelCard, Navigation } from "../components";
import { UserContext } from "../context/UserContext";

const LevelsPage = () => {
  const { levelData, setLevelData } = useContext(UserContext);

  const [showLevel, setShowLevel] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (levelData.length == 0) {
        const res = await fetch("https://be.t21c.kro.kr/levels");
        if (!res.ok) {
          // Handle non-200 responses
          throw new Error(`API call failed with status code: ${res.status}`);
        }
        const data = await res.json();
        if (!data.results || !Array.isArray(data.results)) {
          // Handle unexpected data structure
          throw new Error("Unexpected API response structure");
        }
        setLevelData(data.results);
      }
    };

    fetchData();
  });


  return (
    <div className="level-page">
      <CompleteNav />

      <div className="wrapper-level">
        <input type="text" placeholder="Search" />
      </div>

      <div className="wrapper-level">
        <div className="wrapper-inner">
          <p>Filter :</p>
          <div className="filter">
            
          </div>

          <p>Sort :</p>
          <div className="sort">
            

          </div>
        </div>
      </div>

      <div className="grid-container wrapper-level">
        <div className="grid-header">Song</div>
        <div className="grid-header">Artist</div>
        <div className="grid-header">Creators</div>
        <div className="grid-header">Diff</div>
        <div className="grid-header">Clears</div>
        <div className="grid-header">Links</div>

        {levelData.length !== 0 ? (
          showLevel.map((element, index) => (
            <LevelCard key={index} object={element} />
          ))
        ) : (
          <></>
        )}
      </div>

      {/* <div className="mobile-grid-container wrapper-level">
            <h2>Song</h2>
            <p>COntent</p>
            <h2>Artist</h2>
            <p>COntent</p>
            <h2>creators</h2>
            <p>COntent</p>
            <h2>Diff</h2>
            <p>COntent</p>
            <h2>Clears</h2>
            <p>Clears</p>
            <h2>Links</h2>
            <p>COntent</p>
        </div> */}
    </div>
  );
};

export default LevelsPage;
