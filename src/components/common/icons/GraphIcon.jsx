// tuf-search: #GraphIcon #graphIcon #icons
import React from 'react';

const GraphIcon = ({ size = "24px", color = "#fff", className = "", ...props }) => {
    return (
<svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill={color} d="M1163.46,251.089l-7.75,4.592h0a0.981,0.981,0,0,1-.56.263,0.859,0.859,0,0,1-.88-0.281l-4.27-4.228-4.28,4.246a1.018,1.018,0,0,1-1.43,0h0a1,1,0,0,1,0-1.414l4.99-4.95a1.031,1.031,0,0,1,1.44,0l4.33,4.293,7.53-4.467a0.917,0.917,0,0,1,1.33.444h0A1.207,1.207,0,0,1,1163.46,251.089ZM1163,262a1,1,0,0,1,0,2h-22a1,1,0,0,1-1-1V241a1,1,0,0,1,2,0v21h21Z" transform="translate(-1140 -240)"/>
</svg>
);
}
export default GraphIcon;