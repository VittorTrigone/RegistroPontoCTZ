import React from 'react';

export const FaceMold = ({ scanning }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="xMidYMid meet" 
      className="absolute inset-0 w-full h-full z-20 pointer-events-none"
    >
      <path 
        d="M-500,-500 h1100 v1100 h-1100 Z M50,-15 a45,65 0 1,0 0,130 a45,65 0 1,0 0,-130 Z" 
        fill="rgba(2, 6, 23, 0.85)" 
        fillRule="evenodd" 
      />
      <ellipse 
        cx="50" 
        cy="50" 
        rx="45" 
        ry="65" 
        fill="none" 
        stroke={scanning ? "#0ea5e9" : "#334155"} 
        strokeWidth="1.5" 
        strokeDasharray={scanning ? "10 5" : "5 5"} 
        className={scanning ? "animate-pulse" : "animate-pulse-slow"}
      />
    </svg>
  );
};
