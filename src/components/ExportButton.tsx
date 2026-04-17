import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Report } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function ExportButton({ reports, title = 'Reports' }: { reports: Report[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportCSV = () => {
    if (reports.length === 0) return;

    const headers = [
      'Date', 'Supervisor', 'Shift', 'Machine', 
      'Production', 'Defects', 'Defect Rate (%)', 'Defect Reason',
      'Op. Cost (₱)', 'Budget (₱)', 'Variance (₱)',
      'Downtime (min)', 'Downtime Reason', 'Notes'
    ];

    const rows = reports.map(r => [
      r.date,
      r.supervisor_name || '',
      r.shift,
      r.machine_id,
      r.production_count,
      r.defect_count,
      r.production_count ? ((r.defect_count / r.production_count) * 100).toFixed(1) : '0',
      r.primary_defect_reason,
      r.operational_cost,
      r.budget,
      (r.operational_cost - r.budget).toFixed(2),
      r.downtime_minutes,
      r.downtime_reason,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OpsDash_${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportPDF = () => {
    window.print();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative no-print">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 w-[180px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40"
          >
            <button
              onClick={exportCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Export as CSV
            </button>
            <div className="border-t border-slate-100" />
            <button
              onClick={exportPDF}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition text-left"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Print / PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
