import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Link as LinkIcon, Plus, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet, Edit2, Search, Download, Copy, Check } from 'lucide-react';
import { MasterSKUEntry } from '../types';
import { getMasterSKUMappings, saveMasterSKUMappings, getMasterSKUSheetUrl, fetchAndSyncMasterSKUsFromUrl, extractSKUsFromWorkbook } from '../services/skuService';
import * as XLSX from 'xlsx';

interface MasterSkuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const MasterSkuModal: React.FC<MasterSkuModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [mappings, setMappings] = useState<MasterSKUEntry[]>([]);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSheetName, setActiveSheetName] = useState<string>('MASTAR DATA');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Editing state
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newEntry, setNewEntry] = useState<Partial<MasterSKUEntry>>({
    customerItemName: '',
    customerItemCode: '',
    internalSKU: '',
    internalItemName: '',
    internalUnit: 'PCS',
    category: 'General'
  });

  useEffect(() => {
    const reload = () => {
      const current = getMasterSKUMappings();
      setMappings(current);
      setSheetUrl(getMasterSKUSheetUrl());
      if (current.length > 0 && current[0].sheetName) {
        setActiveSheetName(current[0].sheetName);
      }
    };

    if (isOpen) {
      reload();
      window.addEventListener('master_sku_updated', reload);
    }
    return () => {
      window.removeEventListener('master_sku_updated', reload);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncLink = async (preferredSheet?: string) => {
    if (!sheetUrl.trim()) {
      setSyncMessage({ text: 'Please enter a Dropbox or Google Sheets URL', type: 'error' });
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);
    const result = await fetchAndSyncMasterSKUsFromUrl(sheetUrl, preferredSheet || activeSheetName);
    setIsSyncing(false);
    if (result.success) {
      const fresh = getMasterSKUMappings();
      setMappings(fresh);
      if (result.targetSheetName) setActiveSheetName(result.targetSheetName);
      if (result.availableSheets) setAvailableSheets(result.availableSheets);
      setSyncMessage({ text: result.message, type: 'success' });
      if (onUpdated) onUpdated();
    } else {
      setSyncMessage({ text: result.message, type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSyncing(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      const { targetSheetName, availableSheets: sheets, entries } = extractSKUsFromWorkbook(workbook);

      if (entries.length > 0) {
        saveMasterSKUMappings(entries);
        setMappings(entries);
        setActiveSheetName(targetSheetName);
        setAvailableSheets(sheets);
        setSyncMessage({ 
          text: `Successfully imported ${entries.length} Master SKUs from '${file.name}' (Sheet: ${targetSheetName})!`, 
          type: 'success' 
        });
        if (onUpdated) onUpdated();
      } else {
        throw new Error('No valid SKU mappings found');
      }
    } catch (err: any) {
      setSyncMessage({ text: `Failed to import file: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (mappings.length === 0) return;
    const header = ['SL NO', 'New Desc', 'Unit', 'SKU NAME', 'NAME', 'cost price', 'Fix Selling price 2026'];
    const rows = mappings.map(m => [
      m.slNo || '',
      `"${(m.customerItemName || m.internalItemName || '').replace(/"/g, '""')}"`,
      m.internalUnit || 'PCS',
      m.internalSKU || '',
      m.assignedTo || '',
      m.costPrice || '',
      m.sellingPrice || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_SKU_${activeSheetName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySKUs = () => {
    if (mappings.length === 0) return;
    const textList = mappings.map(m => `${m.internalSKU}\t${m.customerItemName || m.internalItemName}\t${m.internalUnit}`).join('\n');
    navigator.clipboard.writeText(textList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEntry = () => {
    if (!newEntry.customerItemName || !newEntry.internalSKU || !newEntry.internalItemName) {
      alert('Please fill in Customer Item Name, Internal SKU, and Internal Item Name');
      return;
    }

    const entry: MasterSKUEntry = {
      id: `sku-custom-${Date.now()}`,
      customerItemName: newEntry.customerItemName.trim(),
      customerItemCode: (newEntry.customerItemCode || '').trim(),
      internalSKU: newEntry.internalSKU.trim(),
      internalItemName: newEntry.internalItemName.trim(),
      internalUnit: (newEntry.internalUnit || 'PCS').trim().toUpperCase(),
      category: newEntry.category || 'General',
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    const updated = [entry, ...mappings];
    setMappings(updated);
    saveMasterSKUMappings(updated);
    setIsAdding(false);
    setNewEntry({ customerItemName: '', customerItemCode: '', internalSKU: '', internalItemName: '', internalUnit: 'PCS', category: 'General' });
    if (onUpdated) onUpdated();
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this SKU mapping?')) {
      const updated = mappings.filter(m => m.id !== id);
      setMappings(updated);
      saveMasterSKUMappings(updated);
      if (onUpdated) onUpdated();
    }
  };

  const filteredMappings = mappings.filter(m =>
    m.customerItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.internalItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.internalSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.customerItemCode && m.customerItemCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-slate-100">
                  Master SKU & Excel Database Manager
                </h3>
                <span className="bg-pink-500/20 text-pink-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30">
                  {activeSheetName} Sheet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sync & manage SKU Mappings (`MASTAR DATA` sheet - SKU NAME, New Desc, Unit, Cost & Selling Prices)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Status Message */}
          {syncMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-sm ${
              syncMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{syncMessage.text}</span>
            </div>
          )}

          {/* Dropbox / Web URL Auto Sync Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Dropbox Auto-Sync URL (`sku_file.xlsx`)
                </h4>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                Auto-Parses `MASTAR DATA` Sheet
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                placeholder="https://www.dropbox.com/s/sample/sku_file.xlsx?dl=0"
                className="flex-1 text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => handleSyncLink()}
                disabled={isSyncing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Paste your Dropbox sharing link or Google Sheet CSV export link. The system will auto-fetch and load all SKUs from the <strong className="text-slate-800">MASTAR DATA</strong> sheet tab.
            </p>
          </div>

          {/* Local File Upload & Sheet Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-1">
                Upload Local Excel File (`sku_file.xlsx`)
              </h4>
              <p className="text-[11px] text-slate-500">
                Upload `.xlsx` or `.csv` files directly to import SKU mappings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {availableSheets.length > 0 && (
                <select
                  value={activeSheetName}
                  onChange={e => handleSyncLink(e.target.value)}
                  className="text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
                >
                  {availableSheets.map((s, idx) => (
                    <option key={`${s}-${idx}`} value={s}>
                      Sheet: {s} {s.toUpperCase().includes('MASTAR') ? '★ Recommended' : ''}
                    </option>
                  ))}
                </select>
              )}

              <label className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 transition shadow-sm shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Choose Excel File</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Add Manual Mapping Toggle */}
          {!isAdding ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom SKU Entry</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySKUs}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
                  title="Copy SKU list to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copied!' : 'Copy SKU List'}</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-emerald-200 cursor-pointer"
                  title="Export MASTAR DATA sheet as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
              <h4 className="font-bold text-xs text-amber-900">Add New Master SKU</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">New Desc (Item Description)</label>
                  <input
                    type="text"
                    value={newEntry.customerItemName || ''}
                    onChange={e => setNewEntry({ ...newEntry, customerItemName: e.target.value, internalItemName: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    placeholder="e.g. AL KABEER CHICKEN SAMOSAS 1200 GM"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">SKU NAME (Code)</label>
                  <input
                    type="text"
                    value={newEntry.internalSKU || ''}
                    onChange={e => setNewEntry({ ...newEntry, internalSKU: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    placeholder="e.g. LP005167"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newEntry.internalUnit || 'PCS'}
                    onChange={e => setNewEntry({ ...newEntry, internalUnit: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    placeholder="e.g. PCS / KG / TRAY"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow"
                >
                  Save Mapping
                </button>
              </div>
            </div>
          )}

          {/* Search & List Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-800">
                  MASTAR DATA Database ({filteredMappings.length} Items)
                </h4>
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-medium">
                  Sheet: {activeSheetName}
                </span>
              </div>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search SKU name, Desc, SL NO..."
                  className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800">
                    <th className="p-2.5 w-16 text-center">SL NO</th>
                    <th className="p-2.5">Item Description (New Desc)</th>
                    <th className="p-2.5 text-center">Unit</th>
                    <th className="p-2.5">SKU NAME</th>
                    <th className="p-2.5">NAME (Assigned)</th>
                    <th className="p-2.5 text-right">Cost Price</th>
                    <th className="p-2.5 text-right">Fix Selling 2026</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No Master SKU mappings found. Upload `sku_file.xlsx` or sync via Dropbox above.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((entry, idx) => (
                      <tr key={entry.id ? `${entry.id}-${idx}` : `sku-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-mono text-slate-500 font-bold">
                          {entry.slNo || '-'}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{entry.customerItemName || entry.internalItemName}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {entry.internalUnit}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-indigo-700">
                          {entry.internalSKU}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-600">
                          {entry.assignedTo ? (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                              {entry.assignedTo}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                          {entry.costPrice ? `${Number(entry.costPrice).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {entry.sellingPrice ? `${Number(entry.sellingPrice).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-500 font-medium">
            Total {mappings.length} items loaded from sheet <strong className="text-slate-800">{activeSheetName}</strong>.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
};
