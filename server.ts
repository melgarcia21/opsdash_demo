import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database('opsdash.db');
db.pragma('journal_mode = WAL');

// ─── Schema ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    role TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    supervisor_id INTEGER,
    shift TEXT,
    machine_id TEXT,
    production_count INTEGER,
    defect_count INTEGER,
    primary_defect_reason TEXT,
    operational_cost REAL,
    budget REAL,
    downtime_minutes INTEGER,
    downtime_reason TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(supervisor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT DEFAULT 'info',
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT,
    subject TEXT,
    body TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed Settings ────────────────────────────────────────────────────
db.exec(`
  INSERT OR IGNORE INTO settings (key, value) VALUES ('defect_threshold', '5');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('cost_threshold_percent', '0');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('email_notifications', 'true');
`);

// ─── Seed Data ────────────────────────────────────────────────────────
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;

if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, role, name) VALUES (?, ?, ?)');
  insertUser.run('ceo', 'CEO', 'Christian Reyes');
  insertUser.run('supervisor1', 'Supervisor', 'Maria Santos');
  insertUser.run('supervisor2', 'Supervisor', 'Juan Dela Cruz');
  insertUser.run('supervisor3', 'Supervisor', 'Ana Mendoza');
  
  // Generate realistic seed reports across multiple machines, shifts, and supervisors
  const insertReport = db.prepare(
    'INSERT INTO reports (date, supervisor_id, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  
  const machines = ['Line-A1', 'Line-A2', 'Line-B1', 'Line-B2', 'Line-C1'];
  const shifts: ('Morning' | 'Afternoon' | 'Night')[] = ['Morning', 'Afternoon', 'Night'];
  const defectReasons = ['None', 'Material Flaw', 'Machine Calibration', 'Human Error', 'Other'];
  const downtimeReasons = ['Preventive Maintenance', 'Breakdown', 'Material Shortage', 'Setup Change', 'Power Outage'];
  const supervisorIds = [2, 3, 4]; // IDs of the 3 supervisors
  const today = new Date();

  // 30 days of data for rich historical analytics
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Each day: 2-3 reports from different supervisors/machines/shifts
    const reportsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3
    
    for (let j = 0; j < reportsPerDay; j++) {
      const supervisorId = supervisorIds[j % supervisorIds.length];
      const machine = machines[Math.floor(Math.random() * machines.length)];
      const shift = shifts[j % shifts.length];
      
      const baseProd = 800 + Math.floor(Math.random() * 600); // 800-1400
      const baseDefectRate = 0.02 + Math.random() * 0.06; // 2-8%
      const defects = Math.floor(baseProd * baseDefectRate);
      const defectReason = defects > baseProd * 0.05 
        ? defectReasons[1 + Math.floor(Math.random() * 3)] // skip 'None'
        : defectReasons[Math.floor(Math.random() * defectReasons.length)];
      
      const budget = 45000 + Math.floor(Math.random() * 10000);
      const costVariance = -3000 + Math.random() * 8000; // sometimes over, sometimes under
      const opsCost = Math.round(budget + costVariance);
      
      const hasDowntime = Math.random() > 0.65;
      const downtimeMins = hasDowntime ? 15 + Math.floor(Math.random() * 90) : 0;
      const downtimeReason = hasDowntime 
        ? downtimeReasons[Math.floor(Math.random() * downtimeReasons.length)] 
        : 'None';
      
      const notes = [
        'Normal production day.',
        'Slight material delay in morning.',
        'New batch of raw materials received.',
        'Staff training completed for line operators.',
        'Maintenance team performed routine checks.',
        'Quality audit completed — all clear.',
        'Minor adjustments to calibration settings.',
        ''
      ][Math.floor(Math.random() * 8)];
      
      insertReport.run(dateStr, supervisorId, shift, machine, baseProd, defects, defectReason, opsCost, budget, downtimeMins, downtimeReason, notes);
    }
  }

  // Seed initial notifications for CEO
  const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  insertNotif.run(1, 'system', 'Welcome to OpsDash', 'Your operations dashboard is now active. You will receive alerts when KPIs breach configured thresholds.', 0, new Date(today.getTime() - 86400000 * 2).toISOString());
  insertNotif.run(1, 'defect_alert', 'Defect Rate Threshold Exceeded', 'Line-A1 on the Morning shift reported a 7.2% defect rate, exceeding the 5% threshold. Primary cause: Machine Calibration.', 0, new Date(today.getTime() - 86400000).toISOString());
  insertNotif.run(1, 'cost_alert', 'Cost Overrun Detected', 'Operational costs on Line-B1 exceeded the daily budget by ₱3,200. Review the Finance & Ops section for details.', 0, new Date().toISOString());
}

