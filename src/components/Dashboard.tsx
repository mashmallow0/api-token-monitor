import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Settings, 
  Users,
  Zap,
  Brain,
  Triangle,
  Circle,
  Bookmark,
  BookmarkCheck,
  X,
  ChevronDown,
  Filter
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

  // Filter states
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<Array<{ 
    id: string; 
    name: string; 
    providerFilter: string; 
    statusFilter: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('api-token-monitor-saved-filters');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [showLoadFilterDropdown, setShowLoadFilterDropdown] = useState(false);

  // Persist saved filters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('api-token-monitor-saved-filters', JSON.stringify(savedFilters));
    }
  }, [savedFilters]);

  // Save current filter
  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const newFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      providerFilter,
      statusFilter,
    };
    setSavedFilters([...savedFilters, newFilter]);
    setNewFilterName('');
    setShowSaveFilterModal(false);
  };

  // Load saved filter
  const handleLoadFilter = (filter: typeof savedFilters[0]) => {
    setProviderFilter(filter.providerFilter);
    setStatusFilter(filter.statusFilter);
    setShowLoadFilterDropdown(false);
  };

  // Delete saved filter
  const handleDeleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedFilters(savedFilters.filter(f => f.id !== id));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setProviderFilter('all');
    setStatusFilter('all');
  };

  // Filtered activity data
  const filteredActivity = useMemo(() => {
    return mockActivity.filter(activity => {
      if (providerFilter !== 'all' && activity.provider.toLowerCase() !== providerFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter === 'success' && activity.status !== 200) {
        return false;
      }
      if (statusFilter === 'error' && activity.status === 200) {
        return false;
      }
      return true;
    });
  }, [providerFilter, statusFilter]);

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
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Activity Log</h2>
              
              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neon-cyan" />
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="bg-bg-secondary/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan focus:outline-none"
                  >
                    <option value="all">All Providers</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                    <option value="Grok">Grok</option>
                  </select>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-bg-secondary/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Save/Load Filter Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSaveFilterModal(true)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm hover:bg-neon-cyan/20 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save
                  </button>
                  
                  {savedFilters.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowLoadFilterDropdown(!showLoadFilterDropdown)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-sm hover:bg-neon-purple/20 transition-colors"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                        Load
                        <ChevronDown className={`w-3 h-3 transition-transform ${showLoadFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showLoadFilterDropdown && (
                        <div className="absolute right-0 mt-2 w-64 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                          <div className="p-3 border-b border-white/10">
                            <span className="text-xs font-medium text-gray-400">Saved Filters ({savedFilters.length})</span>
                          </div>
                          {savedFilters.map((filter) => (
                            <div
                              key={filter.id}
                              onClick={() => handleLoadFilter(filter)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{filter.name}</p>
                                <p className="text-xs text-gray-500">
                                  {filter.providerFilter !== 'all' && `${filter.providerFilter}`}
                                  {filter.providerFilter !== 'all' && filter.statusFilter !== 'all' && ' • '}
                                  {filter.statusFilter !== 'all' && `${filter.statusFilter}`}
                                  {filter.providerFilter === 'all' && filter.statusFilter === 'all' && 'No filters'}
                                </p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteFilter(filter.id, e)}
                                className="p-1 text-gray-500 hover:text-neon-red ml-2"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(providerFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      onClick={handleClearFilters}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm hover:bg-neon-red/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-3 border-b border-white/10 bg-white/5">
            <p className="text-sm text-gray-400">
              Showing <span className="text-white font-medium">{filteredActivity.length}</span> of <span className="text-white font-medium">{mockActivity.length}</span> activities
            </p>
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
                {filteredActivity.map((activity) => (
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

        {/* Save Filter Modal */}
        {showSaveFilterModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md mx-4 border border-neon-cyan/30">
              <h3 className="text-xl font-bold text-white mb-2">Save Filter</h3>
              <p className="text-sm text-gray-400 mb-4">
                Save current filter settings for future use.
              </p>
              <input
                type="text"
                placeholder='Filter name (e.g. "OpenAI Errors")'
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="w-full bg-bg-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-neon-cyan focus:outline-none mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFilter();
                  if (e.key === 'Escape') setShowSaveFilterModal(false);
                }}
              />
              
              <div className="bg-bg-secondary/50 rounded-lg p-4 mb-4 border border-white/10">
                <p className="font-medium text-neon-cyan mb-2 text-sm">Current filter:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  {providerFilter !== 'all' && <li>Provider: {providerFilter}</li>}
                  {statusFilter !== 'all' && <li>Status: {statusFilter}</li>}
                  {providerFilter === 'all' && statusFilter === 'all' && (
                    <li className="text-gray-500">No active filters</li>
                  )}
                </ul>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSaveFilterModal(false);
                    setNewFilterName('');
                  }}
                  className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  disabled={!newFilterName.trim()}
                  className="px-4 py-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
