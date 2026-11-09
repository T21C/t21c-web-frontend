// tuf-search: #RedoIcon #redoIcon #icons
import React from 'react';

export const RedoIcon = ({ color = "currentColor", size = "18px", ...props }) => {
  return (
    <svg
      {...props}
      height={size}
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17 13L21 9M21 9L17 5M21 9H8C5.23858 9 3 11.2386 3 14C3 16.7614 5.23858 19 8 19H13"
        stroke={color || "#fff"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
