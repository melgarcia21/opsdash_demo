import { useState, useEffect } from 'react';
import { User } from '../types';
import { Building2, ArrowRight, Shield, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

const roleIcons: Record<string, typeof Shield> = {
  CEO: Shield,
  Supervisor: ClipboardList,
};

const roleColors: Record<string, string> = {
  CEO: 'from-blue-500 to-indigo-600',
  Supervisor: 'from-emerald-500 to-teal-600',
};

export default function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Could not load users', err));
  }, []);

  const handleLogin = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Login failed');
      const user = await res.json();
      onLogin(user);
    } catch (e) {
      console.error(e);
      alert('Login failed. Ensure backend is running.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20"
            >
              <Building2 className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">OpsDash</h1>
            <p className="text-slate-400 text-sm">Executive Operations Intelligence</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Profile Selection */}
          <div className="p-6">
            <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Select a profile</h2>

            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  Loading profiles...
                </div>
              ) : (
                users.map((usr, i) => {
                  const Icon = roleIcons[usr.role] || Shield;
                  const gradient = roleColors[usr.role] || 'from-slate-500 to-slate-600';

                  return (
                    <motion.button
                      key={usr.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      onClick={() => handleLogin(usr.username)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all group text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white group-hover:text-blue-300 transition-colors text-sm">{usr.name}</p>
                          <p className="text-xs text-slate-500">{usr.role}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-slate-600 text-xs mt-6 text-center"
        >
          OpsDash MVP Prototype · For Manufacturing SME CEOs
        </motion.p>
      </motion.div>
    </div>
  );
}
