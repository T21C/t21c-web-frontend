import React from 'react';

export const UploadIcon = ({ color, size, strokeWidth = 1.5, ...props }) => {
  return (
    <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"></path> <path d="M12 16V3M12 3L16 7.375M12 3L8 7.375" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
  );
};

