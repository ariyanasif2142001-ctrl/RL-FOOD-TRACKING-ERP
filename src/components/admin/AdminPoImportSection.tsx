import React, { useState, useRef } from 'react';
import { PurchaseOrder, ImportPreviewAnalysis, ImportExecutionResult } from '../../types';
import { 
  parsePOFile, 
  parsePOText, 
  validateAndAnalyzePOImport, 
  executePOImport, 
  downloadSampleXLSXTemplate, 
  downloadLargeScaleSampleXLSXTemplate, 
  exportPOsToXLSX 
} from '../../services/poImportService';
import { FileSpreadsheet, Upload, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdminPoImportSectionProps {
  pos: PurchaseOrder[];
  onImportPOs: (newPOs: PurchaseOrder[]) => void;
}

export const AdminPoImportSection: React.FC<AdminPoImportSectionProps> = ({ pos, onImportPOs }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawCsvText, setRawCsvText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<ImportPreviewAnalysis | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [importPage, setImportPage] = useState(1);
  const [importFilterType, setImportFilterType] = useState<'all' | 'errors'>('all');

  // File analysis
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setImportResult(null);
    setIsProcessing(true);

    const { rows, parseError: err } = await parsePOFile(file);
    setIsProcessing(false);

    if (err) {
      setParseError(err);
      setPreviewAnalysis(null);
      return;
    }

    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Text paste analysis
  const handleAnalyzeText = () => {
    if (!rawCsvText.trim()) {
      setParseError('Please enter Excel / CSV text data before analyzing.');
      return;
    }

    setParseError(null);
    setImportResult(null);
    setIsProcessing(true);

    const { rows, parseError: err } = parsePOText(rawCsvText);
    setIsProcessing(false);

    if (err) {
      setParseError(err);
      setPreviewAnalysis(null);
      return;
    }

    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Sample data load
  const handleLoadSampleData = () => {
    const sampleText = `ORDER DATE\tLOCATION\tPO NUMBER\tDEPARTMENT\tSL NUMBER\tITEM NAME\tBRAND\tUNIT\tQTY\tDELIVERY DATE
2026-07-22\tCentral Hub Bay 1\tPO-2026-101\tFresh Produce\t1\tOrganic Fresh Tomatoes\tAgriFresh\tkg\t150\t2026-07-23
2026-07-22\tCentral Hub Bay 1\tPO-2026-101\tFresh Produce\t2\tRed Bell Peppers\tAgriFresh\tkg\t80\t2026-07-23
2026-07-22\tCold Storage A\tPO-2026-102\tMeats & Frozen\t1\tFresh Chicken Breast\tPrime Poultry\tkg\t120\t2026-07-22
2026-07-22\tCold Storage A\tPO-2026-102\tMeats & Frozen\t2\tBeef Ribeye Cuts\tPrime Poultry\tkg\t45\t2026-07-22`;
    setRawCsvText(sampleText);
    setSelectedFile(null);
    setParseError(null);
    setImportResult(null);

    const { rows } = parsePOText(sampleText);
    const analysis = validateAndAnalyzePOImport(rows, pos);
    setPreviewAnalysis(analysis);
  };

  // Final Import
  const handleExecuteFinalImport = async () => {
    if (!previewAnalysis || previewAnalysis.errors.some(e => e.severity === 'error')) {
      return;
    }

    const currentAnalysis = previewAnalysis;

    setIsProcessing(true);
    const res = await executePOImport(currentAnalysis.parsedRows, pos);
    setIsProcessing(false);

    setImportResult(res);
    setPreviewAnalysis(null);
    setSelectedFile(null);
    setRawCsvText('');

    // Trigger API import to backend and update local/global state
    if (res.updatedPOs && res.updatedPOs.length > 0) {
      onImportPOs(res.updatedPOs);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">Purchase Order Excel (.xlsx) / CSV Bulk Importer</h2>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-black rounded-full uppercase tracking-wider border border-purple-200">
                ⚡ 1,000+ Items Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">High-speed batch import for large datasets with duplicate merging, automatic field correction, and instant audit tracking.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadSampleXLSXTemplate()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              title="Download basic sample template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              Basic Template
            </button>
            <button
              type="button"
              onClick={() => downloadLargeScaleSampleXLSXTemplate(1000)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              title="Download 1,000 items sample template to test large scale bulk import"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700" />
              ⚡ 1,000+ Bulk Sample
            </button>
            <button
              type="button"
              onClick={() => exportPOsToXLSX(pos)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              title="Export all current POs to Excel file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export POs (.xlsx)
            </button>
          </div>
        </div>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-purple-200 hover:border-purple-600 rounded-xl p-6 text-center bg-purple-50/20 hover:bg-purple-50/60 cursor-pointer transition group"
        >
          <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-black text-slate-800">Click to upload or drag & drop Excel / CSV file</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Supports 1,000+ items per file (.xlsx, .xls, .csv, .tsv)</p>
          {selectedFile && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-xs font-bold border border-purple-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-800" />
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Or Paste Raw Excel Data / CSV Text:</label>
            <button onClick={handleLoadSampleData} className="text-xs text-purple-700 font-bold hover:underline cursor-pointer">
              Load Quick Sample Text
            </button>
          </div>
          <textarea
            rows={3}
            value={rawCsvText}
            onChange={(e) => setRawCsvText(e.target.value)}
            placeholder="Paste rows copied directly from Excel spreadsheet (supports tab or comma delimited)..."
            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:border-purple-500 outline-none transition"
          />
          <button
            onClick={handleAnalyzeText}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-900 hover:bg-purple-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                Analyzing 1,000+ Rows...
              </>
            ) : (
              'Analyze PO Rows'
            )}
          </button>
        </div>

        {parseError && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold border border-rose-200 flex items-start gap-2">
            <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{parseError}</div>
          </div>
        )}
      </div>

      {/* PREVIEW & ANALYSIS MODAL / PANEL */}
      {previewAnalysis && (() => {
        const hasErrors = previewAnalysis.errors.some(e => e.severity === 'error');
        const parsedRows = previewAnalysis.parsedRows || [];
        
        // Search & filter items
        const filteredRows = parsedRows.filter(r => {
          const matchesSearch = !importSearchQuery || 
            r.poNumber.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
            r.itemName.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
            r.department.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
            r.location.toLowerCase().includes(importSearchQuery.toLowerCase());
          
          if (importFilterType === 'errors') {
            const isErrorRow = previewAnalysis.errors.some(e => e.rowIndex === r.rowIndex);
            return matchesSearch && isErrorRow;
          }
          return matchesSearch;
        });

        const pageSize = 25;
        const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
        const safePage = Math.min(importPage, totalPages);
        const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

        return (
          <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>Import Analysis & Data Preview</span>
                  <span className="text-xs font-bold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                    {previewAnalysis.totalRows.toLocaleString()} Rows
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified {previewAnalysis.totalPOs} Purchase Orders across {previewAnalysis.totalRows} item rows.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPreviewAnalysis(null)} 
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExecuteFinalImport} 
                  disabled={hasErrors || isProcessing}
                  className="px-5 py-2 bg-purple-900 hover:bg-purple-950 disabled:opacity-40 text-white text-xs font-black rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importing 1,000+ Items...
                    </>
                  ) : (
                    `Execute Bulk Import (${previewAnalysis.totalRows.toLocaleString()} Items)`
                  )}
                </button>
              </div>
            </div>

            {/* METRICS CARDS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Rows</span>
                <span className="text-base font-black text-slate-900">{previewAnalysis.totalRows.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Total POs</span>
                <span className="text-base font-black text-purple-950">{previewAnalysis.totalPOs.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">New POs</span>
                <span className="text-base font-black text-emerald-950">{previewAnalysis.newPOsCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Existing Merges</span>
                <span className="text-base font-black text-amber-950">{previewAnalysis.duplicatePOsCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Valid Rows</span>
                <span className="text-base font-black text-blue-950">{previewAnalysis.validRowsCount.toLocaleString()}</span>
              </div>
              <div className={`p-2.5 border rounded-lg ${previewAnalysis.invalidRowsCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider block">Error Rows</span>
                <span className="text-base font-black">{previewAnalysis.invalidRowsCount.toLocaleString()}</span>
              </div>
            </div>

            {/* WARNINGS & ERROR MESSAGES */}
            {previewAnalysis.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Merge & Update Notices ({previewAnalysis.warnings.length}):
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                  {previewAnalysis.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewAnalysis.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-rose-950">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  Validation Errors Detected ({previewAnalysis.errors.length}):
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] max-h-28 overflow-y-auto font-mono">
                  {previewAnalysis.errors.map((err, i) => (
                    <li key={i} className="text-rose-800">{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* SEARCH & FILTER CONTROLS FOR TABLE */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={importSearchQuery}
                  onChange={(e) => { setImportSearchQuery(e.target.value); setImportPage(1); }}
                  placeholder="Search parsed items by PO, Item, Department..."
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-purple-500 outline-none flex-1 max-w-sm"
                />
                <button
                  onClick={() => setImportFilterType('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${importFilterType === 'all' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                >
                  All ({parsedRows.length})
                </button>
                {previewAnalysis.invalidRowsCount > 0 && (
                  <button
                    onClick={() => setImportFilterType('errors')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${importFilterType === 'errors' ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-800 border-rose-200'}`}
                  >
                    Errors ({previewAnalysis.invalidRowsCount})
                  </button>
                )}
              </div>
              
              {/* PAGINATION NUMBERS */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium self-end sm:self-auto">
                <span>Page {safePage} of {totalPages} ({filteredRows.length} items)</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setImportPage(p => Math.max(1, p - 1))}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded font-bold border border-slate-200 transition cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setImportPage(p => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded font-bold border border-slate-200 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* PAGINATED PARSED ITEMS TABLE */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-2 border-r border-slate-200 w-12 text-center">Row</th>
                    <th className="p-2 border-r border-slate-200 font-mono">PO Number</th>
                    <th className="p-2 border-r border-slate-200">Department</th>
                    <th className="p-2 border-r border-slate-200">Item Name</th>
                    <th className="p-2 border-r border-slate-200">Brand</th>
                    <th className="p-2 border-r border-slate-200">Unit</th>
                    <th className="p-2 border-r border-slate-200 text-right">Qty</th>
                    <th className="p-2">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pagedRows.map((r) => (
                    <tr key={r.rowIndex} className="hover:bg-purple-50/40 transition">
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-400 text-[11px]">{r.rowIndex}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-purple-900">{r.poNumber}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">{r.department}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.itemName}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{r.brand}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{r.unit}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">{r.qty}</td>
                      <td className="p-2 text-slate-600 truncate max-w-[150px]">{r.location}</td>
                    </tr>
                  ))}
                  {pagedRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                        No matching items found for query "{importSearchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* IMPORT EXECUTION RESULT CARD */}
      {importResult && (
        <div className="p-4 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="font-extrabold text-emerald-900 text-sm">Bulk Import Executed Successfully</h4>
            </div>
            {importResult.timeTakenMs && (
              <span className="text-[11px] font-mono font-bold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full">
                ⚡ {importResult.timeTakenMs} ms
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/80 p-2 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold block">New POs Created</span>
              <span className="text-base font-black text-emerald-950">{importResult.totalPOsImported}</span>
            </div>
            <div className="bg-white/80 p-2 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold block">POs Updated</span>
              <span className="text-base font-black text-emerald-950">{importResult.totalPOsUpdated}</span>
            </div>
            <div className="bg-white/80 p-2 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold block">New Items Added</span>
              <span className="text-base font-black text-emerald-950">{importResult.totalItemsImported}</span>
            </div>
            <div className="bg-white/80 p-2 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold block">Items Quantities Updated</span>
              <span className="text-base font-black text-emerald-950">{importResult.totalItemsUpdated}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