// ─── Helper: Check thresholds and create alerts ───────────────────────
function checkThresholdsAndAlert(report: any, supervisorName: string) {
  const settings: Record<string, string> = {};
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  for (const r of rows) settings[r.key] = r.value;

  const defectThreshold = parseFloat(settings.defect_threshold || '5');
  const costTolerancePercent = parseFloat(settings.cost_threshold_percent || '0');
  const emailEnabled = settings.email_notifications !== 'false';

  const defectRate = report.production_count > 0 
    ? (report.defect_count / report.production_count) * 100 
    : 0;
  
  const allowedCost = report.budget * (1 + costTolerancePercent / 100);
  const isOverBudget = report.operational_cost > allowedCost;

  const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
  const insertEmail = db.prepare('INSERT INTO email_log (recipient, subject, body) VALUES (?, ?, ?)');

  // CEO user_id = 1
  if (defectRate > defectThreshold) {
    const title = 'Defect Rate Threshold Exceeded';
    const message = `${report.machine_id} on ${report.shift} shift (${report.date}) reported a ${defectRate.toFixed(1)}% defect rate, exceeding the ${defectThreshold}% threshold. Primary cause: ${report.primary_defect_reason}. Submitted by ${supervisorName}.`;
    
    insertNotif.run(1, 'defect_alert', title, message);
    
    if (emailEnabled) {
      insertEmail.run('ceo@opsdash.com', `[OpsDash Alert] ${title}`, message);
    }
  }

  if (isOverBudget) {
    const overAmount = Math.round(report.operational_cost - allowedCost);
    const title = 'Cost Overrun Detected';
    const message = `${report.machine_id} on ${report.date} (${report.shift} shift) exceeded budget by ₱${overAmount.toLocaleString()}. Operational cost: ₱${report.operational_cost.toLocaleString()}, Budget: ₱${report.budget.toLocaleString()}. Submitted by ${supervisorName}.`;
    
    insertNotif.run(1, 'cost_alert', title, message);
    
    if (emailEnabled) {
      insertEmail.run('ceo@opsdash.com', `[OpsDash Alert] ${title}`, message);
    }
  }
}


