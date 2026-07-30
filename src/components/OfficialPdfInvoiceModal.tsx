import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PurchaseOrder } from '../types';
import { printOfficialRLDeliveryNote, generateOfficialRLDeliveryNoteHtml } from '../services/officialPdfService';

interface OfficialPdfInvoiceModalProps {
  po: PurchaseOrder;
  onClose: () => void;
}

export const OfficialPdfInvoiceModal: React.FC<OfficialPdfInvoiceModalProps> = ({ po, onClose }) => {
  const [recipientName, setRecipientName] = useState<string>('CPPA Authorized Receiver');
  const [dnNumber, setDnNumber] = useState<string>(`${po.poNumber.replace(/^PO-?/i, '')}-DN`);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    po.deliveryDate || new Date().toISOString().split('T')[0]
  );
  const [companyName, setCompanyName] = useState<string>('C P P A');
  const [companySubtext, setCompanySubtext] = useState<string>('الشؤون الخاصة لسمو ولي العهد');
  const [poNumber, setPoNumber] = useState<string>(po.poNumber);
  const [department, setDepartment] = useState<string>(po.department || 'WH');
  const [location, setLocation] = useState<string>(po.location || 'ADF');
  const [includePrices, setIncludePrices] = useState<boolean>(false);
  const [displayNameMode, setDisplayNameMode] = useState<'internal' | 'customer' | 'dual'>('internal');

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Royal blue ink signature
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl('');
  };

  const handlePrint = () => {
    printOfficialRLDeliveryNote(po, {
      recipientName,
      signatureDataUrl,
      dnNumber,
      deliveryDate: new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      companyName,
      companySubtext,
      poNumber,
      department,
      location,
      includePrices,
      displayNameMode
    });
  };

  const items = po.items || [];
  let subTotal = 0;
  items.forEach(item => {
    const qty = item.warehouseQty || item.purchasedQty || item.requestedQty || item.orderedQty || 1;
    const unitPrice = item.unitPrice || (item.estimatedPrice ? item.estimatedPrice / Math.max(1, qty) : 65.00);
    subTotal += qty * unitPrice;
  });
  const vatAmount = subTotal * 0.15;
  const grandTotal = subTotal + vatAmount;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
        
        {/* Modal Top Navigation Bar */}
        <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-lg">
              RL
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Official RL Food Delivery Note / Invoice</h3>
              <p className="text-xs text-slate-400">PO: <span className="font-mono text-emerald-400 font-bold">{po.poNumber}</span> | RADIANT LIGHTNING Premium Pad</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">

          {/* Configuration Inputs & Digital Signature Control Panel */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>✍️</span> Interactive Delivery Note Header Setup & Digital Signature
            </h4>

            {/* Editable Header Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">COMPANY Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. C P P A"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">COMPANY Subtext (Arabic)</label>
                <input
                  type="text"
                  value={companySubtext}
                  onChange={e => setCompanySubtext(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-serif"
                  placeholder="الشؤون الخاصة لسمو ولي العهد"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">DN NUMBER</label>
                <input
                  type="text"
                  value={dnNumber}
                  onChange={e => setDnNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. 5555-07-2026-DN"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">DELIVERY DATE</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">PO NUMBER</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. PO-5555-07-2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">DEPARTMENT</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. WH"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">LOCATION</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. ADF"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  placeholder="e.g. CPPA Authorized Receiver"
                />
              </div>
            </div>

            {/* Price Column & Financial Totals & Display Name Mode Toggle */}
            <div className="space-y-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includePricesToggle"
                    checked={includePrices}
                    onChange={e => setIncludePrices(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="includePricesToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Show Unit Price & Total Amount columns (ডেলিভারি নোটে মূল্য প্রদর্শন করুন)
                  </label>
                </div>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${includePrices ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {includePrices ? 'Prices & Totals Enabled' : 'No Prices (Standard Delivery Note)'}
                </span>
              </div>

              {/* Display Name Option Toggle */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Item Name Display Format (আইটেমের নাম ও ইউনিট ফরম্যাট):
                </span>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
                  <button
                    onClick={() => setDisplayNameMode('internal')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      displayNameMode === 'internal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Internal Stock SKU
                  </button>
                  <button
                    onClick={() => setDisplayNameMode('customer')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      displayNameMode === 'customer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Customer PO Name
                  </button>
                  <button
                    onClick={() => setDisplayNameMode('dual')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      displayNameMode === 'dual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Dual (Both)
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Signature Box */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-800">Draw Digital Signature (ডিজিটাল স্বাক্ষর দিন)</span>
                <span className="text-[11px] text-slate-500">Draw directly with finger or mouse on canvas below:</span>
              </div>
              <div className="flex items-center gap-2">
                <canvas
                  ref={canvasRef}
                  width={220}
                  height={60}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-crosshair shadow-inner"
                />
                <button
                  onClick={clearSignature}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300"
                  title="Clear signature pad"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* EXACT PREVIEW PAD (MATCHES ATTACHED IMAGE) */}
          <div className="bg-white p-8 rounded-xl border border-slate-300 shadow-md font-sans text-slate-900 space-y-6">
            
            {/* Header section (Radiant Lightning + RL Emblem) */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wider text-slate-900 uppercase">
                  RADIANT LIGHTNING
                </h1>
                <div className="bg-[#769d24] text-white px-4 py-0.5 rounded-md font-serif italic text-sm inline-block mt-1 font-bold">
                  Premium Food Supply
                </div>
              </div>

              {/* RL emblem logo */}
              <div className="relative flex items-center pr-3">
                <span className="text-5xl font-black text-slate-800 font-sans tracking-tighter leading-none">RL</span>
                <svg className="absolute -top-1 -right-3 w-8 h-8 text-[#769d24]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17,8C15,4 10,4 10,4C10,4 10,9 14,11C15.6,11.8 17.5,11.5 19,10.5C20.5,9.5 21,7 21,7C21,7 19,7.5 17,8Z"/>
                  <path d="M12,12C9,10 5,11 5,11C5,11 7,15 10,16C11.5,16.5 13.2,16 14.5,15C15.8,14 16,12 16,12C16,12 14,12.5 12,12Z"/>
                </svg>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center pt-2">
              <h2 className="text-base font-black tracking-widest text-black uppercase border-b-2 border-black inline-block pb-1">
                DELIVERY NOTE
              </h2>
            </div>

            {/* Metadata boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {/* Left Box */}
              <div className="border-2 border-black rounded-xl p-3 flex flex-col justify-center min-h-[90px]">
                <div className="text-slate-800 uppercase tracking-wider text-[11px]">COMPANY</div>
                <div className="text-slate-950 font-black text-sm">{companyName}</div>
                <div className="text-right text-xs font-serif font-bold pt-1">{companySubtext}</div>
              </div>

              {/* Right Box */}
              <div className="border-2 border-black rounded-xl p-3 flex flex-col justify-center min-h-[90px]">
                <div className="grid grid-cols-[100px_10px_1fr] gap-y-1 text-slate-900 text-[11px]">
                  <span>DN NUMBER</span><span>:</span><span className="font-mono">{dnNumber}</span>
                  <span>DELIVERY DATE</span><span>:</span><span>{new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>PO NUMBER</span><span>:</span><span className="font-mono font-black">{poNumber}</span>
                  <span>DEPARTMENT</span><span>:</span><span>{department}</span>
                  <span>LOCATION</span><span>:</span><span>{location}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-2 border-black rounded-none">
              <table className="w-full text-xs text-slate-900 border-collapse">
                <thead>
                  <tr className="bg-slate-300 border-b-2 border-black text-center font-bold text-[10px]">
                    <th className="border border-black p-1.5 w-12">
                      <div>SL No.</div>
                      <div className="text-[10px]">رقم</div>
                    </th>
                    <th className="border border-black p-1.5 w-16">PO SEQ NO.</th>
                    <th className="border border-black p-1.5 w-24">SKU</th>
                    <th className="border border-black p-1.5 text-left px-3">
                      <div className="flex justify-between">
                        <span>DESCRIPTION</span>
                        <span className="text-[10px]">وصف</span>
                      </div>
                    </th>
                    <th className="border border-black p-1.5 w-16">
                      <div>UOP</div>
                      <div className="text-[10px]">وحدة</div>
                    </th>
                    <th className="border border-black p-1.5 w-14">
                      <div>QTY</div>
                      <div className="text-[10px]">الكمية</div>
                    </th>
                    {includePrices && (
                      <>
                        <th className="border border-black p-1.5 w-20 text-right pr-2">UNIT PRICE</th>
                        <th className="border border-black p-1.5 w-24 text-right pr-2">TOTAL</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const qty = item.warehouseQty || item.purchasedQty || item.requestedQty || item.orderedQty || 1;
                    const unitPrice = item.unitPrice || (item.estimatedPrice ? item.estimatedPrice / Math.max(1, qty) : 65.00);
                    const lineTotal = qty * unitPrice;

                    let displayedName = item.internalItemName || item.itemName;
                    let displayedUnit = (item.internalUnit || item.unit || 'PCS').toUpperCase();
                    let sku = item.internalItemCode || item.sku || `IP00${780 + idx}`;

                    if (displayNameMode === 'customer') {
                      displayedName = item.customerItemName || item.itemName;
                      displayedUnit = (item.customerUnit || item.unit || 'PCS').toUpperCase();
                      sku = item.customerItemCode || item.sku || `KT${100400 + idx}`;
                    }

                    return (
                      <tr key={item.id ? `${item.id}-${idx}` : `inv-item-${idx}`} className="border-b border-black text-center font-bold">
                        <td className="border border-black p-2">{idx + 1}</td>
                        <td className="border border-black p-2">{125 + idx}</td>
                        <td className="border border-black p-2 font-mono text-[11px]">{sku}</td>
                        <td className="border border-black p-2 text-left px-3 uppercase">
                          {displayNameMode === 'dual' ? (
                            <div>
                              <div>{item.customerItemName || item.itemName}</div>
                              <div className="text-[10px] font-normal text-slate-600 normal-case mt-0.5">
                                [Internal SKU: {item.internalItemName || item.itemName} ({item.internalItemCode || item.sku || `IP00${780 + idx}`})]
                              </div>
                            </div>
                          ) : (
                            displayedName
                          )}
                          {item.brand && <span className="text-slate-600 font-normal text-[10px] ml-1">({item.brand})</span>}
                        </td>
                        <td className="border border-black p-2">{displayedUnit}</td>
                        <td className="border border-black p-2">{qty}</td>
                        {includePrices && (
                          <>
                            <td className="border border-black p-2 text-right pr-2">{unitPrice.toFixed(2)}</td>
                            <td className="border border-black p-2 text-right pr-2">{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Signature Section */}
            <div className={`grid grid-cols-1 ${includePrices ? 'md:grid-cols-2' : ''} gap-6 pt-2 font-bold text-xs`}>
              {/* Signature area */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span>RECIPIENT NAME :</span>
                  <span className="border-b-2 border-black flex-1 font-black text-blue-900 pb-0.5">{recipientName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>SIGNATURE :</span>
                  <div className="border-b-2 border-black flex-1 min-h-[50px] flex items-end">
                    {signatureDataUrl && (
                      <img src={signatureDataUrl} alt="Digital Signature" className="max-h-12 max-w-[180px] object-contain mb-1" />
                    )}
                  </div>
                </div>
              </div>

              {/* Totals table */}
              {includePrices && (
                <div>
                  <table className="w-full border-2 border-black text-xs font-bold border-collapse">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 text-center w-1/2">SUB TOTAL</td>
                        <td className="p-2 text-right">{subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 text-center">VAT 15 %</td>
                        <td className="p-2 text-right">{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="border-r border-black p-2 text-center text-sm">GRAND TOTAL</td>
                        <td className="p-2 text-right text-sm">{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer matching exact attached image */}
            <div className="border-t-2 border-slate-400 pt-3 text-center text-[11px] font-bold text-slate-800 space-y-0.5">
              <div className="font-serif">
                المملكة العربية السعودية - الرياض - ت: ٢٤٤٤ ٦٩٥ ٥٦ ٩٦٦+ - ٣٥٧٦ ٤١١ ٥٠ ٩٦٦+ - ست: ١٠١٠٧٩٤٠٧٥
              </div>
              <div>
                Riyadh - Kingdom of Saudi Arabia Tel: +966 56 695 2444, +966 50 411 3576 - C.R 1010794075
              </div>
              <div className="text-[#769d24] flex items-center justify-center gap-1 font-bold">
                <span>✉</span> sales@radiantlightning.com
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Official RADIANT LIGHTNING Delivery Note & Invoice Format</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
          </div>
        </div>

      </motion.div>
    </motion.div>
  </AnimatePresence>
  );
};
