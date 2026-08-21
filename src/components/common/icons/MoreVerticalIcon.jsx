// tuf-search: #MoreVerticalIcon #moreVerticalIcon #icons
import React from 'react';

export const MoreVerticalIcon = ({ color = 'currentColor', size = 24, className = '', ...props }) => {
  return (
    <svg
      {...props}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.75" fill={color} />
      <circle cx="12" cy="12" r="1.75" fill={color} />
      <circle cx="12" cy="19" r="1.75" fill={color} />
    </svg>
  );
};

export default MoreVerticalIcon;
