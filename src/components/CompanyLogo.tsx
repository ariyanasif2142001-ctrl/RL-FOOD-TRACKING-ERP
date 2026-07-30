import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  lightText?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'sm',
  showText = true,
  lightText = false,
}) => {
  // Size mapping
  const sizeClasses = {
    xs: { symbol: 'h-6', text: 'text-[11px]', sub: 'text-[7.5px]' },
    sm: { symbol: 'h-8', text: 'text-xs sm:text-sm', sub: 'text-[8.5px]' },
    md: { symbol: 'h-10', text: 'text-base sm:text-lg', sub: 'text-[10px]' },
    lg: { symbol: 'h-14', text: 'text-xl sm:text-2xl', sub: 'text-[12px]' },
    xl: { symbol: 'h-20', text: 'text-2xl sm:text-3xl', sub: 'text-[14px]' },
  };

  const currSize = sizeClasses[size] || sizeClasses.sm;

  // Colors adapted for dark vs light background
  const rColor = lightText ? '#8FE311' : '#7CB328';
  const lColor = lightText ? '#FFFFFF' : '#2D2D2D';
  const sproutColor = lightText ? '#8FE311' : '#7CB328';

  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      {/* SVG Icon matching input_file_0.png exact RL logo style */}
      <div className={`relative flex items-center justify-center shrink-0 ${currSize.symbol}`}>
        <svg viewBox="0 0 160 120" className="h-full w-auto aspect-4/3 drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 'R' in Vibrant Green */}
          <path
            d="M 15 110 V 20 H 45 C 65 20 75 30 75 45 C 75 58 65 65 48 65 H 32 V 110 H 15 Z M 32 35 V 50 H 45 C 52 50 58 46 58 42.5 C 58 38 52 35 45 35 H 32 Z M 48 65 L 75 110 H 55 L 32 72 H 48 Z"
            fill={rColor}
          />
          
          {/* 'L' in Pure White (for dark theme) or Dark Charcoal (for light theme) */}
          <path
            d="M 72 20 V 110 H 122 C 128 110 132 105 132 98 V 92 H 89 V 20 H 72 Z"
            fill={lColor}
          />

          {/* Green Sprout & Stem Accent above 'L' */}
          <path
            d="M 125 45 C 120 40 118 32 122 24 C 126 16 138 12 152 10 C 150 24 142 38 132 42 C 129 43 126 44 125 45 Z"
            fill={sproutColor}
          />
          {/* Leaf vein */}
          <path
            d="M 122 24 C 130 20 142 16 152 10"
            stroke={lightText ? '#072417' : '#ffffff'}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Stem & Dot */}
          <circle cx="120" cy="38" r="9" fill={sproutColor} />
          <path
            d="M 120 44 Q 120 62 120 72"
            stroke={sproutColor}
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1">
            <span className={`font-black tracking-tight ${lightText ? 'text-white' : 'text-slate-900'} ${currSize.text}`}>
              <span className={lightText ? 'text-[#8FE311]' : 'text-[#7CB328]'}>RL</span> FOOD COMPANY
            </span>
          </div>
          <span className={`font-bold tracking-widest uppercase ${lightText ? 'text-emerald-300' : 'text-[#7CB328]'} ${currSize.sub}`}>
            Fresh • Quality • Trust
          </span>
        </div>
      )}
    </div>
  );
};




