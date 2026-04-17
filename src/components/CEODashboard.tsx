import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, Report, Filters, EmailLog } from '../types';
import { LogOut, TrendingDown, TrendingUp, AlertTriangle, PackageSearch, Factory, Menu, X, RefreshCw, Clock, Settings, BarChart3, Shield, History, LayoutDashboard, Users, Mail, Trash2, UserPlus } from 'lucide-react';
import { Spinner } from './ui/Spinner';
import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import FilterBar, { applyFilters, defaultFilters } from './FilterBar';
import NotificationCenter from './NotificationCenter';
import ExportButton from './ExportButton';
import AIInsightsPanel from './AIInsightsPanel';

// Philippine Peso formatter
const peso = (v: number) => `₱${v.toLocaleString()}`;

const aggregateByDate = (reports: Report[]) => {
  const acc: Record<string, { prod: number; defects: number; cost: number; budget: number }> = {};
  for (const r of reports) {
    if (!acc[r.date]) acc[r.date] = { prod: 0, defects: 0, cost: 0, budget: 0 };
    acc[r.date].prod += r.production_count || 0;
    acc[r.date].defects += r.defect_count || 0;
    acc[r.date].cost += r.operational_cost || 0;
    acc[r.date].budget += r.budget || 0;
  }
  return Object.entries(acc)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, d]) => ({
      rawDate: date,
      date: format(parseISO(date), 'MMM d'),
      Production: d.prod,
      Defects: d.defects,
      Cost: d.cost,
      Budget: d.budget,
    }));
};

