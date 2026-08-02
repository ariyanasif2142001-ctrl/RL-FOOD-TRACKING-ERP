import React, { useState } from 'react';
import { PurchaseOrder, POItem, getNormalizedItemStatus, ItemPurchaseStatus } from '../../types';
import { 
  ChevronLeft, ChevronRight, Eye, Printer, Download, FileText, 
  Layers, CheckCircle2, Clock, PauseCircle, PackageX, X, Filter, AlertCircle,
  Calendar, Building2, Tag
} from 'lucide-react';
import { printPurchaseOrderReport } from '../../services/officialPdfService';
import { exportPOsToXLSX } from '../../services/poImportService';

interface AdminPoSliderProps {
  pos: PurchaseOrder[];
}

type FilterCategory = 'all' | 'purchased' | 'partial' | 'balance' | 'hold';

// Fixed 8-color theme palette for PO Cards & matching dynamic stats panel
const CARD_COLOR_PALETTE = [
  {
    bg: 'bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 border-blue-500/50',
    accentText: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    topBar: 'bg-blue-500',
    panelBorder: 'border-blue-500/40',
    panelBg: 'bg-gradient-to-r from-blue-950/25 via-slate-900/90 to-indigo-950/25',
    labelText: 'text-blue-400',
    viewListBtn: 'bg-blue-600 hover:bg-blue-500 border-blue-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-emerald-900/90 via-slate-900 to-teal-950 border-emerald-500/50',
    accentText: 'text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    topBar: 'bg-emerald-500',
    panelBorder: 'border-emerald-500/40',
    panelBg: 'bg-gradient-to-r from-emerald-950/25 via-slate-900/90 to-teal-950/25',
    labelText: 'text-emerald-400',
    viewListBtn: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-purple-900/90 via-slate-900 to-violet-950 border-purple-500/50',
    accentText: 'text-purple-300',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    topBar: 'bg-purple-500',
    panelBorder: 'border-purple-500/40',
    panelBg: 'bg-gradient-to-r from-purple-950/25 via-slate-900/90 to-violet-950/25',
    labelText: 'text-purple-400',
    viewListBtn: 'bg-purple-600 hover:bg-purple-500 border-purple-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-amber-900/90 via-slate-900 to-orange-950 border-amber-500/50',
    accentText: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    topBar: 'bg-amber-500',
    panelBorder: 'border-amber-500/40',
    panelBg: 'bg-gradient-to-r from-amber-950/25 via-slate-900/90 to-orange-950/25',
    labelText: 'text-amber-400',
    viewListBtn: 'bg-amber-600 hover:bg-amber-500 border-amber-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-cyan-900/90 via-slate-900 to-sky-950 border-cyan-500/50',
    accentText: 'text-cyan-300',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    topBar: 'bg-cyan-500',
    panelBorder: 'border-cyan-500/40',
    panelBg: 'bg-gradient-to-r from-cyan-950/25 via-slate-900/90 to-sky-950/25',
    labelText: 'text-cyan-400',
    viewListBtn: 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-rose-900/90 via-slate-900 to-pink-950 border-rose-500/50',
    accentText: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]',
    topBar: 'bg-rose-500',
    panelBorder: 'border-rose-500/40',
    panelBg: 'bg-gradient-to-r from-rose-950/25 via-slate-900/90 to-pink-950/25',
    labelText: 'text-rose-400',
    viewListBtn: 'bg-rose-600 hover:bg-rose-500 border-rose-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 border-indigo-500/50',
    accentText: 'text-indigo-300',
    badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
    topBar: 'bg-indigo-500',
    panelBorder: 'border-indigo-500/40',
    panelBg: 'bg-gradient-to-r from-indigo-950/25 via-slate-900/90 to-slate-950/25',
    labelText: 'text-indigo-400',
    viewListBtn: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50 text-white',
  },
  {
    bg: 'bg-gradient-to-br from-teal-900/90 via-slate-900 to-emerald-950 border-teal-500/50',
    accentText: 'text-teal-300',
    badge: 'bg-teal-500/20 text-teal-200 border-teal-400/40',
    cardGlow: 'shadow-[0_0_30px_rgba(20,184,166,0.3)]',
    topBar: 'bg-teal-500',
    panelBorder: 'border-teal-500/40',
    panelBg: 'bg-gradient-to-r from-teal-950/25 via-slate-900/90 to-emerald-950/25',
    labelText: 'text-teal-400',
    viewListBtn: 'bg-teal-600 hover:bg-teal-500 border-teal-500/50 text-white',
  },
];

