import React from 'react';

// Deal With It pixel sunglasses
export const SunglassesSVG: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 100 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full select-none"
    {...props}
  >
    {/* Frame and Lenses */}
    <path d="M4 4h92v4H4V4z" fill="#000000" />
    
    {/* Left Lens Staircase */}
    <path d="M8 8h32v4H8V8zm4 4h24v4H12V12zm4 4h16v4H16V16z" fill="#000000" />
    
    {/* Right Lens Staircase */}
    <path d="M60 8h32v4H60V8zm4 4h24v4H64V12zm4 4h16v4H68V16z" fill="#000000" />
    
    {/* Left Reflections (White Pixels) */}
    <path d="M12 8h4v4h-4V8z" fill="#ffffff" />
    <path d="M16 12h4v4h-4v-4z" fill="#ffffff" />
    <path d="M20 16h4v4h-24v-4z" fill="#ffffff" opacity="0.3" /> {/* Lens tint shadow */}
    <path d="M20 16h4v4h-4v-4z" fill="#ffffff" />

    {/* Right Reflections (White Pixels) */}
    <path d="M64 8h4v4h-4V8z" fill="#ffffff" />
    <path d="M68 12h4v4h-4v-4z" fill="#ffffff" />
    <path d="M72 16h4v4h-4v-4z" fill="#ffffff" />
    
    {/* Cool neon underglow accent (added dynamically for visual flair) */}
    <path d="M8 8H4v12h4V8z" fill="#000000" />
    <path d="M92 8h4v12h-4V8z" fill="#000000" />
  </svg>
);

// High-fidelity burning Joint with ash structure
export const JointSVG: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 140 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full select-none"
    {...props}
  >
    <g filter="url(#glow)">
      {/* Tapered cone: starts thin on the mouth-left end and flares out wider on the right */}
      <path
        d="M 5 13.5 L 115 6 L 115 24 L 5 16.5 C 3.5 16.5 3.5 13.5 5 13.5 Z"
        fill="url(#paperGradient)"
        stroke="#2d3748"
        strokeWidth="1"
      />
      
      {/* Wrapper lines curved on the cone to give 3D depth */}
      <path d="M 30 11.8 Q 33 15 30 18.2" stroke="#cbd5e1" strokeWidth="0.7" opacity="0.6" />
      <path d="M 55 10.1 Q 58 15 55 19.9" stroke="#cbd5e1" strokeWidth="0.7" opacity="0.6" />
      <path d="M 80 8.4 Q 83 15 80 21.6" stroke="#cbd5e1" strokeWidth="0.7" opacity="0.6" />
      <path d="M 105 6.7 Q 108 15 105 23.3" stroke="#cbd5e1" strokeWidth="0.7" opacity="0.6" />

      {/* Glowing tip & burning ember connected to cone edge */}
      <path
        d="M 115 6 L 122 8.5 L 120 15 L 122 21.5 L 115 24 L 117 15 Z"
        fill="url(#emberGradient)"
      />

      {/* Ash structures glowing right-most */}
      <path
        d="M 122 8.5 L 128 10.5 L 130 15 L 128 19.5 L 122 21.5 L 120 15 Z"
        fill="url(#ashGradient)"
      />

      {/* Sparkles of embers */}
      <circle cx="124" cy="11" r="1.2" fill="#f59e0b" />
      <circle cx="126" cy="17" r="1" fill="#ef4444" />
      <circle cx="118" cy="14" r="1.2" fill="#ff4500" />
    </g>

    <defs>
      {/* Define nice gradients */}
      <linearGradient id="paperGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f7fafc" />
        <stop offset="60%" stopColor="#edf2f7" />
        <stop offset="100%" stopColor="#cbd5e0" />
      </linearGradient>

      <linearGradient id="emberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="50%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#facc15" stopOpacity="0.8" />
      </linearGradient>

      <linearGradient id="ashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4a5568" />
        <stop offset="50%" stopColor="#718096" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>

      {/* Less intense glow filter */}
      <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="0.4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  </svg>
);