// ─── Server ───────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ─── AUTH ─────────────────────────────────────────────────────────
  app.post('/api/login', (req, res) => {
    const { username } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username' });
    }
    res.json(user);
  });
  
  // ─── USERS ────────────────────────────────────────────────────────
  app.get('/api/users', (_req, res) => {
    const users = db.prepare('SELECT id, username, role, name FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { username, name } = req.body;
    if (!username || !name) {
      return res.status(400).json({ error: 'Username and name are required' });
    }
    try {
      const info = db.prepare('INSERT INTO users (username, role, name) VALUES (?, ?, ?)').run(username, 'Supervisor', name);
      res.status(201).json({ id: info.lastInsertRowid, username, role: 'Supervisor', name });
    } catch (e: any) {
      if (e.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'CEO') return res.status(403).json({ error: 'Cannot delete CEO account' });
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── REPORTS ──────────────────────────────────────────────────────
  app.get('/api/reports', (req, res) => {
    const { supervisor_id } = req.query;
    if (supervisor_id) {
      const reports = db.prepare('SELECT r.*, u.name as supervisor_name FROM reports r JOIN users u ON r.supervisor_id = u.id WHERE r.supervisor_id = ? ORDER BY date DESC').all(supervisor_id);
      res.json(reports);
    } else {
      const reports = db.prepare('SELECT r.*, u.name as supervisor_name FROM reports r JOIN users u ON r.supervisor_id = u.id ORDER BY date DESC').all();
      res.json(reports);
    }
  });

  app.post('/api/reports', (req, res) => {
    const { supervisor_id, date, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes } = req.body;
    
    try {
      const insert = db.prepare('INSERT INTO reports (date, supervisor_id, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = insert.run(date, supervisor_id, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes);
      
      // Check thresholds and auto-create alerts
      const supervisor = db.prepare('SELECT name FROM users WHERE id = ?').get(supervisor_id) as any;
      checkThresholdsAndAlert(req.body, supervisor?.name || 'Unknown');
      
      res.status(201).json({ id: info.lastInsertRowid, success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const { date, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes } = req.body;
    
    try {
      const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Report not found' });
      
      db.prepare(
        'UPDATE reports SET date=?, shift=?, machine_id=?, production_count=?, defect_count=?, primary_defect_reason=?, operational_cost=?, budget=?, downtime_minutes=?, downtime_reason=?, notes=? WHERE id=?'
      ).run(date, shift, machine_id, production_count, defect_count, primary_defect_reason, operational_cost, budget, downtime_minutes, downtime_reason, notes, id);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    
    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────
  app.get('/api/settings', (_req, res) => {
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(settings);
  });

  app.post('/api/settings', (req, res) => {
    const { settings } = req.body;
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    try {
      const execTx = db.transaction((sets: Record<string, string>) => {
        for (const [k, v] of Object.entries(sets)) {
          stmt.run(k, String(v));
        }
      });
      execTx(settings);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── NOTIFICATIONS ────────────────────────────────────────────────
  app.get('/api/notifications', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(user_id);
    res.json(notifications);
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user_id);
    res.json({ success: true });
  });

  // ─── EMAIL LOG ────────────────────────────────────────────────────
  app.get('/api/email-log', (_req, res) => {
    const logs = db.prepare('SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 50').all();
    res.json(logs);
  });

  // ─── AI INSIGHTS ──────────────────────────────────────────────────
  app.post('/api/ai/insights', async (req, res) => {
    const { summary } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Return a simulated insight if no API key configured
      const insights = [
        `Based on the data provided, Line-A1 shows the highest defect rate during Night shifts. Consider scheduling preventive maintenance before the night rotation begins. Additionally, operational costs have been trending 3-5% above budget on average — review material procurement contracts to identify potential savings.`,
        `Your production output has been consistently strong over the past week, but quality metrics on Line-B1 need attention. The primary defect cause is Machine Calibration issues, which suggest aging equipment. A targeted recalibration program could reduce defect rates by an estimated 2-3%.`,
        `Cost efficiency analysis shows that Morning shifts consistently operate under budget while Night shifts tend to exceed it. This variance correlates with higher downtime during night operations. Recommend cross-training night shift operators and adding a brief handover meeting between shifts to reduce setup delays.`
      ];
      return res.json({ 
        insight: insights[Math.floor(Math.random() * insights.length)],
        simulated: true 
      });
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an operations intelligence analyst for a manufacturing company. Analyze the following KPI summary and provide a concise, actionable insight paragraph (3-4 sentences). Focus on trends, risks, and specific recommendations. Use data points from the summary.\n\nKPI Summary:\n${summary}`
      });
      
      res.json({ 
        insight: response.text || 'Unable to generate insight at this time.',
        simulated: false 
      });
    } catch (e: any) {
      res.status(500).json({ error: 'AI insight generation failed: ' + e.message });
    }
  });

  // ─── Vite Middleware ──────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏭 OpsDash server running on http://localhost:${PORT}`);
  });
}

startServer();
