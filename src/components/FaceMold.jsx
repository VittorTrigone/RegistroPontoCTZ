import React from 'react';

export const FaceMold = ({ scanning }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none" 
      className="absolute inset-0 w-full h-full z-20 pointer-events-none"
    >
      <path 
        d="M0,0 h100 v100 h-100 Z M50,15 a38,32 0 1,0 0,70 a38,32 0 1,0 0,-70 Z" 
        fill="rgba(2, 6, 23, 0.85)" 
        fillRule="evenodd" 
      />
      <ellipse 
        cx="50" 
        cy="50" 
        rx="38" 
        ry="35" 
        fill="none" 
        stroke={scanning ? "#0ea5e9" : "#334155"} 
        strokeWidth="1.5" 
        strokeDasharray={scanning ? "10 5" : "5 5"} 
        className={scanning ? "animate-pulse" : "animate-pulse-slow"}
      />
    </svg>
  );
};
