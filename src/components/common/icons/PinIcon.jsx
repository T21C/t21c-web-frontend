import React from 'react';

const PinIcon = ({ size = "16px", color = "currentColor", className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 17l5-5H7l5 5z" />
      <path d="M12 2v15" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
};

export default PinIcon;