export default function CEODashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'overview' | 'production' | 'quality' | 'finance' | 'history' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/reports').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
      .then(([reportsData, settingsData]) => {
        setAllReports(reportsData);
        setSettings(settingsData);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Apply filters
  const reports = useMemo(() => applyFilters(allReports, filters), [allReports, filters]);

  const kpis = useMemo(() => {
    if (reports.length === 0) return null;

    const aggregated = aggregateByDate(reports);
    const recent7 = aggregated.slice(-7);
    const prior7 = aggregated.slice(Math.max(0, aggregated.length - 14), Math.max(0, aggregated.length - 7));

    const sum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

    const currProd = sum(recent7, 'Production');
    const priorProd = sum(prior7, 'Production');
    const prodTrend = priorProd ? ((currProd - priorProd) / priorProd) * 100 : 0;

    const currDefect = sum(recent7, 'Defects');
    const currDefectRate = currProd ? (currDefect / currProd) * 100 : 0;
    const priorDefectRate = priorProd ? (sum(prior7, 'Defects') / priorProd) * 100 : 0;

    const currCost = sum(recent7, 'Cost');
    const currBudget = sum(recent7, 'Budget');

    const defectThreshold = parseFloat(settings?.defect_threshold || '5');
    const costTolerancePercent = parseFloat(settings?.cost_threshold_percent || '0');
    const allowedCost = currBudget * (1 + costTolerancePercent / 100);
    const costOverrun = currCost > allowedCost;

    return {
      currProd, prodTrend,
      currDefectRate, defectRateTrend: currDefectRate - priorDefectRate,
      currCost, currBudget, costOverrun,
      defectThreshold, costTolerancePercent, allowedCost,
      chartData: recent7,
    };
  }, [reports, settings]);

  const hasAlert = kpis && (kpis.currDefectRate > kpis.defectThreshold || kpis.costOverrun);

  const saveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings: Record<string, string> = {};
    formData.forEach((value, key) => { newSettings[key] = value as string; });

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      setSettings(prev => ({ ...prev, ...newSettings }));
      alert('Settings saved successfully.');
    } catch {
      alert('Error saving settings.');
    }
  };

  const navItems = [
    { key: 'overview' as const, label: 'Executive Overview', icon: LayoutDashboard },
    { key: 'production' as const, label: 'Production Lines', icon: Factory },
    { key: 'quality' as const, label: 'Quality Control', icon: Shield },
    { key: 'finance' as const, label: 'Finance & Ops', icon: BarChart3 },
    { key: 'history' as const, label: 'Historical Trends', icon: History },
  ];

  const handleNavClick = (view: typeof currentView) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8 text-blue-500" />
          <p className="text-sm text-slate-400">Loading operations data...</p>
        </div>
      </div>
    );
  }

  const timeSinceUpdate = () => {
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-overlay lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <nav
        className={cn(
          'fixed lg:relative z-50 lg:z-auto w-[260px] bg-slate-900 text-white flex flex-col pt-6 pb-6 shrink-0 h-full transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-6 pb-8 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-blue-400">OpsDash</div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 space-y-0.5 flex-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              onClick={() => handleNavClick(key)}
              className={cn(
                'px-4 py-2.5 text-sm flex items-center gap-3 cursor-pointer rounded-lg transition-all',
                currentView === key
                  ? 'bg-blue-500/15 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </div>
          ))}
        </div>

        <div className="px-3 space-y-0.5 mt-auto pt-4 border-t border-slate-800">
          <div
            onClick={() => handleNavClick('settings')}
            className={cn(
              'px-4 py-2.5 text-sm flex items-center gap-3 cursor-pointer rounded-lg transition-all',
              currentView === 'settings'
                ? 'bg-blue-500/15 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Settings className="w-4 h-4" />
            System Settings
          </div>
          <div
            className="px-4 py-2.5 text-sm text-slate-400 flex items-center gap-3 cursor-pointer rounded-lg hover:text-white hover:bg-white/5 transition-all"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {navItems.find(n => n.key === currentView)?.label || 'System Settings'}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">{format(new Date(), 'EEEE, MMM d yyyy')}</p>
                <span className="text-slate-300">·</span>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition"
                >
                  <Clock className="w-3 h-3" />
                  {timeSinceUpdate()}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentView !== 'settings' && (
              <>
                <AIInsightsPanel reports={reports} />
                <ExportButton reports={reports} />
                <FilterBar reports={allReports} filters={filters} onChange={setFilters} />
              </>
            )}
            <NotificationCenter userId={user.id} />
            <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 block leading-tight">{user.name}</span>
                <small className="block text-slate-400 text-[11px]">Chief Executive Officer</small>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{user.name.charAt(0)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {currentView === 'settings' ? (
                <SettingsView settings={settings} onSave={saveSettings} userId={user.id} />
              ) : currentView === 'production' ? (
                <ProductionLinesView reports={reports} />
              ) : currentView === 'quality' ? (
                <QualityControlView reports={reports} settings={settings} />
              ) : currentView === 'finance' ? (
                <FinanceView reports={reports} />
              ) : currentView === 'history' ? (
                <HistoryView reports={reports} />
              ) : (
                <OverviewContent reports={reports} kpis={kpis} hasAlert={hasAlert} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/* ─── Overview Content ─────────────────────────────────────────────── */
function OverviewContent({ reports, kpis, hasAlert }: { reports: Report[]; kpis: any; hasAlert: any }) {
  return (
    <>
      {hasAlert && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-4 shadow-sm"
        >
          <div className="p-2 bg-red-100 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold mb-1">Critical Deviation Alerts</h3>
            <ul className="text-slate-500 text-sm space-y-1">
              {kpis.currDefectRate > kpis.defectThreshold && (
                <li>&bull; <b className="text-slate-700">Defect Threshold Breach:</b> Quality defect rate is at {kpis.currDefectRate.toFixed(1)}% (Threshold: {kpis.defectThreshold}%)</li>
              )}
              {kpis.costOverrun && (
                <li>&bull; <b className="text-slate-700">Cost Variance Warning:</b> Operational costs ({peso(kpis.currCost)}) have exceeded the budget tolerance limits.</li>
              )}
            </ul>
          </div>
        </motion.div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Total Production', value: kpis?.currProd.toLocaleString() ?? '0',
            trend: kpis?.prodTrend, icon: <Factory className="text-blue-500 w-5 h-5" />,
          },
          {
            title: 'Defect Rate', value: (kpis?.currDefectRate ?? 0).toFixed(1) + '%',
            trend: kpis ? -kpis.defectRateTrend : 0, trendInverted: true,
            icon: <PackageSearch className="text-indigo-500 w-5 h-5" />,
          },
          {
            title: 'Operational Cost', value: peso(kpis?.currCost ?? 0),
            sub: `Budget: ${peso(kpis?.currBudget ?? 0)}`,
            trend: kpis ? ((kpis.currBudget - kpis.currCost) / kpis.currBudget) * 100 : 0,
            trendLabel: kpis?.costOverrun ? 'Over Budget' : 'Under Budget',
            trendInverted: kpis?.costOverrun,
            icon: <span className="text-emerald-500 font-bold text-lg">₱</span>,
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <KPICard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col shadow-sm"
        >
          <h3 className="font-semibold text-slate-900 mb-4 text-sm">Production Volume vs Defects</h3>
          <div className="flex-1 min-h-[220px]">
            {kpis?.chartData && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="Production" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProd)" />
                  <Area type="monotone" dataKey="Defects" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDef)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col shadow-sm"
        >
          <h3 className="font-semibold text-slate-900 mb-4 text-sm">Cost vs Budget (7 Days)</h3>
          <div className="flex-1 min-h-[220px]">
            {kpis?.chartData && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} formatter={(v: number) => peso(v)} />
                  <Bar dataKey="Cost" fill="#3b82f6" opacity={0.9} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Submissions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col shadow-sm"
      >
        <h3 className="font-semibold text-slate-900 mb-4 text-sm">Recent Floor Submissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse whitespace-nowrap">
            <thead>
              <tr>
                {['Date', 'Supervisor', 'Machine', 'Shift', 'Production', 'Defects', 'Cost (₱)', 'Status'].map(h => (
                  <th key={h} className={cn('font-medium text-slate-500 pb-3 border-b border-slate-200', h === 'Production' || h === 'Defects' || h === 'Cost (₱)' || h === 'Status' ? 'text-right' : '')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 10).map((r, i) => {
                const rateNum = r.production_count ? (r.defect_count / r.production_count) * 100 : 0;
                const isHighDefect = rateNum > 5;
                return (
                  <tr key={r.id || i}>
                    <td className="py-2.5 border-b border-slate-50 text-slate-900">{r.date}</td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-600">{r.supervisor_name}</td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-600">{r.machine_id}</td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-500 text-xs">{r.shift}</td>
                    <td className="py-2.5 border-b border-slate-50 text-right text-slate-900">{r.production_count.toLocaleString()}</td>
                    <td className="py-2.5 border-b border-slate-50 text-right text-slate-600">{r.defect_count} ({rateNum.toFixed(1)}%)</td>
                    <td className="py-2.5 border-b border-slate-50 text-right text-slate-600">{r.operational_cost.toLocaleString()}</td>
                    <td className="py-2.5 border-b border-slate-50 text-right">
                      <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold', isHighDefect ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                        {isHighDefect ? 'Reviewing' : 'Verified'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reports.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No reports match current filters.</p>}
        </div>
      </motion.div>
    </>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────────────── */
function KPICard({ title, value, sub, trend, trendInverted = false, trendLabel, icon }: any) {
  const isPositiveTrend = trend >= 0;
  const isGood = trendInverted ? !isPositiveTrend : isPositiveTrend;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{title}</div>
        <div className="p-2 rounded-lg bg-slate-50">{icon}</div>
      </div>
      <div className="text-[26px] font-bold text-slate-800 mb-1 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 mb-1">{sub}</div>}
      {trend !== undefined && (
        <div className={cn('text-[12px] font-semibold flex items-center gap-1', isGood ? 'text-emerald-500' : 'text-red-500')}>
          {isPositiveTrend ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {trendLabel || Math.abs(trend).toFixed(1) + '%'}
        </div>
      )}
    </div>
  );
}

/* ─── Production Lines View ────────────────────────────────────────── */
function ProductionLinesView({ reports }: { reports: Report[] }) {
  const byLine = useMemo(() => {
    const acc: Record<string, { machine_id: string; prod: number; defects: number; downtime: number; logs: number }> = {};
    for (const r of reports) {
      const id = r.machine_id || 'Unknown';
      if (!acc[id]) acc[id] = { machine_id: id, prod: 0, defects: 0, downtime: 0, logs: 0 };
      acc[id].prod += r.production_count;
      acc[id].defects += r.defect_count;
      acc[id].downtime += r.downtime_minutes || 0;
      acc[id].logs += 1;
    }
    return Object.values(acc);
  }, [reports]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {byLine.map((s, i) => {
        const defectRate = s.prod ? (s.defects / s.prod) * 100 : 0;
        const utilization = s.logs > 0 ? Math.min(100, ((s.prod / (s.logs * 1200)) * 100)) : 0;
        return (
          <motion.div
            key={s.machine_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Factory className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="font-semibold text-slate-800">{s.machine_id}</h3>
              </div>
              <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', defectRate > 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                {defectRate > 5 ? 'Attention' : 'Normal'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Total Prod</div>
                <div className="text-lg font-bold text-slate-800">{s.prod.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Defect Rate</div>
                <div className={cn('text-lg font-bold', defectRate > 5 ? 'text-red-600' : 'text-emerald-600')}>{defectRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Downtime</div>
                <div className={cn('text-lg font-bold', s.downtime > 60 ? 'text-red-600' : 'text-slate-800')}>{s.downtime}m</div>
              </div>
            </div>
            {/* Utilization Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Utilization</span>
                <span>{utilization.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${utilization}%` }} />
              </div>
            </div>
          </motion.div>
        );
      })}
      {byLine.length === 0 && <p className="text-slate-400 text-sm col-span-2">No production data available.</p>}
    </div>
  );
}

/* ─── Quality Control View ─────────────────────────────────────────── */
function QualityControlView({ reports, settings }: { reports: Report[]; settings: any }) {
  const threshold = parseFloat(settings?.defect_threshold || '5');

  const issues = useMemo(() =>
    reports
      .map(r => ({ ...r, rate: r.production_count ? (r.defect_count / r.production_count) * 100 : 0 }))
      .filter(r => r.rate > threshold)
      .sort((a, b) => b.rate - a.rate),
    [reports, threshold]);

  // Defect reason breakdown for pie chart
  const reasonData = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of reports) {
      if (r.primary_defect_reason && r.primary_defect_reason !== 'None') {
        acc[r.primary_defect_reason] = (acc[r.primary_defect_reason] || 0) + r.defect_count;
      }
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [reports]);

  const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981'];

  const globalDefectRate = reports.reduce((s, r) => s + r.defect_count, 0) / Math.max(1, reports.reduce((s, r) => s + r.production_count, 0)) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Global Defect Avg" value={globalDefectRate.toFixed(1) + '%'} trendInverted trendLabel="All time" trend={0} icon={<PackageSearch className="text-indigo-500 w-5 h-5" />} />
        <KPICard title="Total Flagged Shifts" value={issues.length.toString()} sub={`Exceeded ${threshold}% threshold`} icon={<AlertTriangle className="text-red-500 w-5 h-5" />} />
        <KPICard title="Total Defective Units" value={reports.reduce((s, r) => s + r.defect_count, 0).toLocaleString()} icon={<Shield className="text-amber-500 w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Defect Reason Pie Chart */}
        {reasonData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Defect Root Causes</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                    {reasonData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} units`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {reasonData.map((d, idx) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality Issues Table */}
        <div className={cn('bg-white rounded-xl border border-slate-200 p-5 flex flex-col shadow-sm', reasonData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <h3 className="font-semibold text-slate-900 mb-4 text-sm flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full" />
            Quality Deviations (Exceeding {threshold}%)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  {['Date/Shift', 'Machine', 'Supervisor', 'Defect Rate', 'Primary Reason'].map(h => (
                    <th key={h} className={cn('font-medium text-slate-500 pb-3 border-b border-slate-200', h === 'Defect Rate' ? 'text-right' : '')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map(r => (
                  <tr key={r.id}>
                    <td className="py-2.5 border-b border-slate-50 text-slate-900">{r.date} <span className="text-slate-400 text-xs ml-1">({r.shift})</span></td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-600">{r.machine_id}</td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-600">{r.supervisor_name}</td>
                    <td className="py-2.5 border-b border-slate-50 text-right text-red-600 font-bold">{r.rate.toFixed(1)}% ({r.defect_count})</td>
                    <td className="py-2.5 border-b border-slate-50 text-slate-700 font-semibold">{r.primary_defect_reason}</td>
                  </tr>
                ))}
                {issues.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No quality deviations on record.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Finance View ─────────────────────────────────────────────────── */
function FinanceView({ reports }: { reports: Report[] }) {
  const data = useMemo(() => {
    return aggregateByDate(reports).map(r => ({
      ...r,
      Variance: r.Cost - r.Budget,
    }));
  }, [reports]);

  const totalCost = reports.reduce((s, r) => s + r.operational_cost, 0);
  const totalBudget = reports.reduce((s, r) => s + r.budget, 0);
  const totalProd = reports.reduce((s, r) => s + r.production_count, 0);
  const costPerUnit = totalProd ? totalCost / totalProd : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Operational Spend" value={peso(totalCost)} icon={<span className="text-blue-500 font-bold text-lg">₱</span>} />
        <KPICard title="Total Budget Accrued" value={peso(totalBudget)} icon={<BarChart3 className="text-slate-500 w-5 h-5" />} />
        <KPICard title="Cost Per Unit" value={`₱${costPerUnit.toFixed(2)}`} icon={<Factory className="text-emerald-500 w-5 h-5" />} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4 text-sm">Cost vs Budget Variance over Time</h3>
        <div className="min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={50} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} formatter={(v: number) => peso(v)} />
              <Bar dataKey="Cost" fill="#3b82f6" opacity={0.9} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── History View ─────────────────────────────────────────────────── */
function HistoryView({ reports }: { reports: Report[] }) {
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('daily');

  const data = useMemo(() => {
    if (granularity === 'monthly') {
      const acc: Record<string, { prod: number; defects: number; cost: number; budget: number }> = {};
      for (const r of reports) {
        const month = r.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = { prod: 0, defects: 0, cost: 0, budget: 0 };
        acc[month].prod += r.production_count;
        acc[month].defects += r.defect_count;
        acc[month].cost += r.operational_cost;
        acc[month].budget += r.budget;
      }
      return Object.entries(acc)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([month, d]) => ({
          date: format(new Date(month + '-01'), 'MMM yyyy'),
          Production: d.prod,
          Defects: d.defects,
          Cost: d.cost,
          Budget: d.budget,
        }));
    }

    return aggregateByDate(reports);
  }, [reports, granularity]);

  // Summary stats
  const totalProd = reports.reduce((s, r) => s + r.production_count, 0);
  const totalDefects = reports.reduce((s, r) => s + r.defect_count, 0);
  const avgDaily = reports.length > 0 ? Math.round(totalProd / new Set(reports.map(r => r.date)).size) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="All-Time Production" value={totalProd.toLocaleString()} icon={<Factory className="text-blue-500 w-5 h-5" />} />
        <KPICard title="All-Time Defects" value={totalDefects.toLocaleString()} sub={`${(totalProd ? (totalDefects / totalProd) * 100 : 0).toFixed(1)}% avg rate`} icon={<PackageSearch className="text-red-500 w-5 h-5" />} />
        <KPICard title="Avg Daily Output" value={avgDaily.toLocaleString()} sub={`Across ${new Set(reports.map(r => r.date)).size} days`} icon={<BarChart3 className="text-emerald-500 w-5 h-5" />} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-sm">Historical Production Output</h3>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['daily', 'monthly'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition', granularity === g ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                {g === 'daily' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[300px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProdHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Area type="monotone" dataKey="Production" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProdHist)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Settings View ────────────────────────────────────────────────── */
function SettingsView({ settings, onSave, userId }: { settings: Record<string, string>; onSave: (e: React.FormEvent<HTMLFormElement>) => void; userId: number }) {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [newUser, setNewUser] = useState({ username: '', name: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'team' | 'emails'>('thresholds');

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(users => setSupervisors(users.filter((u: any) => u.role === 'Supervisor')));
    fetch('/api/email-log').then(r => r.json()).then(setEmailLogs);
  }, []);

  const addSupervisor = async () => {
    if (!newUser.username || !newUser.name) return;
    setAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        const user = await res.json();
        setSupervisors(prev => [...prev, user]);
        setNewUser({ username: '', name: '' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add supervisor.');
      }
    } catch {
      alert('Connection error.');
    }
    setAddingUser(false);
  };

  const removeSupervisor = async (id: number) => {
    if (!confirm('Remove this supervisor? Their reports will be preserved.')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      setSupervisors(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to remove supervisor.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6 w-full">
      {/* Tab Switcher */}
      <div className="flex bg-slate-100 rounded-lg p-0.5 w-full sm:w-fit overflow-x-auto snap-x scrollbar-hide">
        {([
          { key: 'thresholds' as const, label: 'Alert Thresholds', icon: Settings },
          { key: 'team' as const, label: 'Team Management', icon: Users },
          { key: 'emails' as const, label: 'Email Log', icon: Mail },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap shrink-0 snap-start', activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'thresholds' && (
          <motion.div key="thresholds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-6">Alert Thresholds</h3>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Defect Rate Threshold (%)</label>
                <input type="number" step="0.1" name="defect_threshold" defaultValue={settings?.defect_threshold || '5'} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <p className="text-xs text-slate-500 mt-1">Alert triggered if defect rate exceeds this value.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Overrun Tolerance (%)</label>
                <input type="number" step="0.1" name="cost_threshold_percent" defaultValue={settings?.cost_threshold_percent || '0'} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <p className="text-xs text-slate-500 mt-1">Alert triggered if costs exceed budget by this percentage.</p>
              </div>
              <div>
                <label className="flex items-center gap-3">
                  <input type="hidden" name="email_notifications" value="false" />
                  <input type="checkbox" name="email_notifications" value="true" defaultChecked={settings?.email_notifications !== 'false'} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700">Enable email notifications (simulated)</span>
                </label>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition text-sm">Save Thresholds</button>
            </form>
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-6">Team Management</h3>

            {/* Add Supervisor */}
            <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-slate-100">
              <input
                type="text" placeholder="Username" value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text" placeholder="Full Name" value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={addSupervisor} disabled={addingUser || !newUser.username || !newUser.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Add Supervisor
              </button>
            </div>

            {/* Supervisor List */}
            <div className="space-y-2">
              {supervisors.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">@{s.username}</p>
                  </div>
                  <button onClick={() => removeSupervisor(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {supervisors.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No supervisors found.</p>}
            </div>
          </motion.div>
        )}

        {activeTab === 'emails' && (
          <motion.div key="emails" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Email Notification Log</h3>
            <p className="text-xs text-slate-500 mb-4">Simulated email alerts sent when thresholds are breached.</p>
            <div className="space-y-3">
              {emailLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-800 text-sm">{log.subject}</p>
                    <span className="text-[10px] text-slate-400">{new Date(log.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500">{log.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">To: {log.recipient}</p>
                </div>
              ))}
              {emailLogs.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No email alerts sent yet.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
