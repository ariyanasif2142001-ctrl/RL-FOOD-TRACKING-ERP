import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { BarChart, DonutChart, LineTrendChart } from './Charts';
import { TrendingUp, Building2, MapPin, ShoppingBag, DollarSign } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { purchaseOrders } = useERP();
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  // Compute department breakdown
  const departmentData = [
    { label: 'Central Kitchen', value: 4850, color: 'bg-blue-600' },
    { label: 'Cold Storage', value: 3200, color: 'bg-emerald-500' },
    { label: 'Packaging', value: 4890, color: 'bg-purple-500' },
    { label: 'Dry Storage', value: 2600, color: 'bg-amber-500' },
  ];

  // Compute location breakdown
  const locationData = [
    { label: 'Facility #1', value: 6500, color: 'bg-indigo-600' },
    { label: 'Downtown Hub', value: 4890, color: 'bg-sky-500' },
    { label: 'North Hub', value: 3200, color: 'bg-teal-500' },
  ];

  // Vendors list
  const topVendors = [
    { name: 'Metro Fresh Produce Ltd.', spend: 4850.0, poCount: 2, share: 38 },
    { name: 'Apex Dairy & Poultry Supplies', spend: 3200.0, poCount: 1, share: 25 },
    { name: 'Global Spice & Packaging Co.', spend: 4890.0, poCount: 1, share: 37 },
  ];

  // Completion calculation
  const totalItems = purchaseOrders.reduce((acc, po) => acc + po.items.length, 0);
  const completedItems = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'Purchased').length,
    0
  );
  const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 75;

  return (
    <div className="space-y-6">
      {/* Title & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Section Title: 22px */}
          <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white tracking-tight">
            Executive Analytics & Cost Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time supplier commitment breakdown, department spend, and facility logistics trends.
          </p>
        </div>

        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              timeframe === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly Trend
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              timeframe === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly Trend
          </button>
        </div>
      </div>

      {/* Grid Row 1: Line Trend & Donut Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Purchase Spend Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Purchase Order Value Trend
              </h3>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              +14.2% vs Previous Period
            </span>
          </div>

          <LineTrendChart
            labels={
              timeframe === 'weekly'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
            }
            values={
              timeframe === 'weekly'
                ? [1200, 2400, 1800, 3200, 4800, 3900, 5200]
                : [14200, 18900, 22400, 19800, 26500, 31200, 34500]
            }
          />
        </div>

        {/* Completion Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Pending vs Completed
            </h3>
            <ShoppingBag size={18} className="text-emerald-500" />
          </div>

          <DonutChart
            percentage={completionPct}
            label="Field Fulfillment Rate"
            sublabel={`${completedItems}/${totalItems} Items Verified`}
            colorClass="text-emerald-500"
          />

          <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Purchased Items</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{completedItems} Items</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Pending Orders</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{totalItems - completedItems} Items</span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Row 2: Department-wise vs Location-wise Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Department Purchase Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Department Purchase Breakdown
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">4 Departments</span>
          </div>

          <BarChart data={departmentData} />
        </div>

        {/* Location / Facility-wise Purchase */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Facility / Location Allocation
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">3 Facilities</span>
          </div>

          <BarChart data={locationData} />
        </div>

      </div>

      {/* Grid Row 3: Top Suppliers / Vendors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" />
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Top Supplier & Vendor Share
            </h3>
          </div>
          <span className="text-xs text-slate-400">Verified Contracts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topVendors.map((vendor, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                  {vendor.name}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  {vendor.share}% Share
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs pt-1">
                <span className="text-slate-500 dark:text-slate-400">Cumulative Value</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ${vendor.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${vendor.share}%` }}
                  className="bg-emerald-500 h-full rounded-full"
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
