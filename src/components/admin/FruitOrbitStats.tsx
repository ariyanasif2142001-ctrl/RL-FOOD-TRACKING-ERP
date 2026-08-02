import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Filter, Sparkles } from 'lucide-react';

interface FruitOrbitStatsProps {
  totalPO: number;
  pendingPO: number;
  partialPO: number;
  completedPO: number;
  pendingItemsCount: number;
  heldItemsCount: number;
  partialItemsCount: number;
  purchasedItemsCount: number;
  onSelectReport: (reportKey: string) => void;
}

interface FruitItem {
  id: string;
  label: string;
  count: number;
  reportKey: string;
  type: 'apple' | 'orange' | 'grapes' | 'lime' | 'cherry' | 'plum' | 'lemon' | 'peach';
  icon: string;
  themeGlow: string;
  borderColor: string;
  accentText: string;
  btnBg: string;
}

export const FruitOrbitStats: React.FC<FruitOrbitStatsProps> = ({
  totalPO,
  pendingPO,
  partialPO,
  completedPO,
  pendingItemsCount,
  heldItemsCount,
  partialItemsCount,
  purchasedItemsCount,
  onSelectReport,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fruits: FruitItem[] = [
    {
      id: 'total_po',
      label: 'Total PO',
      count: totalPO,
      reportKey: 'total_po',
      type: 'apple',
      icon: '🍎',
      themeGlow: 'rgba(239, 68, 68, 0.28)',
      borderColor: 'border-rose-500/60',
      accentText: 'text-rose-400',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
    },
    {
      id: 'pending_po',
      label: 'Pending PO',
      count: pendingPO,
      reportKey: 'pending_po',
      type: 'orange',
      icon: '🍊',
      themeGlow: 'rgba(249, 115, 22, 0.28)',
      borderColor: 'border-orange-500/60',
      accentText: 'text-orange-400',
      btnBg: 'bg-orange-600 hover:bg-orange-500 text-white',
    },
    {
      id: 'partial_po',
      label: 'Partial PO',
      count: partialPO,
      reportKey: 'partial_po',
      type: 'grapes',
      icon: '🍇',
      themeGlow: 'rgba(168, 85, 247, 0.28)',
      borderColor: 'border-purple-500/60',
      accentText: 'text-purple-400',
      btnBg: 'bg-purple-600 hover:bg-purple-500 text-white',
    },
    {
      id: 'completed_po',
      label: 'Completed PO',
      count: completedPO,
      reportKey: 'completed_po',
      type: 'lime',
      icon: '🍏',
      themeGlow: 'rgba(34, 197, 94, 0.28)',
      borderColor: 'border-emerald-500/60',
      accentText: 'text-emerald-400',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
    {
      id: 'pending_items',
      label: 'Pending Items',
      count: pendingItemsCount,
      reportKey: 'pending_items',
      type: 'cherry',
      icon: '🍒',
      themeGlow: 'rgba(244, 63, 94, 0.28)',
      borderColor: 'border-rose-500/60',
      accentText: 'text-rose-400',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
    },
    {
      id: 'hold_items',
      label: 'Hold Items',
      count: heldItemsCount,
      reportKey: 'hold_items',
      type: 'plum',
      icon: '🫐',
      themeGlow: 'rgba(99, 102, 241, 0.28)',
      borderColor: 'border-indigo-500/60',
      accentText: 'text-indigo-400',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    {
      id: 'partial_items',
      label: 'Partial Items',
      count: partialItemsCount,
      reportKey: 'partial_items',
      type: 'lemon',
      icon: '🍋',
      themeGlow: 'rgba(234, 179, 8, 0.28)',
      borderColor: 'border-amber-400/60',
      accentText: 'text-amber-300',
      btnBg: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black',
    },
    {
      id: 'purchased_items',
      label: 'Purchased Items',
      count: purchasedItemsCount,
      reportKey: 'purchased_items',
      type: 'peach',
      icon: '🍑',
      themeGlow: 'rgba(251, 146, 60, 0.28)',
      borderColor: 'border-orange-400/60',
      accentText: 'text-orange-300',
      btnBg: 'bg-orange-400 hover:bg-orange-300 text-slate-950 font-black',
    },
  ];

  const safeActiveIndex = (activeIndex + fruits.length) % fruits.length;
  const activeFruit = fruits[safeActiveIndex];

  // Rotate fruit to center ONLY — DOES NOT trigger filter/report action
  const rotateToFruitIndex = useCallback((index: number) => {
    const nextIndex = (index + fruits.length) % fruits.length;
    setActiveIndex(nextIndex);
  }, [fruits.length]);

  // Click handler specifically distinguishing SIDE vs CENTER fruit
  const handleFruitClick = (index: number, reportKey: string, isCenter: boolean) => {
    if (isCenter) {
      // ONLY CENTER fruit opens filter report
      onSelectReport(reportKey);
    } else {
      // SIDE fruits ONLY slide into center position
      rotateToFruitIndex(index);
    }
  };

  const handlePrev = useCallback(() => {
    rotateToFruitIndex(activeIndex - 1);
  }, [activeIndex, rotateToFruitIndex]);

  const handleNext = useCallback(() => {
    rotateToFruitIndex(activeIndex + 1);
  }, [activeIndex, rotateToFruitIndex]);

  // Keyboard arrow navigation (slides fruits)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Render High Quality Glossy 3D Vector Fruit Icon (Pure SVG + CSS)
  const render3DFruitShape = (fruit: FruitItem, isCenter: boolean) => {
    const shadowFilter = isCenter
      ? 'drop-shadow(0 16px 24px rgba(0,0,0,0.75)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
      : 'drop-shadow(0 8px 14px rgba(0,0,0,0.5))';

    return (
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center select-none group">
        <svg
          viewBox="0 0 140 140"
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          style={{ filter: shadowFilter }}
        >
          <defs>
            {/* Stem & Leaf High Contrast Gradients */}
            <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="45%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#290e03" />
            </linearGradient>

            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="35%" stopColor="#22c55e" />
              <stop offset="85%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>

            {/* Apple 3D Body: Glossy light top, deep crimson base */}
            <radialGradient id="appleBody" cx="32%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#ff8787" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="65%" stopColor="#b91c1c" />
              <stop offset="90%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#300606" />
            </radialGradient>

            {/* Orange 3D Body: Warm bright highlight to deep burnt amber base */}
            <radialGradient id="orangeBody" cx="30%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="22%" stopColor="#fb923c" />
              <stop offset="60%" stopColor="#ea580c" />
              <stop offset="88%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#431407" />
            </radialGradient>

            {/* Lime 3D Body: Vivid neon top to deep forest base */}
            <radialGradient id="limeBody" cx="32%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#f0fdf4" />
              <stop offset="25%" stopColor="#4ade80" />
              <stop offset="60%" stopColor="#16a34a" />
              <stop offset="88%" stopColor="#14532d" />
              <stop offset="100%" stopColor="#02200e" />
            </radialGradient>

            {/* Cherry 3D Body */}
            <radialGradient id="cherryBody" cx="30%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#ffe4e6" />
              <stop offset="25%" stopColor="#f43f5e" />
              <stop offset="65%" stopColor="#be123c" />
              <stop offset="90%" stopColor="#881337" />
              <stop offset="100%" stopColor="#3b0212" />
            </radialGradient>

            {/* Plum 3D Body */}
            <radialGradient id="plumBody" cx="32%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#eef2ff" />
              <stop offset="25%" stopColor="#818cf8" />
              <stop offset="60%" stopColor="#4338ca" />
              <stop offset="88%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#111038" />
            </radialGradient>

            {/* Lemon 3D Body: Bright sunshine highlight to deep mustard shadow base */}
            <radialGradient id="lemonBody" cx="32%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#fefce8" />
              <stop offset="28%" stopColor="#facc15" />
              <stop offset="62%" stopColor="#ca8a04" />
              <stop offset="88%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#422006" />
            </radialGradient>

            {/* Peach 3D Body: Cream highlight to rosy deep coral base */}
            <radialGradient id="peachBody" cx="32%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="28%" stopColor="#fed7aa" />
              <stop offset="58%" stopColor="#fb923c" />
              <stop offset="85%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>

            {/* Grape Individual Berry Radial */}
            <radialGradient id="grapeBerry" cx="30%" cy="24%" r="72%">
              <stop offset="0%" stopColor="#f3e8ff" />
              <stop offset="28%" stopColor="#c084fc" />
              <stop offset="62%" stopColor="#7e22ce" />
              <stop offset="88%" stopColor="#581c87" />
              <stop offset="100%" stopColor="#260444" />
            </radialGradient>
          </defs>

          {/* 1. APPLE */}
          {fruit.type === 'apple' && (
            <g>
              {/* Stem */}
              <path d="M70 42 C 68 28, 77 18, 79 14" fill="none" stroke="url(#stemGrad)" strokeWidth="4.5" strokeLinecap="round" />
              {/* Leaf */}
              <g transform="translate(77, 18) rotate(22)">
                <path d="M0 0 C 14 -12, 26 -5, 30 8 C 18 15, 5 9, 0 0 Z" fill="url(#leafGrad)" />
                <path d="M0 0 C 15 -3, 24 2, 30 8" fill="none" stroke="#dcfce7" strokeWidth="1.2" opacity="0.85" />
              </g>

              {/* Apple Body */}
              <path
                d="M70 42 C 52 38, 22 50, 22 80 C 22 116, 52 128, 68 128 C 72 128, 70 125, 74 125 C 78 125, 76 128, 80 128 C 96 128, 126 116, 126 80 C 126 50, 96 38, 78 42 C 74 43, 72 43, 70 42 Z"
                fill="url(#appleBody)"
              />
              {/* Top Dimple Indent Shadow */}
              <ellipse cx="74" cy="44" rx="9" ry="3.5" fill="#300606" opacity="0.75" />

              {/* Ultra-Glossy White Highlight */}
              <ellipse cx="45" cy="54" rx="10" ry="5" fill="#ffffff" opacity="0.85" transform="rotate(-28 45 54)" />
              <ellipse cx="43" cy="53" rx="4" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-28 43 53)" />
              <path d="M34 64 C 28 78, 30 96, 38 108" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.4" />

              {/* Bottom-Right Subtler Rim Light */}
              <path d="M102 78 C 108 94, 98 114, 84 124" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}

          {/* 2. ORANGE */}
          {fruit.type === 'orange' && (
            <g>
              {/* Stem & Leaf */}
              <path d="M70 36 L 72 22" stroke="url(#stemGrad)" strokeWidth="4" strokeLinecap="round" />
              <g transform="translate(72, 22) rotate(-32)">
                <path d="M0 0 C 14 -9, 24 -3, 28 8 C 16 13, 4 7, 0 0 Z" fill="url(#leafGrad)" />
                <path d="M0 0 C 14 -2, 22 3, 28 8" fill="none" stroke="#dcfce7" strokeWidth="1" opacity="0.85" />
              </g>

              {/* Sphere Body */}
              <circle cx="70" cy="80" r="46" fill="url(#orangeBody)" />

              {/* Citrus Dimple Texture Details */}
              <circle cx="48" cy="68" r="1.2" fill="#fff" opacity="0.5" />
              <circle cx="86" cy="74" r="1.5" fill="#fff" opacity="0.35" />
              <circle cx="58" cy="98" r="1.2" fill="#fff" opacity="0.3" />
              <circle cx="78" cy="104" r="1.2" fill="#fff" opacity="0.25" />

              {/* Sharp Glossy Highlights */}
              <ellipse cx="46" cy="54" rx="11" ry="5.5" fill="#ffffff" opacity="0.85" transform="rotate(-30 46 54)" />
              <ellipse cx="44" cy="53" rx="4.5" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-30 44 53)" />
              <path d="M34 68 C 28 82, 32 98, 42 110" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.35" />

              {/* Rim Light */}
              <path d="M104 76 C 110 92, 98 112, 84 122" fill="none" stroke="#fed7aa" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}

          {/* 3. GRAPES (Tight Cluster of 8 Small Glossy Spheres) */}
          {fruit.type === 'grapes' && (
            <g>
              {/* Main Twig Stem */}
              <path d="M70 34 C 68 20, 75 14, 77 10" fill="none" stroke="url(#stemGrad)" strokeWidth="4.5" strokeLinecap="round" />
              <g transform="translate(75, 16) rotate(18)">
                <path d="M0 0 C 14 -10, 26 -4, 30 8 C 18 14, 6 8, 0 0 Z" fill="url(#leafGrad)" />
                <path d="M0 0 C 14 -3, 22 2, 30 8" fill="none" stroke="#dcfce7" strokeWidth="1" opacity="0.85" />
              </g>

              {/* 8 Tight Overlapping Glossy Berries */}
              {/* Back Row */}
              <circle cx="52" cy="52" r="16.5" fill="url(#grapeBerry)" />
              <circle cx="88" cy="52" r="16.5" fill="url(#grapeBerry)" />
              {/* Mid Row */}
              <circle cx="38" cy="74" r="17" fill="url(#grapeBerry)" />
              <circle cx="70" cy="72" r="18.5" fill="url(#grapeBerry)" />
              <circle cx="102" cy="74" r="17" fill="url(#grapeBerry)" />
              {/* Front Lower Row */}
              <circle cx="52" cy="96" r="16.5" fill="url(#grapeBerry)" />
              <circle cx="88" cy="96" r="16.5" fill="url(#grapeBerry)" />
              {/* Bottom Tip Berry */}
              <circle cx="70" cy="116" r="15" fill="url(#grapeBerry)" />

              {/* Per-Berry Sharp Mini Highlights */}
              <ellipse cx="46" cy="46" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.8" transform="rotate(-30 46 46)" />
              <ellipse cx="82" cy="46" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.8" transform="rotate(-30 82 46)" />
              <ellipse cx="32" cy="68" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 32 68)" />
              <ellipse cx="64" cy="65" rx="5" ry="2.5" fill="#ffffff" opacity="0.9" transform="rotate(-30 64 65)" />
              <ellipse cx="96" cy="68" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 96 68)" />
              <ellipse cx="46" cy="90" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 46 90)" />
              <ellipse cx="82" cy="90" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 82 90)" />
              <ellipse cx="64" cy="110" rx="4" ry="2" fill="#ffffff" opacity="0.8" transform="rotate(-30 64 110)" />
            </g>
          )}

          {/* 4. LIME / GREEN APPLE */}
          {fruit.type === 'lime' && (
            <g>
              {/* Stem & Leaf */}
              <path d="M70 38 L 72 22" stroke="url(#stemGrad)" strokeWidth="4" strokeLinecap="round" />
              <g transform="translate(72, 22) rotate(-28)">
                <path d="M0 0 C 14 -9, 24 -3, 28 8 C 16 13, 4 7, 0 0 Z" fill="url(#leafGrad)" />
                <path d="M0 0 C 14 -2, 22 3, 28 8" fill="none" stroke="#dcfce7" strokeWidth="1" opacity="0.85" />
              </g>

              {/* Lime Body */}
              <ellipse cx="70" cy="80" rx="46" ry="43" fill="url(#limeBody)" />
              <ellipse cx="70" cy="41" rx="7.5" ry="2.8" fill="#02200e" opacity="0.6" />

              {/* Sharp Glossy Highlights */}
              <ellipse cx="46" cy="54" rx="11" ry="5.5" fill="#ffffff" opacity="0.85" transform="rotate(-28 46 54)" />
              <ellipse cx="44" cy="53" rx="4.5" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-28 44 53)" />
              <path d="M34 66 C 28 80, 32 96, 42 108" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.4" />

              {/* Rim Light */}
              <path d="M104 76 C 110 92, 98 112, 84 122" fill="none" stroke="#bbf7d0" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}

          {/* 5. CHERRY PAIR */}
          {fruit.type === 'cherry' && (
            <g>
              {/* Joined Stems */}
              <path d="M70 16 C 50 33, 46 58, 48 66" fill="none" stroke="url(#stemGrad)" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M70 16 C 88 33, 94 58, 92 66" fill="none" stroke="url(#stemGrad)" strokeWidth="3.5" strokeLinecap="round" />

              {/* Stem Joint Leaf */}
              <g transform="translate(70, 16) rotate(-38)">
                <path d="M0 0 C 12 -7, 20 -2, 24 6 C 14 10, 4 5, 0 0 Z" fill="url(#leafGrad)" />
                <path d="M0 0 C 12 -1, 18 3, 24 6" fill="none" stroke="#dcfce7" strokeWidth="1" opacity="0.85" />
              </g>

              {/* Cherry 1 Left */}
              <circle cx="48" cy="90" r="27" fill="url(#cherryBody)" />
              <ellipse cx="48" cy="65" rx="6.5" ry="2.2" fill="#3b0212" opacity="0.7" />
              <ellipse cx="35" cy="76" rx="6.5" ry="3.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 35 76)" />
              <ellipse cx="34" cy="75" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.95" transform="rotate(-30 34 75)" />

              {/* Cherry 2 Right */}
              <circle cx="92" cy="90" r="27" fill="url(#cherryBody)" />
              <ellipse cx="92" cy="65" rx="6.5" ry="2.2" fill="#3b0212" opacity="0.7" />
              <ellipse cx="79" cy="76" rx="6.5" ry="3.2" fill="#ffffff" opacity="0.85" transform="rotate(-30 79 76)" />
              <ellipse cx="78" cy="75" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.95" transform="rotate(-30 78 75)" />
            </g>
          )}

          {/* 6. PLUM */}
          {fruit.type === 'plum' && (
            <g>
              {/* Stem & Leaf */}
              <path d="M70 34 L 72 20" stroke="url(#stemGrad)" strokeWidth="4" strokeLinecap="round" />
              <g transform="translate(72, 20) rotate(22)">
                <path d="M0 0 C 14 -9, 24 -3, 28 8 C 16 13, 4 7, 0 0 Z" fill="url(#leafGrad)" />
              </g>

              {/* Oval Plum Body */}
              <ellipse cx="70" cy="80" rx="43" ry="47" fill="url(#plumBody)" />
              {/* Seam Crease */}
              <path d="M70 36 C 60 75, 62 105, 70 126" fill="none" stroke="#111038" strokeWidth="3" opacity="0.5" />

              {/* Sharp Glossy Highlights */}
              <ellipse cx="46" cy="54" rx="11" ry="5.5" fill="#ffffff" opacity="0.85" transform="rotate(-30 46 54)" />
              <ellipse cx="44" cy="53" rx="4.5" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-30 44 53)" />
              <path d="M34 66 C 28 80, 32 96, 42 108" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.3" />

              {/* Rim Light */}
              <path d="M104 76 C 110 92, 98 112, 84 122" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}

          {/* 7. LEMON (Oval/Tapered Shape with 4 Faint Dark Texture Lines) */}
          {fruit.type === 'lemon' && (
            <g>
              {/* Stem & Leaf */}
              <path d="M70 32 L 72 18" stroke="url(#stemGrad)" strokeWidth="3.5" strokeLinecap="round" />
              <g transform="translate(72, 18) rotate(-35)">
                <path d="M0 0 C 14 -9, 24 -3, 28 8 C 16 13, 4 7, 0 0 Z" fill="url(#leafGrad)" />
              </g>

              {/* Tapered Lemon Body Path */}
              <path
                d="M70 34 C 104 36, 122 62, 122 80 C 122 98, 104 124, 70 124 C 36 124, 18 98, 18 80 C 18 62, 36 36, 70 34 Z"
                fill="url(#lemonBody)"
              />
              {/* Pointed Lemon Nipple Tips */}
              <circle cx="70" cy="34" r="3.5" fill="#854d0e" />
              <circle cx="70" cy="124" r="3.5" fill="#854d0e" />

              {/* 4 Faint Darker Vertical Texture Lines */}
              <path d="M46 48 Q 40 80 46 110" fill="none" stroke="#422006" strokeWidth="1.2" opacity="0.25" />
              <path d="M60 40 Q 55 80 60 118" fill="none" stroke="#422006" strokeWidth="1.2" opacity="0.2" />
              <path d="M80 40 Q 85 80 80 118" fill="none" stroke="#422006" strokeWidth="1.2" opacity="0.2" />
              <path d="M94 48 Q 100 80 94 110" fill="none" stroke="#422006" strokeWidth="1.2" opacity="0.25" />

              {/* Sharp Glossy Highlight */}
              <ellipse cx="44" cy="54" rx="11" ry="5.5" fill="#ffffff" opacity="0.85" transform="rotate(-30 44 54)" />
              <ellipse cx="42" cy="53" rx="4.5" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-30 42 53)" />
              <path d="M32 66 C 26 80, 30 96, 40 108" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.4" />

              {/* Rim Light */}
              <path d="M102 76 C 108 92, 96 112, 82 120" fill="none" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}

          {/* 8. PEACH (Heart/Sphere Body with Visible Center Crease Line) */}
          {fruit.type === 'peach' && (
            <g>
              {/* Stem & Leaf */}
              <path d="M70 36 L 72 22" stroke="url(#stemGrad)" strokeWidth="4" strokeLinecap="round" />
              <g transform="translate(72, 22) rotate(-26)">
                <path d="M0 0 C 14 -9, 24 -3, 28 8 C 16 13, 4 7, 0 0 Z" fill="url(#leafGrad)" />
              </g>

              {/* Peach Heart/Sphere Body */}
              <path
                d="M70 40 C 52 36, 24 46, 24 78 C 24 114, 52 128, 70 128 C 88 128, 116 114, 116 78 C 116 46, 88 36, 70 40 Z"
                fill="url(#peachBody)"
              />
              {/* Visible Center Crease Line with Dip */}
              <path d="M70 40 C 60 62, 60 102, 70 126" fill="none" stroke="#4c0519" strokeWidth="2.8" opacity="0.45" />

              {/* Sharp Glossy Highlights */}
              <ellipse cx="44" cy="54" rx="11" ry="5.5" fill="#ffffff" opacity="0.85" transform="rotate(-28 44 54)" />
              <ellipse cx="42" cy="53" rx="4.5" ry="2" fill="#ffffff" opacity="0.95" transform="rotate(-28 42 53)" />
              <path d="M32 66 C 26 80, 30 96, 40 108" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.4" />

              {/* Rim Light */}
              <path d="M102 76 C 108 92, 96 112, 82 122" fill="none" stroke="#ffedd5" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>
          )}
        </svg>

        {/* Text Overlay inside Fruit Center */}
        <div className="absolute inset-0 top-3 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {fruit.count}
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] mt-0.5 max-w-[90px] truncate">
            {fruit.label}
          </span>

          {isCenter && (
            <span className="mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-950/90 text-white border border-white/50 flex items-center gap-0.5 shadow-xl animate-pulse">
              <Filter className="w-2.5 h-2.5" /> Filter
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: `radial-gradient(circle at 50% 40%, ${activeFruit.themeGlow} 0%, rgba(15, 23, 42, 0.96) 75%)`,
        transition: 'background 0.6s ease-in-out, border-color 0.6s ease-in-out',
      }}
      className={`border ${activeFruit.borderColor} rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 overflow-hidden relative transition-colors duration-500`}
    >
      {/* Top Ambient Glow Line */}
      <div
        style={{ background: activeFruit.themeGlow }}
        className="absolute top-0 left-0 right-0 h-1 blur-xs transition-colors duration-500"
      />

      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-slate-800/80 ${activeFruit.accentText} border border-slate-700/60 transition-colors duration-500`}>
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              Fruit Orbit Stats
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/80">
                3-Fruit Focus Arc
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Click side fruits to rotate into center • Click center fruit to inspect report
            </p>
          </div>
        </div>

        {/* Orbit Nav Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/80 text-xs font-bold shadow-md cursor-pointer"
            title="Rotate Previous Fruit"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/80 text-xs font-bold shadow-md cursor-pointer"
            title="Rotate Next Fruit"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D ORBIT CAROUSEL STAGE (EXACTLY 3 VISIBLE FRUITS: Left, Center, Right) */}
      <div className="relative w-full h-[240px] sm:h-[280px] flex items-center justify-center select-none py-2 perspective-[1000px]">
        {/* Orbit Elliptical Ring Guide Line */}
        <div
          style={{ borderColor: activeFruit.themeGlow }}
          className="absolute w-[280px] sm:w-[540px] h-[75px] sm:h-[110px] border border-dashed rounded-[50%] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40 transition-colors duration-500"
        />

        {fruits.map((fruit, i) => {
          // Calculate relative circular offset (-4 to +4)
          let offset = (i - safeActiveIndex + fruits.length) % fruits.length;
          if (offset > fruits.length / 2) {
            offset -= fruits.length;
          }

          // STRICT REQUIREMENT: Only Left (-1), Center (0), and Right (+1) are rendered visible!
          if (Math.abs(offset) > 1) {
            return null;
          }

          const isCenter = offset === 0;
          const rx = isMobile ? 120 : 220;
          const translateX = offset * rx;
          const translateY = Math.abs(offset) * 16;
          const scale = isCenter ? 1.25 : 0.82;
          const zIndex = isCenter ? 30 : 10;
          const opacity = isCenter ? 1 : 0.75;
          const rotateY = offset * -18;

          return (
            <div
              key={fruit.id}
              onClick={() => handleFruitClick(i, fruit.reportKey, isCenter)}
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scale}) rotateY(${rotateY}deg)`,
                zIndex,
                opacity,
                transition: 'transform 0.55s cubic-bezier(0.34, 1.45, 0.64, 1), opacity 0.5s ease, z-index 0.5s ease',
              }}
              className={`absolute cursor-pointer touch-none ${
                isCenter ? 'hover:scale-[1.28]' : 'hover:scale-[0.88] hover:opacity-100'
              }`}
              title={isCenter ? `Click to filter report for ${fruit.label}` : `Click to rotate ${fruit.label} to center`}
            >
              {render3DFruitShape(fruit, isCenter)}
            </div>
          );
        })}
      </div>

      {/* Active Stat Quick Summary Bar synced with active fruit theme */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none drop-shadow-sm">{activeFruit.icon}</span>
          <div>
            <span className="text-slate-400 font-bold">Active Centered Metric: </span>
            <span className="text-white font-black">{activeFruit.label}</span>
            <span className={`ml-2 font-mono font-bold ${activeFruit.accentText}`}>
              ({activeFruit.count})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectReport(activeFruit.reportKey)}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer ${activeFruit.btnBg}`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Inspect {activeFruit.label} Report</span>
        </button>
      </div>
    </div>
  );
};