export const AdminPoSlider: React.FC<AdminPoSliderProps> = ({ pos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  if (!pos || pos.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-sm font-medium">No Purchase Orders available in the system.</p>
      </div>
    );
  }

  // Ensure valid current index
  const safeIndex = Math.min(Math.max(0, currentIndex), pos.length - 1);
  const currentPo = pos[safeIndex];

  // Active Card Color Theme
  const activeTheme = CARD_COLOR_PALETTE[safeIndex % CARD_COLOR_PALETTE.length];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : pos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < pos.length - 1 ? prev + 1 : 0));
  };

  // Compute status counts for the current PO
  const items: POItem[] = currentPo?.items || [];

  const counts = items.reduce(
    (acc, item) => {
      const status: ItemPurchaseStatus = getNormalizedItemStatus(item);
      acc.total += 1;

      if (status === 'Held' || status === 'Hold') {
        acc.hold += 1;
      } else if (status === 'Purchased') {
        acc.purchased += 1;
      } else if (status === 'Partial Purchased') {
        acc.partial += 1;
      } else {
        acc.balance += 1;
      }

      return acc;
    },
    { total: 0, purchased: 0, partial: 0, balance: 0, hold: 0 }
  );

  const handleOpenDetail = (category: FilterCategory) => {
    setActiveFilter(category);
    setIsDetailOpen(true);
  };

  // Filter items in modal view based on active tab
  const filteredItems = items.filter(item => {
    const status = getNormalizedItemStatus(item);
    if (activeFilter === 'purchased') return status === 'Purchased';
    if (activeFilter === 'partial') return status === 'Partial Purchased';
    if (activeFilter === 'balance') return status === 'Pending';
    if (activeFilter === 'hold') return status === 'Held' || status === 'Hold';
    return true; // 'all'
  });

  const handlePrint = () => {
    if (currentPo) {
      printPurchaseOrderReport(currentPo);
    }
  };

  const handleExcelExport = () => {
    if (currentPo) {
      exportPOsToXLSX([currentPo]);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6 overflow-hidden">
      {/* Slider Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                3D PO Wheel Carousel
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {safeIndex + 1} of {pos.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 3D arc view — Select any PO card or navigate with arrows
            </p>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95 border border-slate-700 shadow-md flex items-center gap-1 text-xs font-bold"
            title="Previous PO"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button
            onClick={handleNext}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95 border border-slate-700 shadow-md flex items-center gap-1 text-xs font-bold"
            title="Next PO"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D CIRCULAR / WHEEL CAROUSEL STAGE */}
      <div 
        className="relative w-full h-[220px] sm:h-[240px] flex items-center justify-center py-2 select-none"
        style={{ perspective: '1200px' }}
      >
        <div 
          className="relative w-full max-w-sm h-full flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {pos.map((po, index) => {
            const offset = index - safeIndex;
            const absOffset = Math.abs(offset);

            // Hide cards beyond 2 range
            if (absOffset > 2) {
              return null;
            }

            const colorTheme = CARD_COLOR_PALETTE[index % CARD_COLOR_PALETTE.length];
            const isCenter = offset === 0;

            // 3D positioning parameters based on angular offset
            let translateX = 0;
            let translateZ = 0;
            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;

            if (offset === 0) {
              translateX = 0;
              translateZ = 70;
              rotateY = 0;
              scale = 1;
              opacity = 1;
              zIndex = 30;
            } else if (offset === -1) {
              translateX = -180;
              translateZ = -40;
              rotateY = 25;
              scale = 0.83;
              opacity = 0.75;
              zIndex = 20;
            } else if (offset === 1) {
              translateX = 180;
              translateZ = -40;
              rotateY = -25;
              scale = 0.83;
              opacity = 0.75;
              zIndex = 20;
            } else if (offset === -2) {
              translateX = -320;
              translateZ = -150;
              rotateY = 40;
              scale = 0.65;
              opacity = 0.4;
              zIndex = 10;
            } else if (offset === 2) {
              translateX = 320;
              translateZ = -150;
              rotateY = -40;
              scale = 0.65;
              opacity = 0.4;
              zIndex = 10;
            }

            const poItemsCount = po.items?.length || 0;

            return (
              <div
                key={po.id || po.poNumber || index}
                onClick={() => setCurrentIndex(index)}
                className={`absolute inset-0 m-auto w-[270px] sm:w-[310px] h-[190px] rounded-2xl border ${colorTheme.bg} ${
                  isCenter ? `${colorTheme.cardGlow} ring-2 ring-white/20` : 'cursor-pointer hover:border-slate-500'
                } p-4 transition-all duration-500 ease-out flex flex-col justify-between overflow-hidden backdrop-blur-md`}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Top Accent Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${colorTheme.topBar}`} />

                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Tag className="w-3.5 h-3.5 opacity-70" />
                      <span>PO Number</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                      #{po.poNumber}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${colorTheme.badge} shrink-0`}>
                    {poItemsCount} {poItemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* Card Info */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold truncate">
                      {po.supplierName || po.customerName || 'Standard Supplier'}
                    </span>
                  </div>

                  {po.orderDate && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span>{po.orderDate}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Status Indicator */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-bold">
                    {isCenter ? 'Active Selected PO' : 'Click to Focus'}
                  </span>
                  <span className={`font-extrabold ${colorTheme.accentText}`}>
                    #{index + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SINGLE ROW STATS BAR (DYNAMIC ACCENT COLOR MATCHING CENTERED PO CARD) */}
      <div className={`space-y-3 p-3.5 sm:p-4 rounded-xl border ${activeTheme.panelBorder} ${activeTheme.panelBg} transition-all duration-500 ease-out backdrop-blur-xs`}>
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <span className={`flex items-center gap-2 ${activeTheme.labelText} transition-colors duration-500`}>
            <span className={`w-2 h-2 rounded-full ${activeTheme.topBar} animate-pulse`} />
            STATISTICS FOR PO #{currentPo.poNumber}
          </span>
          <span className="text-slate-400 font-semibold text-[11px] hidden sm:inline">
            Click any stat to filter item list
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Total Items */}
          <button
            onClick={() => handleOpenDetail('all')}
            className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 transition text-left group"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs font-semibold">
              <span>Total Items</span>
              <Layers className={`w-3.5 h-3.5 ${activeTheme.labelText} transition-colors duration-500`} />
            </div>
            <div className="text-xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">
              {counts.total}
            </div>
          </button>

          {/* Purchased Items */}
          <button
            onClick={() => handleOpenDetail('purchased')}
            className="p-3 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-800/40 hover:border-emerald-700/60 transition text-left group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>Purchased</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300 mt-1 group-hover:scale-105 transition-transform origin-left">
              {counts.purchased}
            </div>
          </button>

          {/* Partial Items */}
          <button
            onClick={() => handleOpenDetail('partial')}
            className="p-3 rounded-xl bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/40 hover:border-amber-700/60 transition text-left group"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span>Partial</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300 mt-1 group-hover:scale-105 transition-transform origin-left">
              {counts.partial}
            </div>
          </button>

          {/* Balance Items */}
          <button
            onClick={() => handleOpenDetail('balance')}
            className="p-3 rounded-xl bg-sky-950/30 hover:bg-sky-950/50 border border-sky-800/40 hover:border-sky-700/60 transition text-left group"
          >
            <div className="flex items-center justify-between text-sky-400 text-xs font-semibold">
              <span>Balance</span>
              <PackageX className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-black text-sky-300 mt-1 group-hover:scale-105 transition-transform origin-left">
              {counts.balance}
            </div>
          </button>

          {/* Hold Items */}
          <button
            onClick={() => handleOpenDetail('hold')}
            className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 hover:border-rose-700/60 transition text-left group"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
              <span>On Hold</span>
              <PauseCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-300 mt-1 group-hover:scale-105 transition-transform origin-left">
              {counts.hold}
            </div>
          </button>

          {/* View List Button */}
          <button
            onClick={() => handleOpenDetail('all')}
            className={`p-3 rounded-xl ${activeTheme.viewListBtn} font-bold transition-all duration-500 ease-out flex flex-col justify-between active:scale-95 shadow-md group`}
          >
            <div className="flex items-center justify-between text-xs font-semibold w-full">
              <span>View List</span>
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-normal mt-1 text-left flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Inspect All</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* DETAIL MODAL PANEL */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    PO #{currentPo.poNumber} — Item List
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supplier: {currentPo.supplierName || currentPo.customerName || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Action Buttons */}
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Print Report</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  title="Save PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Save PDF</span>
                </button>

                <button
                  onClick={handleExcelExport}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-xs font-bold text-emerald-300 border border-emerald-800 transition flex items-center gap-1.5"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Excel</span>
                </button>

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-xs font-bold">
              <span className="text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                All ({counts.total})
              </button>
              <button
                onClick={() => setActiveFilter('purchased')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeFilter === 'purchased'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                Purchased ({counts.purchased})
              </button>
              <button
                onClick={() => setActiveFilter('partial')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeFilter === 'partial'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                Partial ({counts.partial})
              </button>
              <button
                onClick={() => setActiveFilter('balance')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeFilter === 'balance'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                Balance ({counts.balance})
              </button>
              <button
                onClick={() => setActiveFilter('hold')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeFilter === 'hold'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                On Hold ({counts.hold})
              </button>
            </div>

            {/* Modal Body: Table of items */}
            <div className="p-5 overflow-y-auto flex-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">No items found for category "{activeFilter}".</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">SL #</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-right">Order Qty</th>
                        <th className="py-2.5 px-3 text-right">Purchased</th>
                        <th className="py-2.5 px-3 text-right">Remaining</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredItems.map((item, idx) => {
                        const status = getNormalizedItemStatus(item);
                        const isHeld = status === 'Held' || status === 'Hold';
                        const reqQty = item.requestedQty || item.orderedQty || 0;
                        const purchasedQty = item.purchasedQty || 0;
                        const remaining = Math.max(0, reqQty - purchasedQty);

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {item.slNumber || idx + 1}
                            </td>
                            <td className="py-2.5 px-3 text-white font-semibold max-w-xs truncate">
                              {item.itemName}
                              {item.brand && <span className="text-slate-500 text-[10px] ml-1.5">({item.brand})</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300 font-bold">
                              {reqQty} {item.unit || 'PCS'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              {purchasedQty}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                              {remaining}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isHeld ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Hold ({item.holdByName || item.holdBy || 'Purchaser'})
                                </span>
                              ) : status === 'Purchased' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Purchased
                                </span>
                              ) : status === 'Partial Purchased' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Partial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Showing {filteredItems.length} of {items.length} total items in PO #{currentPo.poNumber}
              </span>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
