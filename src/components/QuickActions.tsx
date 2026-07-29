import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import {
  PlusCircle,
  Download,
  Send,
  Upload,
  Filter,
  ChevronDown,
  Layers,
  Activity,
  FileSpreadsheet,
  RefreshCw,
  HelpCircle,
  FileText,
  Printer,
  Sparkles
} from 'lucide-react';

export const QuickActions: React.FC = () => {
  const { setActiveModal, purchaseOrders, showToast } = useERP();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = () => {
    const headers = ['PO ID', 'Supplier', 'Department', 'Location', 'Order Date', 'Delivery Date', 'Purchase Status', 'Receive Status', 'Total Qty', 'Est Cost ($)'];
    const rows = purchaseOrders.map((po) => [
      po.id,
      `"${po.supplier}"`,
      `"${po.department}"`,
      `"${po.location}"`,
      po.orderDate,
      po.deliveryDate,
      po.status,
      po.receiveStatus,
      po.totalQuantity,
      po.totalEstimatedCost.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `RL_Food_PO_Export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📥 CSV Purchase Order dataset exported successfully!');
    setIsExportOpen(false);
  };

  const handlePrint = () => {
    window.print();
    showToast('🖨️ Purchase Orders summary sent to printer.');
    setIsExportOpen(false);
  };

  return (
    <div className="bg-slate-900/95 dark:bg-slate-900 border-b border-slate-800 backdrop-blur-md sticky top-16 z-40 px-4 lg:px-6 py-2.5 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Primary Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          
          {/* + New PO */}
          <button
            onClick={() => setActiveModal('new-po')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-200"
          >
            <PlusCircle size={18} />
            <span>+ New PO</span>
          </button>

          {/* Export Dropdown (Excel, CSV, PDF, Print) */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200"
            >
              <Download size={18} className="text-emerald-400" />
              <span>Export</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isExportOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200 p-1 space-y-1 text-xs">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  <span>Export to CSV / Excel</span>
                </button>
                <button
                  onClick={() => {
                    showToast('📄 PDF Executive Report generated.');
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <FileText size={16} className="text-rose-400" />
                  <span>Export PDF Report</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <Printer size={16} className="text-sky-400" />
                  <span>Print PO Summary</span>
                </button>
              </div>
            )}
          </div>

          {/* Telegram Reports */}
          <button
            onClick={() => setActiveModal('telegram')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200"
          >
            <Send size={18} className="text-sky-400" />
            <span>Telegram</span>
          </button>

          {/* Import */}
          <button
            onClick={() => {
              setActiveModal('import');
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200"
          >
            <Upload size={18} className="text-amber-400" />
            <span>Import</span>
          </button>

          {/* Filters */}
          <button
            onClick={() => showToast('🔍 Filter criteria applied.')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200"
          >
            <Filter size={18} className="text-purple-400" />
            <span>Filters</span>
          </button>

          {/* More ▼ Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200"
            >
              <span>More</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Options */}
            {isMoreOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200 p-1.5 space-y-1">
                <button
                  onClick={() => {
                    setActiveModal('master-sku');
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Layers size={18} className="text-indigo-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white">Master SKU Mapping</span>
                    <span className="text-[10px] text-slate-400">Supplier vs Internal SKUs</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveModal('audit-logs');
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white">Audit Logs</span>
                    <span className="text-[10px] text-slate-400">Timestamped Activity Trail</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveModal('system-test');
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Activity size={18} className="text-amber-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white">System Tests</span>
                    <span className="text-[10px] text-slate-400">Integrations & API Diagnostic</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveModal('setup-guides');
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <HelpCircle size={18} className="text-purple-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white">Setup Guide</span>
                    <span className="text-[10px] text-slate-400">Operational Walkthrough</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveModal('sync-master');
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white transition-colors border-t border-slate-800/80 pt-2"
                >
                  <RefreshCw size={18} className="text-sky-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-white">Sync Master</span>
                    <span className="text-[10px] text-slate-400">Full Cloud Database Re-sync</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Context Tag */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-slate-950/60 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-medium">Facility:</span>
            <span className="text-slate-200 font-semibold">Central Kitchen #1</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/60 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-indigo-300 font-semibold">Live Production Mode</span>
          </div>
        </div>

      </div>
    </div>
  );
};
