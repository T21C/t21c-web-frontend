// tuf-search: #BellIcon #bellIcon #icons
import React from 'react';

export const BellIcon = ({ color = 'currentColor', size = 24, className = '', ...props }) => {
  return (
    <svg
      {...props}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 17H9c-2.2 0-3.3 0-3.76-.44C4.5 15.8 5.2 13.7 6.6 9.5 7.4 7.1 8.6 6 12 6s4.6 1.1 5.4 3.5c1.4 4.2 2.1 6.3 1.36 7.06C18.3 17 17.2 17 15 17Z" />
      <path d="M10 17a2 2 0 1 0 4 0" />
      <path d="M12 6V4" />
    </svg>
  );
};

export default BellIcon;
