import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  neutral?: boolean;
  icon: React.ReactNode;
  borderAccentColor: string; // e.g. 'border-l-blue-500', 'border-l-emerald-500'
  sparklineData?: number[];
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  neutral = false,
  icon,
  borderAccentColor,
  sparklineData = [12, 18, 15, 25, 22, 30, 28],
  onClick,
}) => {
  // Generate simple SVG path points for sparkline
  const max = Math.max(...sparklineData, 1);
  const min = Math.min(...sparklineData, 0);
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * 100;
      const y = 32 - ((val - min) / (max - min || 1)) * 26;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${borderAccentColor} rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group`}
    >
      <div className="flex items-center justify-between">
        {/* Card Title: 15-16px */}
        <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform">
          {icon}
        </div>
      </div>

      {/* Numbers: 30-36px */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[32px] sm:text-[36px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
          {value}
        </span>

        {change && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
              neutral
                ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                : isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {neutral ? (
              <Minus size={12} />
            ) : isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>

      {/* Mini Sparkline Chart & Subtitle */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {subtitle || 'Compared to last 7 days'}
        </span>

        {/* SVG Sparkline */}
        <div className="w-20 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 100 32" className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className={
                borderAccentColor.includes('blue')
                  ? 'text-blue-500'
                  : borderAccentColor.includes('emerald')
                  ? 'text-emerald-500'
                  : borderAccentColor.includes('amber')
                  ? 'text-amber-500'
                  : borderAccentColor.includes('purple')
                  ? 'text-purple-500'
                  : borderAccentColor.includes('rose')
                  ? 'text-rose-500'
                  : 'text-sky-500'
              }
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
