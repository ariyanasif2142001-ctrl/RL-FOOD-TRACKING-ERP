import React, { useState } from 'react';
import { PieChart, Layers, Filter, RotateCcw } from 'lucide-react';

interface DepartmentPieChartProps {
  departmentBreakdown: [string, number][];
  onSelectDepartment?: (deptName: string) => void;
  activeSelectedDept?: string;
}

const PALETTE = [
  { hex: '#10b981', hoverHex: '#059669', badgeBg: 'bg-emerald-500', border: 'border-emerald-200', bgLight: 'bg-emerald-50/80' },
  { hex: '#6366f1', hoverHex: '#4f46e5', badgeBg: 'bg-indigo-500', border: 'border-indigo-200', bgLight: 'bg-indigo-50/80' },
  { hex: '#f59e0b', hoverHex: '#d97706', badgeBg: 'bg-amber-500', border: 'border-amber-200', bgLight: 'bg-amber-50/80' },
  { hex: '#8b5cf6', hoverHex: '#7c3aed', badgeBg: 'bg-violet-500', border: 'border-violet-200', bgLight: 'bg-violet-50/80' },
  { hex: '#0ea5e9', hoverHex: '#0284c7', badgeBg: 'bg-sky-500', border: 'border-sky-200', bgLight: 'bg-sky-50/80' },
  { hex: '#f43f5e', hoverHex: '#e11d48', badgeBg: 'bg-rose-500', border: 'border-rose-200', bgLight: 'bg-rose-50/80' },
  { hex: '#14b8a6', hoverHex: '#0d9488', badgeBg: 'bg-teal-500', border: 'border-teal-200', bgLight: 'bg-teal-50/80' },
  { hex: '#f97316', hoverHex: '#ea580c', badgeBg: 'bg-orange-500', border: 'border-orange-200', bgLight: 'bg-orange-50/80' },
  { hex: '#06b6d4', hoverHex: '#0891b2', badgeBg: 'bg-cyan-500', border: 'border-cyan-200', bgLight: 'bg-cyan-50/80' },
  { hex: '#a855f7', hoverHex: '#9333ea', badgeBg: 'bg-purple-500', border: 'border-purple-200', bgLight: 'bg-purple-50/80' },
];

function getDonutSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const angleDiff = endAngleDeg - startAngleDeg;
  if (angleDiff >= 359.99) {
    return `M ${cx} ${cy - outerRadius}
            A ${outerRadius} ${outerRadius} 0 1 1 ${cx - 0.001} ${cy - outerRadius}
            L ${cx - 0.001} ${cy - innerRadius}
            A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}
            Z`;
  }

  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180;

  const x1 = cx + outerRadius * Math.cos(startRad);
  const y1 = cy + outerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(endRad);
  const y2 = cy + outerRadius * Math.sin(endRad);

  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  const largeArcFlag = angleDiff > 180 ? 1 : 0;

  return `M ${x1} ${y1}
          A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
          L ${x3} ${y3}
          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
          Z`;
}

export const DepartmentPieChart: React.FC<DepartmentPieChartProps> = ({
  departmentBreakdown,
  onSelectDepartment,
  activeSelectedDept = 'ALL',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalPOs = departmentBreakdown.reduce((sum, [, count]) => sum + count, 0);

  if (departmentBreakdown.length === 0 || totalPOs === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <PieChart className="w-4 h-4 text-emerald-600" />
          <span>Department Breakdown</span>
        </h4>
        <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No department data available
        </div>
      </div>
    );
  }

  // Pre-calculate angles for pie slices
  let currentAngle = 0;
  const slices = departmentBreakdown.map(([dept, count], index) => {
    const percentage = totalPOs > 0 ? (count / totalPOs) * 100 : 0;
    const angleSpan = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    const colorConfig = PALETTE[index % PALETTE.length];

    return {
      dept,
      count,
      percentage,
      startAngle,
      endAngle,
      colorConfig,
      index,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
              Department PO Breakdown Chart
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30">
                {departmentBreakdown.length} Departments
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">Click any department to filter POs live</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSelectedDept !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectDepartment?.('ALL')}
              className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dept Filter ({activeSelectedDept})</span>
            </button>
          )}
          <span className="text-xs font-mono font-black text-emerald-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-2xs">
            Total Active POs: {totalPOs}
          </span>
        </div>
      </div>

      {/* Main Chart & Details Layout (ENLARGED) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* SVG Pie / Donut Canvas - ENLARGED SIZE (250x250) */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center justify-center relative py-2">
          <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
            <svg viewBox="0 0 250 250" className="w-full h-full overflow-visible drop-shadow-md">
              <g>
                {slices.map((slice) => {
                  const isHovered = hoveredIndex === slice.index;
                  const isSelected = activeSelectedDept === slice.dept;

                  const outerR = isHovered ? 112 : isSelected ? 108 : 102;
                  const innerR = isHovered ? 60 : 66;

                  const pathD = getDonutSlicePath(125, 125, outerR, innerR, slice.startAngle, slice.endAngle);

                  return (
                    <path
                      key={slice.dept}
                      d={pathD}
                      fill={isHovered ? slice.colorConfig.hoverHex : slice.colorConfig.hex}
                      className="cursor-pointer transition-all duration-300 ease-out hover:opacity-100"
                      style={{
                        opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                        filter: isHovered || isSelected ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredIndex(slice.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => onSelectDepartment?.(slice.dept)}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Donut Hole Center Content - ENLARGED */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
              {activeSlice ? (
                <div className="animate-fade-in transition-all space-y-0.5">
                  <span className="block text-xs font-black uppercase text-slate-300 tracking-wider truncate max-w-[110px]">
                    {activeSlice.dept}
                  </span>
                  <span className="block text-3xl font-black text-white leading-none">
                    {activeSlice.count}
                  </span>
                  <span className="inline-block text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40">
                    {activeSlice.percentage.toFixed(1)}% of POs
                  </span>
                </div>
              ) : (
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                    {activeSelectedDept !== 'ALL' ? activeSelectedDept : 'All Depts'}
                  </span>
                  <span className="block text-3xl font-black text-white leading-none my-1">
                    {totalPOs}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Total PO Orders
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend Cards Grid - ENLARGED */}
        <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            const isSelected = activeSelectedDept === slice.dept;

            return (
              <div
                key={slice.dept}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectDepartment?.(slice.dept)}
                className={`p-3 rounded-xl transition-all cursor-pointer border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400 shadow-md'
                    : isHovered
                    ? 'bg-slate-700/80 border-slate-500 shadow-md scale-[1.01]'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 truncate pr-1">
                    <span
                      className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ${slice.colorConfig.badgeBg}`}
                    />
                    <span className="font-extrabold text-white text-xs truncate">
                      {slice.dept}
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 bg-slate-900/90 text-white rounded-lg font-mono font-black text-xs border border-slate-700 shrink-0">
                    {slice.count} POs
                  </span>
                </div>

                {/* Progress bar & Percent */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex-1 bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-700/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${slice.colorConfig.badgeBg}`}
                      style={{ width: `${Math.max(slice.percentage, 5)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

