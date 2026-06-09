import React from 'react';

export interface SunglassesSVGProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'classic' | 'aviator' | 'goggles' | 'visor' | 'stacked';
}

export const SunglassesSVG: React.FC<SunglassesSVGProps> = ({ variant = 'classic', ...props }) => {
  return (
    <svg
      viewBox="0 0 100 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full select-none"
      {...props}
    >
      {variant === 'classic' && (
        <>
          {/* Classic Wide & Narrow B/W pixelated glasses */}
          <path d="M4 4h92v4H4V4z" fill="#000000" />
          <path d="M8 8h32v4H8V8zm4 4h24v4H12V12zm4 4h16v4H16V16z" fill="#000000" />
          <path d="M60 8h32v4H60V8zm4 4h24v4H64V12zm4 4h16v4H68V16z" fill="#000000" />
          
          {/* High-Contrast White Pixel Glare */}
          <path d="M12 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M16 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M20 16h4v4h-4v-4z" fill="#ffffff" />
          
          <path d="M64 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M68 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M72 16h4v4h-4v-4z" fill="#ffffff" />
        </>
      )}

      {variant === 'aviator' && (
        <>
          {/* True Pixelated Aviator Deal-With-It Droop Shades, Black & White */}
          <path d="M4 4h92v4H4V4z" fill="#000000" />
          
          {/* Left Drooping Lens */}
          <path d="M8 8h36v4H8V8zm0 4h32v4H8v-4zm4 4h24v4H12v-4zm4 4h16v4H16v-4z" fill="#000000" />
          
          {/* Right Drooping Lens */}
          <path d="M56 8h36v4H56V8zm4 4h32v4H60v-4zm4 4h24v4H64v-4zm4 4h16v4H68v-4z" fill="#000000" />
          
          {/* Large White pixel glares */}
          <path d="M12 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M16 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M20 16h4v4h-4v-4z" fill="#ffffff" />
          
          <path d="M64 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M68 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M72 16h4v4h-4v-4z" fill="#ffffff" />
        </>
      )}

      {variant === 'goggles' && (
        <>
          {/* Chunky Rectangular/Square Bold Pixel Goggles (Image 2 style) */}
          <path d="M4 4h92v8H4V4z" fill="#000000" />
          
          {/* Left Blocky square lens with bevels */}
          <path d="M4 12h40v8H4v-8zm4 8h32v4H8v-4z" fill="#000000" />
          
          {/* Right Blocky square lens with bevels */}
          <path d="M56 12h40v8H56v-8zm4 8h32v4H60v-4z" fill="#000000" />
          
          {/* Massive pixelated white glare stripes */}
          <path d="M12 12h8v4h-8v-4zm4 16h8v4h-8v-4zm4 4h8v4h-8v-4z" fill="#ffffff" />
          <path d="M12 12h8v4h-8v-4zm4 4h8v4h-8v-4zm4 8h8v4h-8v-4z" fill="#ffffff" />
          <path d="M64 12h8v4h-8v-4zm4 4h8v4h-8v-4zm4 8h8v4h-8v-4z" fill="#ffffff" />
        </>
      )}
      {variant === 'visor' && (
        <>
          {/* Continuous blocky visor style */}
          <path d="M4 4h92v8H4V4z" fill="#000000" />
          <path d="M8 12h84v4H8v-4z" fill="#000000" />
          <path d="M12 4h4v4h-4V4z" fill="#ffffff" />
          <path d="M16 8h4v4h-4v-4z" fill="#ffffff" />
          <path d="M20 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M64 4h4v4h-4V4z" fill="#ffffff" />
          <path d="M68 8h4v4h-4v-4z" fill="#ffffff" />
          <path d="M72 12h4v4h-4v-4z" fill="#ffffff" />
        </>
      )}

      {variant === 'stacked' && (
        <>
          {/* Double stacked sunglasses */}
          <path d="M4 0h92v4H4V0z" fill="#000000" />
          <path d="M8 4h32v4H8V4zm4 4h24v4H12V8zm4 4h16v4H16v-4z" fill="#000000" />
          <path d="M60 4h32v4H60V4zm4 4h24v4H64V8zm4 4h16v4H68v-4z" fill="#000000" />
          <path d="M12 4h4v4h-4V4z" fill="#ffffff" />
          <path d="M16 8h4v4h-4v-4z" fill="#ffffff" />
          <path d="M64 4h4v4h-4V4z" fill="#ffffff" />
          <path d="M68 8h4v4h-4v-4z" fill="#ffffff" />
          
          <path d="M4 8h92v4H4V8z" fill="#000000" />
          <path d="M8 12h32v4H8v-4zm4 4h24v4H12v-4zm4 4h16v4H16v-4z" fill="#000000" />
          <path d="M60 12h32v4H60v-4zm4 4h24v4H64v-4zm4 4h16v4H68v-4z" fill="#000000" />
          <path d="M12 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M16 16h4v4h-4v-4z" fill="#ffffff" />
          <path d="M64 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M68 16h4v4h-4v-4z" fill="#ffffff" />
        </>
      )}
    </svg>
  );
};

