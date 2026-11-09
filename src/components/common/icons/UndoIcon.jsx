// tuf-search: #UndoIcon #undoIcon #icons
import React from 'react';

export const UndoIcon = ({ color = "currentColor", size = "18px", ...props }) => {
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
        d="M7 13L3 9M3 9L7 5M3 9H16C18.7614 9 21 11.2386 21 14C21 16.7614 18.7614 19 16 19H11"
        stroke={color || "#fff"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
