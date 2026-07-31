import React, { useState } from 'react';
import { getGoogleAppsScriptTemplate } from '../../services/sheetsService';
import { copyToClipboard } from '../../utils/clipboard';
import { BookOpen, FileCode, Database, Cpu, ShieldAlert, CheckCircle2, Copy, Check, Terminal, ExternalLink, Layers } from 'lucide-react';

export const SystemDocsGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'sheets' | 'triggers' | 'userguide' | 'adminguide' | 'architecture'>('deploy');
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = async () => {
    await copyToClipboard(getGoogleAppsScriptTemplate());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

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
          Complete production setup guide for Google Sheets Database, Google Apps Script Web App Deployment, Time-Driven Triggers, Role Workflow Guides, and Architecture Specifications.
        </p>

        {/* Navigation Bar */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'deploy' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Apps Script Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'sheets' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Google Sheets Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('triggers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'triggers' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Required Triggers</span>
          </button>

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

      {/* TAB 1: Apps Script Deployment */}
      {activeTab === 'deploy' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Apps Script Web App Deployment Instructions</h3>
              <p className="text-xs text-slate-500">Deploy the backend API directly to your company Google Sheet</p>
            </div>

            <button
              onClick={handleCopyScript}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
            >
              {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedScript ? 'Copied Apps Script!' : 'Copy Backend Code.gs'}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 text-sm">Step 1: Open Google Sheets</span>
              <p>Create a new blank Google Sheet or open your existing RL Food Purchase spreadsheet.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 text-sm">Step 2: Open Extensions -&gt; Apps Script</span>
              <p>In the top menu bar of Google Sheets, click <strong>Extensions</strong>, then select <strong>Apps Script</strong>.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 text-sm">Step 3: Paste Production Code.gs</span>
              <p>Delete all existing text in `Code.gs`, click "Copy Backend Code.gs" above, paste it into the editor, and click the <strong>Save</strong> disk icon.</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-sm">Step 4: Deploy as Web App (CRITICAL)</span>
              <ol className="list-decimal pl-5 space-y-1.5 mt-2">
                <li>Click the blue <strong>Deploy</strong> button in the top right -&gt; select <strong>New deployment</strong>.</li>
                <li>Click the gear icon next to "Select type" -&gt; choose <strong>Web app</strong>.</li>
                <li>Description: <code>RL Food Purchase Backend v1.0.0</code></li>
                <li>Execute as: <strong>Me (your email address)</strong></li>
                <li>Who has access: <strong className="text-rose-600">Anyone</strong> (Mandatory for frontend CORS communication).</li>
                <li>Click <strong>Deploy</strong>, grant Google Account permissions if prompted, and copy the generated <strong>Web App URL</strong>.</li>
              </ol>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 text-sm">Step 5: Connect RL FoodTrack Frontend</span>
              <p>Navigate to <strong>Admin Dashboard -&gt; Google Sheets Integration</strong> tab in this app, paste the Web App URL, and click <strong>Save & Connect</strong>.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Google Sheets Schema */}
      {activeTab === 'sheets' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Google Sheets Database Structure</h3>
            <p className="text-xs text-slate-500">All 5 sheets and header columns are automatically generated by Apps Script upon initial request.</p>
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

      {/* TAB 3: Required Triggers */}
      {activeTab === 'triggers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Required Apps Script Time-Driven Triggers</h3>
            <p className="text-xs text-slate-500">Automatic background cron jobs for item hold auto-releasing</p>
          </div>

          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <span className="font-bold text-amber-900 text-sm">Automated 10-Minute Hold Release Timer Trigger</span>
              <p>In Apps Script, click the <strong>Triggers (Clock icon)</strong> on the left menu -&gt; click <strong>Add Trigger</strong>:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-amber-900">
                <li>Choose function to run: <code>autoReleaseExpiredHoldsCron</code></li>
                <li>Select event source: <strong>Time-driven</strong></li>
                <li>Select type of time based trigger: <strong>Minutes timer</strong></li>
                <li>Select minute interval: <strong>Every minute</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: User Guide */}
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
                <li>Click <strong>Confirm Receive</strong> to verify goods and log receive verification to Google Sheets.</li>
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

      {/* TAB 5: Admin Guide */}
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
              <p>Every transaction (Login, Hold, Purchase, Receive, Import, Roster Change) is logged in real-time in the ACTIVITY_LOG sheet and displayed under Audit Activity Log.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Architecture */}
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
│   │   └── appConfig.ts                # Application Configuration & WebApp Storage
│   ├── services/
│   │   ├── apiClient.ts                # Google Apps Script Web App Client
│   │   ├── poImportService.ts          # Excel Parser, Validation & Duplicate Merger
│   │   ├── sheetsService.ts            # Production Code.gs Template Generator
│   │   └── storage.ts                  # Client Storage Bridge
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
