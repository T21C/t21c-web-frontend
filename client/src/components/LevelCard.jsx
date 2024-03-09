/* eslint-disable react/prop-types */
import { useState } from "react";
  const LevelCard = ({ object }) => {
    const [imagePh] = useState([
      "src/assets/level-asset/1.png"
    ]);

    const stringToIndex = (str) => {
        let index = 0;
      
        for (let i = 0; i < str.length; i++) {
          index += str.charCodeAt(i);
        }
      
        return index % 1; // Ensure the index is within the range of your imagePh array
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

        <div className="content content-download">

        <a href={object.workshopLink} target="_blank">


        <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800"
      height="800"
      fill="none"
      viewBox="0 0 192 192"
    >
      <g
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6.1"
        transform="matrix(1.9641 0 0 1.96342 19.541 5.281)"
      >
        <path d="M.154 41.29l23.71 9.803a12.444 12.444 0 017.745-2.158l10.544-15.283-.001-.216c0-9.199 7.483-16.683 16.683-16.683 9.199 0 16.682 7.484 16.682 16.683S68.034 50.12 58.835 50.12c-.127 0-.253-.003-.379-.006l-15.038 10.73c.008.195.015.394.015.592 0 6.906-5.617 12.522-12.522 12.522-6.061 0-11.129-4.326-12.277-10.055l-16.956-7.01"></path>
        <ellipse
          cx="58.576"
          cy="33.435"
          stroke="none"
          strokeMiterlimit="5"
          rx="9.916"
          ry="9.922"
        ></ellipse>
        <ellipse
          cx="31.079"
          cy="61.436"
          stroke="none"
          strokeMiterlimit="5"
          rx="7.437"
          ry="7.441"
        ></ellipse>
      </g>
    </svg>
        </a>

        <a href={object.dlLink} target="_blank">


    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800"
      height="800"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M17 17h.01m.39-3h.6c.932 0 1.398 0 1.765.152a2 2 0 011.083 1.083C21 15.602 21 16.068 21 17c0 .932 0 1.398-.152 1.765a2 2 0 01-1.083 1.083C19.398 20 18.932 20 18 20H6c-.932 0-1.398 0-1.765-.152a2 2 0 01-1.083-1.083C3 18.398 3 17.932 3 17c0-.932 0-1.398.152-1.765a2 2 0 011.083-1.083C4.602 14 5.068 14 6 14h.6m5.4 1V4m0 11l-3-3m3 3l3-3"
      ></path>
    </svg>
        </a>
        </div>

      </div>
    );
  }
  
  export default LevelCard;
  