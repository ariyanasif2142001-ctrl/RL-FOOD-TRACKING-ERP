import React from 'react';
import { useERP } from '../context/ERPContext';
import { KPICard } from './KPICard';
import { Analytics } from './Analytics';
import { RunningPOTable } from './RunningPOTable';
import { Sidebar } from './Sidebar';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  PackageCheck,
  DollarSign,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { purchaseOrders, setCurrentView, setActiveModal } = useERP();

  // Metrics calculations
  const totalPOs = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter((po) => po.status === 'Pending').length;
  const completedPOs = purchaseOrders.filter((po) => po.status === 'Purchased').length;
  const partialPOs = purchaseOrders.filter((po) => po.status === 'Partial Purchased').length;

  const totalHeldItems = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'On Hold').length,
    0
  );

  const totalPurchasedItems = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'Purchased').length,
    0
  );

  const todaysPurchaseCount = purchaseOrders.filter((po) => po.orderDate === '2026-07-29').length || 2;
  const todaysCost = purchaseOrders
    .filter((po) => po.orderDate === '2026-07-29')
    .reduce((acc, po) => acc + po.totalEstimatedCost, 0) || 7270.0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Executive Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Dashboard Title: 32px Bold */}
          <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            Food Purchase ERP Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise procurement monitoring, field hold locks, and warehouse inventory control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal('new-po')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all"
          >
            <span>+ Create Purchase Order</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 8 Enterprise KPI Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {/* Section Title: 22px */}
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white tracking-tight">
            Key Performance Indicators
          </h2>
          <span className="text-xs text-slate-400 font-medium">Real-time Metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Total PO */}
          <KPICard
            title="Total Purchase Orders"
            value={totalPOs}
            change="+12.5%"
            borderAccentColor="border-l-blue-600"
            icon={<ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 2: Pending PO */}
          <KPICard
            title="Pending PO Requisitions"
            value={pendingPOs}
            change="-4.1%"
            isPositive={true}
            borderAccentColor="border-l-amber-500"
            icon={<Clock size={20} className="text-amber-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 3: Completed PO */}
          <KPICard
            title="Completed Orders"
            value={completedPOs}
            change="+18.3%"
            borderAccentColor="border-l-emerald-500"
            icon={<CheckCircle2 size={20} className="text-emerald-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 4: Partial PO */}
          <KPICard
            title="Partial Purchased"
            value={partialPOs}
            change="+2.0%"
            neutral={true}
            borderAccentColor="border-l-sky-500"
            icon={<AlertCircle size={20} className="text-sky-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 5: Hold Items */}
          <KPICard
            title="Hold Items (Locked)"
            value={totalHeldItems}
            change="Active Locks"
            neutral={true}
            borderAccentColor="border-l-purple-500"
            icon={<Lock size={20} className="text-purple-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 6: Purchased Items */}
          <KPICard
            title="Purchased Items Verified"
            value={totalPurchasedItems}
            change="+8.4%"
            borderAccentColor="border-l-teal-500"
            icon={<PackageCheck size={20} className="text-teal-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 7: Today's Purchase */}
          <KPICard
            title="Today's PO Requisitions"
            value={todaysPurchaseCount}
            change="Daily Active"
            neutral={true}
            borderAccentColor="border-l-indigo-500"
            icon={<TrendingUp size={20} className="text-indigo-500" />}
            onClick={() => setCurrentView('purchase')}
          />

          {/* KPI 8: Today's Cost */}
          <KPICard
            title="Today's Total Spend"
            value={`$${todaysCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change="+5.2%"
            borderAccentColor="border-l-emerald-600"
            icon={<DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />}
            onClick={() => setCurrentView('reports')}
          />

        </div>
      </div>

      {/* Analytics Section */}
      <Analytics />

      {/* Main Workspace Row: Running PO Table & Right Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left / Center 2/3: Running PO Table */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white tracking-tight">
              Running Purchase Orders
            </h2>
            <button
              onClick={() => setCurrentView('purchase')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Full Master List <ArrowRight size={14} />
            </button>
          </div>

          <RunningPOTable />
        </div>

        {/* Right 1/3: Right Sidebar with Widgets */}
        <Sidebar />

      </div>
    </div>
  );
};
