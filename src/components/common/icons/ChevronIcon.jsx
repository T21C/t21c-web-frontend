import React from 'react';

const ChevronIcon = ({ className = "", color = "currentColor", size = 16, direction = "right", ...props }) => {
  const rotation = {
    right: "0deg",
    down: "90deg",
    left: "180deg",
    up: "270deg"
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: `rotate(${rotation[direction]})`, transition: 'transform 0.2s ease' }}
      {...props}
    >
      <path
        d="M6 4L10 8L6 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default ChevronIcon;
