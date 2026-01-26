import React from 'react';

export const ExternalLinkIcon = ({ color = "#fff", size = 24, className="", ...props }) => {
  return (
    <svg {...props} className={className} viewBox="0 0 24.00 24.00" width={size} height={size} xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color}><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5m-6 0 7.5-7.5M15 3h6v6"></path> </g></svg>
  
  );
};

