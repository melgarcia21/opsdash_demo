import { useState, useMemo } from 'react';
import { Report, Filters } from '../types';
import { Filter, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const defaultFilters: Filters = {
  dateFrom: '',
  dateTo: '',
  machineId: '',
  shift: '',
};

export default function FilterBar({ 
  reports, 
  filters, 
  onChange 
}: { 
  reports: Report[]; 
  filters: Filters; 
  onChange: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);

  const machines = useMemo(() => {
    const set = new Set(reports.map(r => r.machine_id).filter(Boolean));
    return Array.from(set).sort();
  }, [reports]);

  const hasActiveFilter = filters.dateFrom || filters.dateTo || filters.machineId || filters.shift;

  const activeCount = [filters.dateFrom, filters.dateTo, filters.machineId, filters.shift].filter(Boolean).length;

  return (
    <div className="no-print">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
          hasActiveFilter
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <span className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => onChange({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Machine / Line</label>
                <select
                  value={filters.machineId}
                  onChange={e => onChange({ ...filters, machineId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">All Machines</option>
                  {machines.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
                <select
                  value={filters.shift}
                  onChange={e => onChange({ ...filters, shift: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              {hasActiveFilter && (
                <button
                  onClick={() => onChange({ ...defaultFilters })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility: apply filters to reports array
export function applyFilters(reports: Report[], filters: Filters): Report[] {
  return reports.filter(r => {
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (filters.machineId && r.machine_id !== filters.machineId) return false;
    if (filters.shift && r.shift !== filters.shift) return false;
    return true;
  });
}

export { defaultFilters };
