import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Settings, 
  Users,
  Zap,
  Brain,
  Triangle,
  Circle
} from 'lucide-react';
import { PROVIDERS, type NavigateFunction } from '../types';

interface ProviderUsage {
  id: string;
  name: string;
  usage: number;
  limit: number;
  color: string;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string;
  status: number;
  latency: number;
}

const mockUsage: ProviderUsage[] = [
  { id: 'openai', name: 'OpenAI', usage: 2100, limit: 5000, color: 'green' },
  { id: 'anthropic', name: 'Anthropic', usage: 3800, limit: 5000, color: 'purple' },
  { id: 'grok', name: 'Grok', usage: 4600, limit: 5000, color: 'red' },
];

const mockActivity: ActivityItem[] = [
  { id: '1', timestamp: '2025-02-13 07:02:34', provider: 'OpenAI', endpoint: '/v1/chat/completions', status: 200, latency: 234 },
  { id: '2', timestamp: '2025-02-13 07:01:12', provider: 'Anthropic', endpoint: '/v1/messages', status: 200, latency: 412 },
  { id: '3', timestamp: '2025-02-13 07:00:45', provider: 'OpenAI', endpoint: '/v1/embeddings', status: 200, latency: 156 },
  { id: '4', timestamp: '2025-02-13 06:58:22', provider: 'Grok', endpoint: '/v1/chat', status: 429, latency: 0 },
  { id: '5', timestamp: '2025-02-13 06:55:18', provider: 'Anthropic', endpoint: '/v1/messages', status: 200, latency: 389 },
];

export function Dashboard({ onNavigate }: { onNavigate: NavigateFunction }) {
  const { user, logout, isAdmin } = useAuth();
  const [progress, setProgress] = useState(0);
  const [usagePercent, setUsagePercent] = useState(50);

  useEffect(() => {
    const used = 5234;
    const total = 10000;
    const percent = Math.round((used / total) * 100);
    
    const timer = setTimeout(() => {
      setUsagePercent(percent);
      setProgress(percent);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getProgressColor = () => {
    if (progress < 50) return 'green';
    if (progress < 80) return 'yellow';
    return 'red';
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'openai': return <Brain className="w-5 h-5" />;
      case 'anthropic': return <Triangle className="w-5 h-5" />;
      case 'grok': return <Circle className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const initials = user ? `${user.role.charAt(0).toUpperCase()}U` : 'GU';

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="grid-bg" />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">API Token Monitor</h2>
              <p className="text-xs text-gray-500">v2.0.0</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => onNavigate('settings')} className="nav-item">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          {isAdmin && (
            <button onClick={() => onNavigate('admin')} className="nav-item">
              <Users className="w-5 h-5" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer" onClick={logout}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.role || 'User'}</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Admin' : 'User'}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-[260px] min-h-screen p-8 relative z-10">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
              <p className="text-gray-400">Monitor your API usage and token statistics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-sm font-medium text-neon-green">All Systems Operational</span>
              </div>
            </div>
          </div>
        </header>

        <div className="glass-card p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">API Usage Overview</h2>
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="relative">
              <svg className="progress-ring" width="240" height="240">
                <circle className="progress-ring-bg" cx="120" cy="120" r="100" />
                <circle
                  className={`progress-ring-fill ${getProgressColor()}`}
                  cx="120"
                  cy="120"
                  r="100"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white">{usagePercent}%</span>
                <span className="text-sm text-gray-400 mt-1">Used</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="stat-card">
                <p className="stat-label">Requests Used</p>
                <p className="stat-value cyan">5,234</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Requests Remaining</p>
                <p className="stat-value green">5,234</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Quota</p>
                <p className="stat-value purple">10,000</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Reset Date</p>
                <p className="stat-value pink">Feb 28</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">API Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockUsage.map((provider) => {
              const percent = Math.round((provider.usage / provider.limit) * 100);
              return (
                <div key={provider.id} className="provider-card">
                  <div className="provider-header">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-${provider.color}/10 border border-${provider.color}/30 flex items-center justify-center text-${provider.color}`}>
                        {getProviderIcon(provider.id)}
                      </div>
                      <div>
                        <h3 className="provider-name">{provider.name}</h3>
                        <p className="text-xs text-gray-500">
                          {PROVIDERS.find(p => p.id === provider.id)?.models[0] || 'AI Model'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-${provider.color} font-bold`}>{percent}%</span>
                  </div>
                  <div className="mini-progress mb-2">
                    <div 
                      className={`mini-progress-fill ${provider.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{provider.usage.toLocaleString()} / {provider.limit.toLocaleString()}</span>
                    <span>Resets in 12h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Activity Log</h2>
            <button className="text-sm text-neon-cyan hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Provider</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {mockActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td className="font-mono text-sm">{activity.timestamp}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.provider === 'OpenAI' ? 'bg-neon-green' : 
                          activity.provider === 'Anthropic' ? 'bg-neon-purple' : 'bg-neon-red'
                        }`} />
                        <span>{activity.provider}</span>
                      </div>
                    </td>
                    <td className="font-mono text-sm text-gray-400">{activity.endpoint}</td>
                    <td>
                      <span className={`status-badge ${activity.status === 200 ? 'active' : 'inactive'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${activity.status === 200 ? 'text-neon-green' : 'text-neon-red'}`} />
                        {activity.status === 200 ? '200 OK' : '429 Rate Limit'}
                      </span>
                    </td>
                    <td className={`font-mono ${activity.status === 200 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {activity.latency > 0 ? `${activity.latency}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
