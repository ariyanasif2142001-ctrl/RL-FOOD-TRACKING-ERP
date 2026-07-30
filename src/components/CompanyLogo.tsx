import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'sm',
  showText = true
}) => {
  return (
    <div className={`flex items-center shrink-0 min-w-0 ${className}`}>
      {showText ? (
        <div className="flex flex-col justify-center leading-tight select-none min-w-0">
          <span className="font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 text-xs sm:text-sm uppercase whitespace-nowrap drop-shadow-xs">
            RADIANT LIGHTNING
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-emerald-400 uppercase whitespace-nowrap mt-0.5">
            FOOD COMPANY
          </span>
        </div>
      ) : (
        <span className="font-serif font-black text-amber-300 text-xs px-2 py-0.5 bg-emerald-950 border border-emerald-800/80 rounded-md tracking-wider">
          RL
        </span>
      )}
    </div>
  );
};



