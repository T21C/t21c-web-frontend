/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext, useEffect, useState } from "react";
import { CompleteNav, LevelCard, Navigation } from "../components";
import { UserContext } from "../context/UserContext";

const LevelsPage = () => {
  const [showLevel, setShowLevel] = useState([]);

  const [selectedValue, setSelectedValue] = useState("");
  const [selectedRadio, setSelectedRadio] = useState(null);
  const [selectedSort, setSelectedSort] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState(null);

  const handleChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const handleRadioClick = (value) => {
    setSelectedRadio(selectedRadio === value ? null : value);
  };

  const handleSortClick = (value) => {
    setSelectedSort(selectedSort === value ? null : value);
  };

  const handleDirectionClick = (value) => {
    setSelectedDirection(selectedDirection === value ? null : value);
  };

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
            <div className="filter-components dropdown">
              <p>Difficulty</p>
              <select value={selectedValue} onChange={handleChange}>
                <option value="">-</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            <div className="filter-components">
              <input
                type="radio"
                id="radio1"
                name="radioGroup"
                value="cleared"
                className="custom-radio-button"
                checked={selectedRadio === "cleared"}
                readOnly
              />
              <label
                htmlFor="radio1"
                className="custom-radio-label"
                onClick={() => handleRadioClick("cleared")}
              >
                <span className="radio-custom-design"></span>Cleared
              </label>
            </div>

            <div className="filter-components">
              <input
                type="radio"
                id="radio2"
                name="radioGroup"
                value="uncleared"
                className="custom-radio-button"
                checked={selectedRadio === "uncleared"}
                readOnly
              />
              <label
                htmlFor="radio2"
                className="custom-radio-label"
                onClick={() => handleRadioClick("uncleared")}
              >
                <span className="radio-custom-design"></span>Uncleared
              </label>
            </div>
          </div>

          <p>Sort :</p>
          <div className="sort">
            <div className="sort-left">
              <div className="top" style={{ display: "flex" }}>
                <div className="sort-components" style={{ display: "flex" }}>
                  <input
                    type="radio"
                    id="sortID"
                    name="sortGroup"
                    value="id"
                    className="custom-radio-button"
                    checked={selectedSort === "id"}
                    readOnly
                  />
                  <label
                    htmlFor="sortID"
                    className="custom-radio-label"
                    onClick={() => handleSortClick("id")}
                  >
                    <span className="radio-custom-design"></span>ID
                  </label>
                </div>

                <div className="sort-components" style={{ display: "flex" }}>
                  <input
                    type="radio"
                    id="sortDifficulty"
                    name="sortGroup"
                    value="difficulty"
                    className="custom-radio-button"
                    checked={selectedSort === "difficulty"}
                    readOnly
                  />
                  <label
                    htmlFor="sortDifficulty"
                    className="custom-radio-label"
                    onClick={() => handleSortClick("difficulty")}
                  >
                    <span className="radio-custom-design"></span>Difficulty
                  </label>
                </div>
              </div>

              <div className="bottom" style={{ display: "flex" }}>
                <div className="sort-components" style={{ display: "flex" }}>
                  <input
                    type="radio"
                    id="sortAscending"
                    name="directionGroup"
                    value="ascending"
                    className="custom-radio-button"
                    checked={selectedDirection === "ascending"}
                    readOnly
                  />
                  <label
                    htmlFor="sortAscending"
                    className="custom-radio-label"
                    onClick={() => handleDirectionClick("ascending")}
                  >
                    <span className="radio-custom-design"></span>Ascending
                  </label>
                </div>

                <div className="sort-components" style={{ display: "flex" }}>
                  <input
                    type="radio"
                    id="sortDescending"
                    name="directionGroup"
                    value="descending"
                    className="custom-radio-button"
                    checked={selectedDirection === "descending"}
                    readOnly
                  />
                  <label
                    htmlFor="sortDescending"
                    className="custom-radio-label"
                    onClick={() => handleDirectionClick("descending")}
                  >
                    <span className="radio-custom-design"></span>Descending
                  </label>
                </div>

                <div className="sort-components" style={{ display: "flex" }}>
                  <input
                    type="radio"
                    id="sortclearNumber"
                    name="directionGroup"
                    value="clearNumber"
                    className="custom-radio-button"
                    checked={selectedDirection === "clearNumber"}
                    readOnly
                  />
                  <label
                    htmlFor="sortclearNumber"
                    className="custom-radio-label"
                    onClick={() => handleDirectionClick("clearNumber")}
                  >
                    <span className="radio-custom-design"></span>Clear Number
                  </label>
                </div>
              </div>
            </div>
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

        {/* {levelData.length !== 0 ? (
          showLevel.map((element, index) => (
            <LevelCard key={index} object={element} />
          ))
        ) : (
          <></>
        )} */}
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
