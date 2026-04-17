export interface User {
  id: number;
  username: string;
  role: 'CEO' | 'Supervisor';
  name: string;
}

export interface Report {
  id: number;
  date: string; // YYYY-MM-DD
  supervisor_id: number;
  supervisor_name?: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  machine_id: string;
  production_count: number;
  defect_count: number;
  primary_defect_reason: string;
  operational_cost: number;
  budget: number;
  downtime_minutes: number;
  downtime_reason: string;
  notes: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'defect_alert' | 'cost_alert' | 'info' | 'system';
  title: string;
  message: string;
  is_read: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}

export interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  sent_at: string;
}

export interface Filters {
  dateFrom: string;
  dateTo: string;
  machineId: string;
  shift: string;
}
