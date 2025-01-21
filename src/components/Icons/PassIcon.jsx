import React from 'react';

export const PassIcon = ({ color="#fff", size=24, ...props }) => {
  return (
    <svg {...props} width={size} height={size} version="1.1" id="Uploaded to svgrepo.com" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-3.2 -3.2 38.40 38.40" xmlSpace="preserve" fill={color} stroke={color} strokeWidth="0.8320000000000001"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M30.745,20.386L25,13l3.375-7.594C28.669,4.745,28.185,4,27.461,4H17.5l-0.361-2.164 C17.059,1.353,16.642,1,16.153,1H2.014L1.986,0.835c-0.09-0.544-0.604-0.914-1.15-0.822C0.347,0.095,0.02,0.521,0.019,1H0 l0.016,0.096C0.018,1.119,0.01,1.141,0.014,1.165l5,30C5.095,31.653,5.519,32,5.999,32c0.055,0,0.109-0.004,0.165-0.014 c0.545-0.091,0.913-0.606,0.822-1.151L5.014,19H14.5l0.361,2.164C14.941,21.647,15.358,22,15.847,22h14.108 C30.788,22,31.256,21.043,30.745,20.386z M15.306,3l2.342,14H4.694L2.361,3H15.306z M16.633,19.384L16.361,18h1.253L16.633,19.384z M17.436,20l1.391-1.983L16.827,6h9.095l-3.237,7.282L27.911,20C27.911,20,17.472,20.004,17.436,20z"></path> </g></svg>
  );
};

