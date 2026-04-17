import React, { useState, useEffect, useMemo } from 'react';
import { User, Report } from '../types';
import { LogOut, Send, CheckCircle2, ClipboardList, Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import { Spinner } from './ui/Spinner';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function SupervisorDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    machine_id: '',
    production_count: '',
    defect_count: '',
    primary_defect_reason: 'None',
    operational_cost: '',
    budget: '',
    downtime_minutes: '0',
    downtime_reason: '',
    notes: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchMyReports = async () => {
    try {
      const res = await fetch(`/api/reports?supervisor_id=${user.id}`);
      if (res.ok) setMyReports(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [user.id]);

  const teamKpis = useMemo(() => {
    if (myReports.length === 0) return null;
    const sorted = [...myReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent7 = sorted.slice(0, 7);

    const currProd = recent7.reduce((sum, r) => sum + (r.production_count || 0), 0);
    const currDefect = recent7.reduce((sum, r) => sum + (r.defect_count || 0), 0);
    const currDefectRate = currProd ? (currDefect / currProd) * 100 : 0;
    const totalDowntime = recent7.reduce((sum, r) => sum + (r.downtime_minutes || 0), 0);

    return { currProd, currDefectRate, totalDowntime, recentReports: sorted.slice(0, 10) };
  }, [myReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(formData.defect_count) > parseInt(formData.production_count)) {
      alert('Defect count cannot exceed production count.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supervisor_id: user.id,
        date: formData.date,
        shift: formData.shift,
        machine_id: formData.machine_id,
        production_count: parseInt(formData.production_count),
        defect_count: parseInt(formData.defect_count),
        primary_defect_reason: formData.primary_defect_reason,
        operational_cost: parseFloat(formData.operational_cost),
        budget: parseFloat(formData.budget),
        downtime_minutes: parseInt(formData.downtime_minutes),
        downtime_reason: formData.downtime_reason,
        notes: formData.notes,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/reports/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Submission failed');

      setSuccess(true);
      setEditingId(null);
      setFormData(emptyForm);
      fetchMyReports();
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      alert('Failed to submit report.');
    }
    setLoading(false);
  };

  const startEdit = (report: Report) => {
    setEditingId(report.id);
    setFormData({
      date: report.date,
      shift: report.shift,
      machine_id: report.machine_id,
      production_count: String(report.production_count),
      defect_count: String(report.defect_count),
      primary_defect_reason: report.primary_defect_reason,
      operational_cost: String(report.operational_cost),
      budget: String(report.budget),
      downtime_minutes: String(report.downtime_minutes),
      downtime_reason: report.downtime_reason || '',
      notes: report.notes || '',
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMyReports();
        setDeleteConfirm(null);
      }
    } catch {
      alert('Failed to delete report.');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-semibold text-sm">Floor Supervisor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-sm font-medium text-slate-800 block leading-tight">{user.name}</span>
              <small className="text-slate-400 text-[11px]">Supervisor</small>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{user.name.charAt(0)}</span>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 py-6 flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* Left Column: Team KPIs & Recent Reports */}
        <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
          <h2 className="text-lg font-semibold text-slate-800">Your Performance (Last 7 Days)</h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Production', value: teamKpis?.currProd.toLocaleString() ?? '0' },
              { label: 'Defect Rate', value: (teamKpis?.currDefectRate ?? 0).toFixed(1) + '%', highlight: (teamKpis?.currDefectRate ?? 0) > 5 },
              { label: 'Downtime', value: (teamKpis?.totalDowntime ?? 0) + 'm' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
              >
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
                <div className={cn('text-xl font-bold', kpi.highlight ? 'text-red-600' : 'text-slate-800')}>{kpi.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Recent Shift Logs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-medium text-slate-800 text-sm">Recent Shift Logs</h3>
              <span className="text-[10px] text-slate-400 uppercase">{myReports.length} total</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
              {teamKpis?.recentReports.map((r, i) => {
                const defRate = r.production_count ? (r.defect_count / r.production_count) * 100 : 0;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition group"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{format(parseISO(r.date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.machine_id} · {r.shift}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-1">
                        <span className="text-slate-500 text-xs block">{r.production_count.toLocaleString()} units</span>
                        <span className={cn('text-[11px] font-semibold', defRate > 5 ? 'text-red-500' : 'text-emerald-500')}>
                          {defRate.toFixed(1)}% defect
                        </span>
                      </div>
                      {/* Edit/Delete (visible on hover) */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                          title="Edit report"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(r.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                          title="Delete report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {(!teamKpis || teamKpis.recentReports.length === 0) && (
                <div className="p-6 text-center text-slate-400 text-sm">No recent logs found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Report' : 'Daily Production Report'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingId ? 'Modify the report details below.' : 'Submit your shift\'s performance metrics below.'}
                </p>
              </div>
              {editingId && (
                <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3 border border-emerald-100"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-medium">Report {editingId ? 'updated' : 'submitted'} successfully</h3>
                      <p className="text-xs opacity-90 mt-0.5">Your metrics have been logged to the CEO dashboard.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Row 1: Date, Shift, Machine */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Report Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Shift</label>
                  <select value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })} required className={cn(inputClass, 'bg-white')}>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Machine / Line ID</label>
                  <input type="text" placeholder="e.g. Line-A1" value={formData.machine_id} onChange={e => setFormData({ ...formData, machine_id: e.target.value })} required className={inputClass} />
                </div>
              </div>

              {/* Row 2: Production, Defects, Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Production Count</label>
                  <input type="number" min="0" placeholder="e.g. 1500" value={formData.production_count} onChange={e => setFormData({ ...formData, production_count: e.target.value })} required className={inputClass} />
                  <p className="text-[10px] text-slate-400 mt-1">Total units produced</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Defect Count</label>
                  <input type="number" min="0" placeholder="e.g. 45" value={formData.defect_count} onChange={e => setFormData({ ...formData, defect_count: e.target.value })} required className={inputClass} />
                  <p className="text-[10px] text-slate-400 mt-1">Total defective units</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Primary Defect Reason</label>
                  <select value={formData.primary_defect_reason} onChange={e => setFormData({ ...formData, primary_defect_reason: e.target.value })} required className={cn(inputClass, 'bg-white')}>
                    <option value="None">None</option>
                    <option value="Material Flaw">Material Flaw</option>
                    <option value="Machine Calibration">Machine Calibration</option>
                    <option value="Human Error">Human Error</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Cost, Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Operational Cost (₱)</label>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 52000" value={formData.operational_cost} onChange={e => setFormData({ ...formData, operational_cost: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Budget (₱)</label>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 50000" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} required className={inputClass} />
                </div>
              </div>

              {/* Row 4: Downtime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Downtime (Minutes)</label>
                  <input type="number" min="0" placeholder="e.g. 45" value={formData.downtime_minutes} onChange={e => setFormData({ ...formData, downtime_minutes: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Downtime Reason</label>
                  <input type="text" placeholder="e.g. Preventive Maintenance" value={formData.downtime_reason} onChange={e => setFormData({ ...formData, downtime_reason: e.target.value })} disabled={parseInt(formData.downtime_minutes || '0') === 0} className={cn(inputClass, 'disabled:bg-slate-50 disabled:text-slate-400')} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes</label>
                <textarea rows={3} placeholder="Any machine downtimes, staff shortages, or incidents?" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={cn(inputClass, 'resize-none')} />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium">
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition text-sm disabled:opacity-70 shadow-sm',
                    editingId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  {loading ? <Spinner className="w-4 h-4 text-white" /> : <Send className="w-4 h-4" />}
                  {editingId ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Delete Report?</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The report will be permanently removed from the system.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium">
                  Delete Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
