// tuf-search: #ArrowIcon #arrowIcon #icons
import React from 'react';

export const ArrowIcon = ({ color = "#fff", headWidth = 0, stemWidth = 0, size = 24, direction = "down", ...props }) => {
  const rotation = {
    down: "0deg",
    up: "180deg",
    left: "270deg",
    right: "90deg"
  };
  console.log(rotation[direction]);
  return (
    <svg 
    {...props} 
    style={{ transform: `rotate(${rotation[direction]})` }}
    width={size} 
    height={size} 
    viewBox="0 0 500 500" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg">
    <path 
    d={`M 1473.651 ${348.097 - stemWidth} `+
       ` H 1783.383`+
       ` L 1783.383 ${289.667 - headWidth} `+
       ` L 1954.511 375.231`+
       ` L 1783.383 ${460.795 + headWidth} `+
       ` L 1783.383 ${402.366 + stemWidth} `+
       ` H ${1473.651}`+
       ` V ${348.097 + stemWidth} `+
       ` Z`} 
    fill={color}
    stroke={color}
    strokeWidth="1"
      transform="matrix(0, 1, -1, 0, 625.231027, -1464.080588)"
    />
  </svg>
  );
};