export interface JointSVGProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'classic' | 'cigar' | 'cone' | 'photo';
}

export const JointSVG: React.FC<JointSVGProps> = ({ variant = 'classic', ...props }) => {
  return (
    <svg
      viewBox="0 0 140 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full select-none"
      {...props}
    >
      <defs>
        <linearGradient id="paperGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f7fafc" />
          <stop offset="65%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e0" />
        </linearGradient>

        <linearGradient id="emberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b91c1c" /> {/* Deep dark red inner */}
          <stop offset="40%" stopColor="#ea580c" /> {/* Rich fiery orange */}
          <stop offset="70%" stopColor="#f59e0b" /> {/* Bright gold glare */}
          <stop offset="100%" stopColor="#fffbeb" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="ashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4a5568" />
          <stop offset="60%" stopColor="#718096" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Realistic Cuban Cigar Gradients */}
        <linearGradient id="cigarTobacco" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2d1604" />
          <stop offset="50%" stopColor="#4c270c" />
          <stop offset="100%" stopColor="#2d1604" />
        </linearGradient>
        <linearGradient id="cigarBand" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#991b1b" /> {/* Red label */}
          <stop offset="40%" stopColor="#ca8a04" /> {/* Gold trim */}
          <stop offset="60%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="cigarEmber" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>

        {/* Realistic paper cone gradient */}
        <linearGradient id="conePaper" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.85" /> {/* Light beige unbleached */}
          <stop offset="70%" stopColor="#fed7aa" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="coneFilter" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Photographic realistic joint gradients */}
        <linearGradient id="photoJointBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="15%" stopColor="#f3f4f6" />
          <stop offset="60%" stopColor="#e5e7eb" />
          <stop offset="85%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>

        <linearGradient id="photoCreaseShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#111827" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="photoEmberCore" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e0501" />
          <stop offset="25%" stopColor="#b91c1c" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>

        <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="hyperGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur2" />
          <feComposite in="SourceGraphic" in2="blur2" operator="over" />
        </filter>
      </defs>

      {variant === 'classic' && (
        <g filter="url(#glow)">
          {/* Traditional White Paper Joint */}
          <path
            d="M 5 13.5 L 115 6 L 115 24 L 5 16.5 C 3.5 16.5 3.5 13.5 5 13.5 Z"
            fill="url(#paperGradient)"
            stroke="#2d3748"
            strokeWidth="0.8"
          />
          {/* Tiny paper roll lines */}
          <path d="M 30 11.5 Q 33 15 30 18.0" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.6" />
          <path d="M 55 9.8 Q 58 15 55 19.5" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.6" />
          <path d="M 80 8.1 Q 83 15 80 21.0" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.6" />
          <path d="M 105 6.4 Q 108 15 105 22.5" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.6" />
          
          {/* Ember glow tip */}
          <path
            d="M 115 6 L 122 8.5 L 120 15 L 122 21.5 L 115 24 L 117 15 Z"
            fill="url(#emberGradient)"
          />
          {/* Ash tip */}
          <path
            d="M 122 8.5 L 128 10.5 L 130 15 L 128 19.5 L 122 21.5 L 120 15 Z"
            fill="url(#ashGradient)"
          />
          <circle cx="123" cy="11" r="1" fill="#f59e0b" />
          <circle cx="126" cy="16" r="0.8" fill="#ef4444" />
          <circle cx="118" cy="14" r="1" fill="#ffffff" />
        </g>
      )}

      {variant === 'photo' && (
        <g>
          {/* High-Fidelity 3D Photo Joint with unbleached paper shading, wrinkles, realistic burnt end */}
          {/* Wrapper glow */}
          <g filter="url(#glow)">
            {/* Tapered paper cylinder */}
            <path
              d="M 6 15.5 L 112 5.5 L 112 25.5 L 6 18.5 C 4.5 18.5 4.5 15.5 6 15.5 Z"
              fill="url(#photoJointBody)"
              stroke="#7f8c8d"
              strokeWidth="0.5"
            />
            {/* Cylindrical lighting overlays / soft dark creases */}
            <path
              d="M 6 15.5 Q 60 21 112 5.5 L 112 11 Q 60 25 6 16.5 Z"
              fill="url(#photoCreaseShadow)"
              opacity="0.85"
            />
            
            {/* Paper rolling folds & seams - 3D shaded lines */}
            {/* Folder 1 */}
            <path d="M 28 15.2 L 24 18.0" stroke="#b0b0b0" strokeWidth="0.8" opacity="0.8" />
            <path d="M 29 15.1 L 25 17.9" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
            
            {/* Folder 2 */}
            <path d="M 52 13.0 C 53 15 51 18 48 20.2" stroke="#a0a0a0" strokeWidth="0.7" opacity="0.9" />
            <path d="M 53 12.9 C 54 15 52 18 49 20.1" stroke="#ffffff" strokeWidth="0.4" opacity="0.6" />

            {/* Folder 3 */}
            <path d="M 76 10.8 Q 78 16 72 22.4" stroke="#909090" strokeWidth="0.8" opacity="0.85" />
            <path d="M 77 10.7 Q 79 16 73 22.3" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />

            {/* Folder 4 */}
            <path d="M 98 8.6 L 94 24.1" stroke="#8a8a8a" strokeWidth="0.7" opacity="0.9" />
            <path d="M 99 8.5 L 95 24.0" stroke="#ffffff" strokeWidth="0.4" opacity="0.6" />

            {/* Mouthpiece / filter wrap look on left side */}
            <path
              d="M 6 15.5 L 20 15.1 L 20 19.1 L 6 18.5 Z"
              fill="#e5e5e5"
              opacity="0.4"
            />
            <line x1="20" y1="15.1" x2="20" y2="19.1" stroke="#1f2937" strokeWidth="0.5" opacity="0.4" />

            {/* Subtle organic translucency herb flecks showing under thin paper */}
            <circle cx="34" cy="16.5" r="1.3" fill="#1e3a1e" opacity="0.4" />
            <circle cx="46" cy="15.0" r="0.9" fill="#2d4a22" opacity="0.3" />
            <circle cx="62" cy="17.0" r="1.5" fill="#3f51b5" opacity="0.15" />
            <circle cx="82" cy="14.2" r="1.8" fill="#1e3a1e" opacity="0.35" />
            <circle cx="89" cy="18.5" r="1.2" fill="#3b7a3b" opacity="0.3" />
            <circle cx="106" cy="11.4" r="1.4" fill="#2d4a22" opacity="0.4" />

            {/* Realistic burnt / charred paper edges transition near the ember */}
            <path
              d="M 112 5.5 C 110 8 111 12 107 14 C 111 16 109 21 112 25.5 Z"
              fill="#1e1b18"
              opacity="0.9"
            />
            <path
              d="M 109 9.5 C 107 11 108 14 105 15 C 108 16 106 18 109 20.5 Z"
              fill="#374151"
              opacity="0.8"
            />
          </g>

          {/* Hyper-glowing orange/red photographic ember elements */}
          <g filter="url(#hyperGlow)">
            {/* Burning Tip Base */}
            <path
              d="M 112 5.5 C 114 6.5 119 9 116 15 C 119 21 114 24.5 112 25.5 C 113.5 19 113.5 12 112 5.5 Z"
              fill="url(#photoEmberCore)"
            />
            
            {/* Dynamic visual ash crown on right */}
            <path
              d="M 116 15 L 126 13.0 L 128 15 L 126 17.0 Z"
              fill="url(#emberGradient)"
              opacity="0.8"
            />

            {/* Brightest internal core cracks */}
            <path d="M 113 10 C 114 12 115 14 113 16" stroke="#fffbeb" strokeWidth="1.2" strokeLinecap="round" opacity="0.95" />
            <path d="M 114.5 12 C 115.5 13 115.5 14 114.5 15" stroke="#fcd34d" strokeWidth="0.8" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* 3D Speckled Ash Cap overlying the ember */}
          <g filter="url(#glow)">
            <path
              d="M 116 6.5 Q 124 8.5 124 15 Q 124 21.5 116 23.5 C 120 18.5 120 11.5 116 6.5 Z"
              fill="url(#ashGradient)"
              opacity="0.9"
            />
            {/* Speckled high-contrast ash particles */}
            <circle cx="118" cy="11" r="1.3" fill="#f3f4f6" />
            <circle cx="119.5" cy="16.5" r="0.8" fill="#1f2937" />
            <circle cx="121" cy="14" r="1.1" fill="#9ca3af" />
            <circle cx="122.5" cy="18" r="0.9" fill="#f3f4f6" />
            <circle cx="117.5" cy="19.5" r="1.1" fill="#4b5563" />
            <circle cx="123" cy="11.5" r="0.7" fill="#ffffff" />
            <circle cx="121.5" cy="8.5" r="0.9" fill="#374151" />

            {/* Burning hot spot sparks */}
            <circle cx="119.8" cy="13.2" r="0.75" fill="#f97316" filter="url(#glow)" />
            <circle cx="117.2" cy="17.8" r="0.85" fill="#ef4444" filter="url(#glow)" />
            <circle cx="120.5" cy="10.8" r="0.6" fill="#fbbf24" filter="url(#glow)" />
          </g>
        </g>
      )}

      {variant === 'cigar' && (
        <g filter="url(#glow)">
          {/* Chunky Cuban Cigar */}
          <path
            d="M 5 18 L 115 10 L 115 26 L 5 22 C 3.5 22 3.5 18 5 18 Z"
            fill="url(#cigarTobacco)"
            stroke="#1c0d02"
            strokeWidth="1"
          />
          {/* Cigar Leaf Ridges */}
          <path d="M 25 16.5 L 28 20.5" stroke="#1c0d02" strokeWidth="0.8" opacity="0.4" />
          <path d="M 50 14.7 L 53 19.5" stroke="#1c0d02" strokeWidth="0.8" opacity="0.4" />
          <path d="M 75 13.0 L 78 18.0" stroke="#1c0d02" strokeWidth="0.8" opacity="0.4" />
          
          {/* Gold & Red Premium Cigar Label Band */}
          <path
            d="M 15 17.2 L 28 16.2 L 28 23.3 L 15 21.2 Z"
            fill="url(#cigarBand)"
            stroke="#78350f"
            strokeWidth="0.5"
          />
          <circle cx="21.5" cy="19" r="2.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.3" />

          {/* Golden/Red Ember glow */}
          <path
            d="M 115 10 L 121 12.5 L 120 18 L 121 23.5 L 115 26 L 117 18 Z"
            fill="url(#cigarEmber)"
          />
          {/* Cigar grey-ash head */}
          <path
            d="M 121 12.5 L 129 14.5 L 131 18 L 129 21.5 L 121 23.5 L 120 18 Z"
            fill="url(#ashGradient)"
          />
          <circle cx="123" cy="14" r="1.2" fill="#fb923c" />
          <circle cx="125" cy="20" r="1" fill="#ea580c" />
          <circle cx="118" cy="18" r="1" fill="#ffffff" />
        </g>
      )}

      {variant === 'cone' && (
        <g filter="url(#glow)">
          {/* Unbleached paper tapered cone joint / spliff */}
          <path
            d="M 5 15.5 L 115 4 L 115 28 L 5 18.5 C 3.5 18.5 3.5 15.5 5 15.5 Z"
            fill="url(#conePaper)"
            stroke="#7c2d12"
            strokeWidth="0.6"
          />
          {/* Cardboard mouthpiece filter tip on the left */}
          <path
            d="M 5 15.5 L 24 15.0 L 24 19.0 L 5 18.5 Z"
            fill="url(#coneFilter)"
            stroke="#7c2d12"
            strokeWidth="0.4"
          />
          
          {/* visible herb flecks inside translucent cone */}
          <circle cx="45" cy="13.5" r="1" fill="#15803d" opacity="0.6" />
          <circle cx="65" cy="16.5" r="1.2" fill="#166534" opacity="0.6" />
          <circle cx="85" cy="12.0" r="0.9" fill="#15803d" opacity="0.5" />
          <circle cx="55" cy="16.0" r="0.8" fill="#ca8a04" opacity="0.5" />
          <circle cx="95" cy="19.0" r="1.1" fill="#166534" opacity="0.6" />

          {/* burning ember tip */}
          <path
            d="M 115 4 L 123 6.8 L 121 16 L 123 25.2 L 115 28 L 117 16 Z"
            fill="url(#emberGradient)"
          />
          {/* residual speckled grey ash */}
          <path
            d="M 123 6.8 L 130 9.0 L 132 16 L 130 22.8 L 123 25.2 L 121 16 Z"
            fill="url(#ashGradient)"
          />
          <circle cx="125" cy="10" r="1" fill="#fbbf24" />
          <circle cx="127" cy="18" r="0.9" fill="#f97316" />
          <circle cx="119" cy="15" r="1.1" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
};
