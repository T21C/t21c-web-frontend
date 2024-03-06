/* eslint-disable react/prop-types */
import { useState } from "react";
  const LevelCard = ({ object }) => {
    const [imagePh] = useState([
      "src/assets/level-asset/1.png",
      "src/assets/level-asset/2.png",
      "src/assets/level-asset/3.png",
      "src/assets/level-asset/4.png",
      "src/assets/level-asset/5.png",
      "src/assets/level-asset/6.png",
      "src/assets/level-asset/7.png",
      "src/assets/level-asset/8.png",
      "src/assets/level-asset/9.png"
    ]);

    const stringToIndex = (str) => {
        let index = 0;
      
        for (let i = 0; i < str.length; i++) {
          index += str.charCodeAt(i);
        }
      
        return index % 9; // Ensure the index is within the range of your imagePh array
      };
  
    const imageIndex = stringToIndex(object.artist+object.song+object.creator);
  
    return (
      <div className="grid-content-long"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${imagePh[imageIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="content">{object.song}</div>
        <div className="content">{object.artist}</div>
        <div className="content">{object.creator}</div>
        <div className="content">{object.diff}</div>
        <div className="content">no info</div>
        <div className="content">not complete</div>
      </div>
    );
  }
  
  export default LevelCard;
  