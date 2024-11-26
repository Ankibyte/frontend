// src/components/Logo.js
import React from 'react';

const Logo = () => {
  return (
    <div className="flex items-center justify-center gap-4">
      <img 
        src="/logo.png" 
        alt="Ankibyte Logo" 
        className="h-12 md:h-16 object-contain"
      />
      <svg 
        className="h-12 md:h-16" 
        viewBox="0 0 300 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2"/>
          </filter>
          <clipPath id="bite">
            <circle cx="205" cy="25" r="8" />
          </clipPath>
        </defs>
        <text
          x="10"
          y="60"
          className="font-display"
          fill="#2563EB"
          fontSize="48"
          fontFamily="Righteous, cursive"
          filter="url(#shadow)"
          clipPath="url(#bite)"
        >
          ANKIBYTE
        </text>
        {/* Add decorative bytes */}
        <g className="bytes" fill="#93C5FD">
          <circle cx="205" cy="25" r="4" />
          <circle cx="220" cy="15" r="3" />
          <circle cx="235" cy="20" r="2" />
        </g>
      </svg>
    </div>
  );
};

export default Logo;