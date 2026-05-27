import React from 'react';

export const FaceMold = ({ scanning }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="xMidYMid meet" 
      className="absolute inset-0 w-full h-full z-20 pointer-events-none"
    >
      <path 
        d="M-500,-500 h1100 v1100 h-1100 Z M50,5 a32,45 0 1,0 0,90 a32,45 0 1,0 0,-90 Z" 
        fill="rgba(2, 6, 23, 0.85)" 
        fillRule="evenodd" 
      />
      <ellipse 
        cx="50" 
        cy="50" 
        rx="32" 
        ry="45" 
        fill="none" 
        stroke={scanning ? "#0ea5e9" : "#334155"} 
        strokeWidth="1.5" 
        strokeDasharray={scanning ? "10 5" : "5 5"} 
        className={scanning ? "animate-pulse" : "animate-pulse-slow"}
      />
    </svg>
  );
};
