// tuf-search: #DouyinIcon #douyinIcon #icons
import React from 'react';

const DouyinIcon = ({ className = '', size = '1em', color = 'currentColor', ...props }) => {
  return (
    <svg
      {...props}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
    >
      <path d="M14.2 3v1.72c1.62.42 3.05 1.3 4.05 2.46h-2.12A6.86 6.86 0 0 1 14.2 6.1V13.4a4.4 4.4 0 1 1-2.2-3.82V7.38c.72-.08 1.45-.06 2.16.08V3h.04zM9.9 16.6a2.2 2.2 0 1 0 2.2-2.2 2.2 2.2 0 0 0-2.2 2.2z" />
    </svg>
  );
};

export default DouyinIcon;
