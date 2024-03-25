/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext, useEffect, useState } from "react";
import { CompleteNav, LevelCard} from "../components";
import { UserContext } from "../context/UserContext";
import { fetchData } from "../Repository/RemoteRepository";

const LevelsPage = () => {
  const {levelData, setLevelData} = useContext(UserContext)

  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedCleared, setSelectedCleared] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setSelectedDifficulty(event.target.value);
  };

  const handleClearedClick = (value) => {
    setSelectedCleared(selectedCleared === value ? "" : value);
    setLevelData([])
  };

  const handleSortClick = (value) => {
    if (selectedSort === value) {
      setSelectedSort("");
      setSelectedDirection(""); 
    } else {
      setSelectedSort(value);
      if(selectedDirection === ""){
        setSelectedDirection("ASC"); 
      }
    }
    setLevelData([])
  };
  
  const handleDirectionClick = (value) => {
    if (selectedSort === "") {
      return;
    }
    setSelectedDirection(value);
    setLevelData([])
  };

  useEffect(()=>{
    setLevelData([])
    fetchData({
      offset: levelData.length,
      diff: selectedDifficulty,
      cleared: selectedCleared,
      sort: selectedSort,
      direction: selectedDirection,
    }).then(res => setLevelData(res))
  }, [selectedCleared, selectedDifficulty, selectedDirection, selectedSort, setLevelData])

  useEffect(() => {
    const handleScroll = () => {
      const buffer = 100;
      const reachedBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - buffer;
      if (reachedBottom && !loading) {
        setLoading(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading]);

  useEffect(()=>{
    if(!loading) return;
    fetchData({
      offset: levelData.length,
      diff: selectedDifficulty,
      cleared: selectedCleared,
      sort: selectedSort,
      direction: selectedDirection,
    }).then(res => setLevelData(prev =>[...prev, ...res])).then(setLoading(false))
  }, [loading])
  
  

  return (
    <div className="level-page">
      <CompleteNav />

      <div className="background-level"></div>

      <div className="wrapper-level wrapper-level-top">
        <input type="text" placeholder="Search" />
      </div>

      <div className="wrapper-level">
        <div className="wrapper-inner">
          <div className="filter">
            <p>Filter :</p>
            <div className="dropdown">
              <p>Difficulty</p>
              <select value={selectedDifficulty} onChange={handleChange}>
                <option value="">-</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            <div className="select-group">
              <div
                className={`button-radio ${
                  selectedCleared === "cleared" ? "button-radio-active" : ""
                }`}
                onClick={() => handleClearedClick("cleared")}
              >
                Cleared
              </div>
              <div
                className={`button-radio ${
                  selectedCleared === "uncleared" ? "button-radio-active" : ""
                }`}
                onClick={() => handleClearedClick("uncleared")}
              >
                Uncleared
              </div>
            </div>
          </div>

          <div className="spacer-left-right"></div>

          <div className="sort">
            <p>Sort :</p>

            <div className="select-group" style={{ margin: "1rem 0" }}>
              <div
                className={`button-radio ${
                  selectedSort === "RECENT" ? "button-radio-active" : ""
                }`}
                onClick={() => handleSortClick("RECENT")}
              >
                Id
              </div>
              <div
                className={`button-radio ${
                  selectedSort === "DIFF" ? "button-radio-active" : ""
                }`}
                onClick={() => handleSortClick("DIFF")}
              >
                Difficulty
              </div>
            </div>

            <div className="select-group">
              <div
                className={`button-radio ${
                  selectedDirection === "ASC" ? "button-radio-active" : ""
                }`}
                onClick={() => handleDirectionClick("ADC")}
              >
                Ascending
              </div>
              <div
                className={`button-radio ${
                  selectedDirection === "DESC" ? "button-radio-active" : ""
                }`}
                onClick={() => handleDirectionClick("DESC")}
              >
                Descending
              </div>
              {/* <div
                className={`button-radio ${
                  selectedDirection === "--" ? "button-radio-active" : ""
                }`}
                onClick={() => handleDirectionClick("")}
              >
                --
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-container wrapper-level">
        <div className="grid-header">Song</div>
        <div className="grid-header">Artist</div>
        <div className="grid-header">Creators</div>
        <div className="grid-header">Diff</div>
        {/* <div className="grid-header">Clears</div> */}
        <div className="grid-header">Links</div>

        {levelData.length !== 0 ? (
          levelData.map((element, index) => (
            <LevelCard key={index} object={element} />
          ))
        ) : (
          <></>
        )}
      </div>

      {loading ? <></> : <p>Loading More . . . </p>}
    </div>
  );
};


export default LevelsPage; 
