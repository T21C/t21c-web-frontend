// tuf-search: #TUFHelperLiteIcon #tufhelperliteIcon #icons
import React from 'react';

export const TUFHelperLiteIcon = ({ size = 24, className = '', ...props }) => {
  const id = React.useId().replace(/:/g, '');
  const bgId = `tufhelperlite-bg-${id}`;
  const redId = `tufhelperlite-red-${id}`;
  const blueId = `tufhelperlite-blue-${id}`;
  const softId = `tufhelperlite-soft-${id}`;

  return (
    <svg
      width={size || '100%'}
      height={size || '100%'}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#102b6f" />
          <stop offset="55%" stopColor="#071a48" />
          <stop offset="100%" stopColor="#020817" />
        </radialGradient>
        <radialGradient id={redId} cx="38%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#ffe37a" />
          <stop offset="48%" stopColor="#ff553d" />
          <stop offset="100%" stopColor="#b8152e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={blueId} cx="64%" cy="64%" r="62%">
          <stop offset="0%" stopColor="#82fff5" />
          <stop offset="45%" stopColor="#4a75ff" />
          <stop offset="100%" stopColor="#2a58ff" stopOpacity="0" />
        </radialGradient>
        <filter id={softId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.25" />
        </filter>
      </defs>

      <g className="tufhelperlite-icon__background tufhelperlite-icon__background--mono">
        <rect x="4" y="4" width="56" height="56" rx="14" fill={`url(#${bgId})`} />
        <g fill="#ffffff">
          <circle cx="15" cy="15" r="1" opacity="0.85" />
          <circle cx="25" cy="12" r="0.75" opacity="0.65" />
          <circle cx="39" cy="14" r="0.85" opacity="0.75" />
          <circle cx="50" cy="26" r="0.8" opacity="0.7" />
          <circle cx="13" cy="40" r="0.7" opacity="0.55" />
          <circle cx="32" cy="54" r="0.85" opacity="0.75" />
          <circle cx="50" cy="48" r="1" opacity="0.8" />
        </g>
        <rect x="4.75" y="4.75" width="54.5" height="54.5" rx="13.25" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.5" />
      </g>

      <g className="tufhelperlite-icon__background tufhelperlite-icon__background--color">
        <rect x="4" y="4" width="56" height="56" rx="14" fill={`url(#${bgId})`} />
        <g fill="#ffffff">
          <circle cx="15" cy="15" r="1" opacity="0.85" />
          <circle cx="25" cy="12" r="0.75" opacity="0.65" />
          <circle cx="39" cy="14" r="0.85" opacity="0.75" />
          <circle cx="50" cy="26" r="0.8" opacity="0.7" />
          <circle cx="13" cy="40" r="0.7" opacity="0.55" />
          <circle cx="32" cy="54" r="0.85" opacity="0.75" />
          <circle cx="50" cy="48" r="1" opacity="0.8" />
        </g>
        <rect x="4.75" y="4.75" width="54.5" height="54.5" rx="13.25" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.5" />
      </g>

      <g className="tufhelperlite-icon__foreground">
        <path
          d="M18 29C20.5 16.5 36.5 11 48 19"
          stroke="#ff463b"
          strokeWidth="8"
          strokeLinecap="round"
          filter={`url(#${softId})`}
        />
        <path
          d="M46 35C43.5 48 27.5 53 16 45"
          stroke="#3388ff"
          strokeWidth="8"
          strokeLinecap="round"
          filter={`url(#${softId})`}
        />
        <circle cx="20" cy="29" r="8.5" fill={`url(#${redId})`} />
        <circle cx="45" cy="35" r="8.5" fill={`url(#${blueId})`} />

        <path
          d="M21 44C26 47.5 34 48 40 44"
          stroke="#54b7ff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M43 20C38 16.5 30 16 24 20"
          stroke="#ff795e"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.65"
        />
      </g>
    </svg>
  );
};

export default TUFHelperLiteIcon;
