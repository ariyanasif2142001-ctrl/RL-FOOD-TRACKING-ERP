import React, { useState } from 'react';
import { BookOpen, Database, ShieldAlert, Layers } from 'lucide-react';

export const SystemDocsGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'database' | 'userguide' | 'adminguide' | 'architecture'>('userguide');

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 text-blue-400 mb-2">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">System Documentation & Guides</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black">Production Deployment & Operations Manual</h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Complete production setup guide for Supabase ERP Database, Role Workflow Guides, and Architecture Specifications.
        </p>

        {/* Navigation Bar */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('userguide')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'userguide' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>User Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('adminguide')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'adminguide' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Administrator Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'database' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'architecture' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Folder & Code Structure</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Database Schema */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Supabase Relational Database Structure</h3>
            <p className="text-xs text-slate-500">Core database tables powering real-time synchronization, holds, purchases, and receiving.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>1. USERS</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">User Roster</span>
              </div>
              <p className="text-slate-500 text-[11px]">Columns: ID, Name, Username, Password, Role, Active, Created Date, Last Login</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>2. PO_MASTER</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono">Purchase Orders</span>
              </div>
              <p className="text-slate-500 text-[11px]">Columns: PO Number, Order Date, Delivery Date, Department, Location, Customer Name, Total Items, Total Quantity, Purchase Status, Receive Status, Created By, Created At, Updated At</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>3. PO_ITEMS</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-mono">Line Items & Holds</span>
              </div>
              <p className="text-slate-500 text-[11px]">Columns: Item ID, PO Number, Order Date, Delivery Date, Department, Location, SL Number, Item Name, Brand, Category, Unit, Requested Qty, Purchased Qty, Remaining Qty, Purchase Status, Hold By, Hold Start Time, Hold Expire Time, Purchaser Name, Purchased At, Notes, Warehouse Qty, Warehouse Verified By, Warehouse Verified At, Warehouse Notes, Created Date, Updated Date</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>4. RECEIVE_SUMMARY</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono">Warehouse Verification</span>
              </div>
              <p className="text-slate-500 text-[11px]">Columns: PO Number, Item Name, Ordered Qty, Purchased Qty, Received Qty, Remaining Qty, Receive Status, Verified By, Verified At</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>5. ACTIVITY_LOG</span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono">Audit Log</span>
              </div>
              <p className="text-slate-500 text-[11px]">Columns: Log ID, Timestamp, User, Role, Action, Details</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: User Guide */}
      {activeTab === 'userguide' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Role-Based User Operational Guide</h3>
            <p className="text-xs text-slate-500">Step-by-step instructions for Purchaser, Warehouse, and Dispatch teams</p>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-blue-900 text-sm">🛒 Purchaser Portal Workflow</h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Log in with Purchaser credentials. Filter or search by PO Number or Item Name.</li>
                <li>Click <strong>Hold Item</strong> on any Pending item to lock it for 10 minutes while verifying supplier availability.</li>
                <li>Click <strong>Record Purchase</strong>, enter purchased quantity & notes, and click Save.</li>
                <li>If full quantity is purchased, status updates to <strong>Purchased</strong>; if partial, status becomes <strong>Partial Purchased</strong>.</li>
              </ol>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-amber-900 text-sm">📦 Warehouse Portal Workflow</h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Log in with Warehouse credentials to view incoming purchased items.</li>
                <li>Inspect physical delivery against purchased quantity.</li>
                <li>Click <strong>Confirm Receive</strong> to verify goods and log receive verification in the system database.</li>
              </ol>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-emerald-900 text-sm">🚚 Dispatch Portal Workflow</h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Log in with Dispatch credentials to monitor completed orders ready for customer delivery.</li>
                <li>View live customer locations, order status, item counts, and dispatch verification logs.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Admin Guide */}
      {activeTab === 'adminguide' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Administrator Management Manual</h3>
            <p className="text-xs text-slate-500">Managing user permissions, importing PO excel spreadsheets, and audit logging</p>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">1. User Roster & Role Security</h4>
              <p>In Admin Dashboard -&gt; User Roster tab, administrators can create new user accounts, change user roles (Admin, Purchaser, Warehouse, Dispatch), and toggle active/inactive status.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">2. PO Spreadsheet Import</h4>
              <p>In Admin Dashboard -&gt; PO Import tab, drag & drop your Excel (.xlsx / .xls) file or paste text data. Mandatory headers: ORDER DATE, LOCATION, PO NUMBER, DEPARTMENT, SL NUMBER, ITEM NAME, BRAND, UNIT, QTY, DELIVERY DATE.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">3. Audit Activity Trail</h4>
              <p>Every transaction (Login, Hold, Purchase, Receive, Import, Roster Change) is logged in real-time in the system database and displayed under Audit Activity Log.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Architecture */}
      {activeTab === 'architecture' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">System Code & Directory Architecture</h3>
            <p className="text-xs text-slate-500">Clean, modular codebase hierarchy adhering to Vite + React + TypeScript standards</p>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto">
{`rl-food-purchase-tracking/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx      # Central Admin ERP Hub
│   │   │   ├── SystemTestsRunner.tsx   # Automated System Diagnostic Suite
│   │   │   └── SystemDocsGuide.tsx     # Deployment Manual & Documentation
│   │   ├── purchaser/
│   │   │   └── PurchaserView.tsx       # Item Hold & Purchase Recording Portal
│   │   ├── warehouse/
│   │   │   └── WarehouseView.tsx       # Goods Receiving & Verification Portal
│   │   ├── dispatch/
│   │   │   └── DispatchView.tsx        # Delivery & Dispatch Status Portal
│   │   ├── Header.tsx                  # Global App Header & Live Connection Indicator
│   │   └── LoginModal.tsx              # System Authentication Dialog
│   ├── config/
│   │   └── appConfig.ts                # Application Configuration
│   ├── services/
│   │   ├── apiClient.ts                # Supabase REST API & Data Sync Client
│   │   ├── poImportService.ts          # Excel Parser, Validation & Duplicate Merger
│   │   └── storage.ts                  # Client Storage & Local Fallback
│   ├── App.tsx                         # Main Application Shell & Action Handlers
│   ├── main.tsx                        # React Entry Point
│   ├── types.ts                        # Global TypeScript Interfaces
│   └── index.css                       # Tailwind CSS
├── metadata.json                       # Application Metadata
└── package.json                        # Dependencies`}
          </pre>
        </div>
      )}

    </div>
  );
};
