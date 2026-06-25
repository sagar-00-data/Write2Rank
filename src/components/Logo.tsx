import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export default function Logo({ className = '', size = 36, color = 'var(--accent-color)' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Write2Rank Logo"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
    />
  );
}
