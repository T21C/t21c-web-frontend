import React from 'react';

export const DragHandleIcon = ({ color = "#fff", size = "24px", className = "", ...props }) => {
  return (
    <svg {...props} className={className} width={size} height={size} viewBox="0 1 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
   
    <path d="M8 6H6V8H8V6Z" fill={color || "#fff"}/>
    <path d="M8 10H6V12H8V10Z" fill={color || "#fff"}/>
    <path d="M8 14H6V16H8V14Z" fill={color || "#fff"}/>
    <path d="M8 18H6V20H8V18Z" fill={color || "#fff"}/>
    <path d="M14 6H12V8H14V6Z" fill={color || "#fff"}/>
    <path d="M14 10H12V12H14V10Z" fill={color || "#fff"}/>
    <path d="M14 14H12V16H14V14Z" fill={color || "#fff"}/>
    <path d="M14 18H12V20H14V18Z" fill={color || "#fff"}/>
    </svg>
  );
};
