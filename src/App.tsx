import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import CEODashboard from './components/CEODashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  if (user.role === 'CEO') {
    return <CEODashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <SupervisorDashboard user={user} onLogout={() => setUser(null)} />;
}

