// tuf-search: #AdofaiIcon #adofaiIcon #icons
import React from 'react';

export const AdofaiIcon = ({ color = "#fff", size = 24, rotation = -20, ...props }) => {
  return (
<svg style={{ transform: `rotate(${rotation}deg)` }} {...props} width={size} height={size} fill={color} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <path fill={color} stroke={color} strokeWidth="1" d="M 74.245 84.468 C 201.709 -47.526 424.259 7.962 474.839 184.346 C 481.083 206.113 484.128 227.712 484.332 248.759 L 369.656 250.279 C 370.037 103.57 212.682 8.885 82.797 79.53 C 79.907 81.104 77.053 82.752 74.245 84.468 Z"/>
  <ellipse fill={color} stroke={color} strokeWidth="1" transform-origin="217.606px 249.997px" cx="422.065" cy="249.469" rx="77.935" ry="77.935"/>
  <path fill={color} stroke={color} strokeWidth="1" transform-origin="250.001px 250px" d="M 73.797 84.467 C 201.262 -47.527 423.811 7.963 474.392 184.346 C 480.637 206.114 483.682 227.711 483.885 248.76 L 369.209 250.279 C 369.589 103.569 212.233 8.884 82.348 79.531 C 79.46 81.103 76.604 82.751 73.797 84.467 Z" transform="matrix(-1, 0, 0, -1, -0.000021, -0.000013)"/>
  <ellipse fill={color} stroke={color} strokeWidth="1" transform-origin="-282.401px -249.998px" cx="-77.935" cy="-250.55" rx="77.935" ry="77.935" transform="matrix(-1, 0, 0, -1, 564.801941, 499.995209)"/>
</svg>
)
}

export default AdofaiIcon;