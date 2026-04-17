import { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Report } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from './ui/Spinner';

export default function AIInsightsPanel({ reports }: { reports: Report[] }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    setInsight(null);

    // Build a KPI summary from reports
    const totalProd = reports.reduce((s, r) => s + r.production_count, 0);
    const totalDefects = reports.reduce((s, r) => s + r.defect_count, 0);
    const totalCost = reports.reduce((s, r) => s + r.operational_cost, 0);
    const totalBudget = reports.reduce((s, r) => s + r.budget, 0);
    const totalDowntime = reports.reduce((s, r) => s + (r.downtime_minutes || 0), 0);
    const avgDefectRate = totalProd ? ((totalDefects / totalProd) * 100).toFixed(1) : '0';

    // Get machine breakdown
    const byMachine: Record<string, { prod: number; defects: number; downtime: number }> = {};
    for (const r of reports) {
      if (!byMachine[r.machine_id]) byMachine[r.machine_id] = { prod: 0, defects: 0, downtime: 0 };
      byMachine[r.machine_id].prod += r.production_count;
      byMachine[r.machine_id].defects += r.defect_count;
      byMachine[r.machine_id].downtime += (r.downtime_minutes || 0);
    }

    const machineBreakdown = Object.entries(byMachine)
      .map(([id, data]) => `${id}: ${data.prod} units, ${(data.defects/data.prod*100).toFixed(1)}% defect rate, ${data.downtime}min downtime`)
      .join('\n');

    // Get defect reason breakdown
    const byReason: Record<string, number> = {};
    for (const r of reports) {
      if (r.primary_defect_reason && r.primary_defect_reason !== 'None') {
        byReason[r.primary_defect_reason] = (byReason[r.primary_defect_reason] || 0) + r.defect_count;
      }
    }
    const reasonBreakdown = Object.entries(byReason)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason}: ${count} defects`)
      .join(', ');

    const summary = `
Total Reports: ${reports.length}
Total Production: ${totalProd.toLocaleString()} units
Total Defects: ${totalDefects.toLocaleString()} (${avgDefectRate}% rate)
Total Operational Cost: ₱${totalCost.toLocaleString()}
Total Budget: ₱${totalBudget.toLocaleString()}
Cost Variance: ${totalCost > totalBudget ? 'OVER' : 'UNDER'} budget by ₱${Math.abs(totalCost - totalBudget).toLocaleString()}
Total Downtime: ${totalDowntime} minutes

Machine Breakdown:
${machineBreakdown}

Top Defect Causes: ${reasonBreakdown || 'None reported'}
    `.trim();

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
        setIsSimulated(data.simulated || false);
      } else {
        setInsight('Unable to generate insight at this time. Please try again.');
      }
    } catch (e) {
      setInsight('Connection error. Please ensure the server is running.');
    }

    setLoading(false);
  };

  return (
    <div className="no-print">
      {!open ? (
        <button
          onClick={() => { setOpen(true); generateInsight(); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <Sparkles className="w-4 h-4" />
          AI Insights
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="font-semibold text-violet-900 text-sm">AI Operations Insight</h3>
                {isSimulated && (
                  <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                    Demo Mode
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={generateInsight}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-violet-100 transition text-violet-500"
                  title="Regenerate"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setOpen(false); setInsight(null); }}
                  className="p-1.5 rounded-lg hover:bg-violet-100 transition text-violet-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-4 text-violet-500 text-sm">
                <Spinner className="w-4 h-4 text-violet-500" />
                Analyzing your operational data...
              </div>
            ) : insight ? (
              <p className="text-sm text-violet-800 leading-relaxed">{insight}</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
