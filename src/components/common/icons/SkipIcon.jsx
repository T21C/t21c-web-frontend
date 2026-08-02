// tuf-search: #SkipIcon #skipIcon #icons
import React from 'react';

const SkipIcon = ({ size = 24, color = 'currentColor', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20L15.3333 12L4 4V20Z" fill={color} />
      <path d="M20 4H17.3333V20H20V4Z" fill={color} />
    </svg>
  );
};

export default SkipIcon;
