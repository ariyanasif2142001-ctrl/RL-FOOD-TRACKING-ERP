import React from 'react';
import { useERP } from '../../context/ERPContext';
import { X, HelpCircle, CheckCircle2 } from 'lucide-react';

export const SetupGuidesModal: React.FC = () => {
  const { activeModal, setActiveModal } = useERP();

  if (activeModal !== 'setup-guides') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-purple-400" size={20} />
            <h3 className="text-base font-bold text-white">RL Food ERP Setup & Operational Guide</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                1. Item Hold Lock Workflow
              </h4>
              <p>
                Purchasers can lock individual items on a PO by clicking <strong>Hold</strong>. This prevents other team members from accidentally purchasing the same ingredient in parallel.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                2. Recording Actual Purchases
              </h4>
              <p>
                Click <strong>Record Purchase</strong> to input actual market prices paid, total quantity purchased, and vendor receipt numbers.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                3. Warehouse Receipt Verification
              </h4>
              <p>
                Receivers physically count items when delivered to the warehouse, recording actual received vs ordered quantities.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
