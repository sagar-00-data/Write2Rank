import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export default function Logo({ className = '', size = 36, color = 'var(--accent-color)' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Left Stroke */}
      <path
        d="M 10,35 H 25 L 41,71 L 30,80 Z"
        fill={color}
      />
      
      {/* Central Peak (Chevron with Spire Cutout) */}
      <path
        d="M 50,15 L 31,35 L 47,71 L 43,80 L 47.5,70 V 52 L 50,42 L 52.5,52 V 70 L 57,80 L 53,71 L 69,35 Z"
        fill={color}
      />
      
      {/* Right Stroke */}
      <path
        d="M 90,35 H 75 L 59,71 L 70,80 Z"
        fill={color}
      />
    </svg>
  );
}
