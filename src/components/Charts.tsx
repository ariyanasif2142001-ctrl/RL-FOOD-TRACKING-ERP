import React from 'react';

// Reusable SVG Bar Chart
export const BarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  height?: number;
}> = ({ data, height = 180 }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full flex items-end justify-between gap-2 pt-4" style={{ height }}>
      {data.map((item, idx) => {
        const heightPct = (item.value / maxVal) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              ${item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-36">
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full ${item.color || 'bg-blue-600'} rounded-t-lg transition-all duration-500 group-hover:brightness-110`}
              ></div>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Reusable SVG Donut / Progress Chart
export const DonutChart: React.FC<{
  percentage: number;
  label: string;
  sublabel: string;
  colorClass?: string;
}> = ({ percentage, label, sublabel, colorClass = 'text-emerald-500' }) => {
  const strokeDash = `${percentage}, 100`;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <path
            className="text-slate-100 dark:text-slate-800 stroke-current"
            strokeWidth="3.8"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={`${colorClass} stroke-current transition-all duration-1000 ease-out`}
            strokeDasharray={strokeDash}
            strokeWidth="3.8"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{percentage}%</span>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">{label}</span>
    </div>
  );
};

// Reusable Area Line Trend Chart
export const LineTrendChart: React.FC<{
  labels: string[];
  values: number[];
  color?: string;
}> = ({ labels, values }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * 300;
      const y = 100 - ((val - min) / (max - min || 1)) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full space-y-2">
      <div className="w-full h-36 relative">
        <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <polygon
            fill="url(#chartGradient)"
            points={`0,100 ${points} 300,100`}
          />

          {/* Line */}
          <polyline
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase px-1">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
};
