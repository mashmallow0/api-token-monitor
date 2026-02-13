import { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Users, 
  Key,
  Copy,
  Pencil,
  Ban,
  Check,
  Zap,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { generateSecureToken, hashToken } from '../utils/crypto';
import { createUser } from '../utils/storage';
import { logAuditEvent } from '../utils/auth';
import type { NavigateFunction } from '../types';

interface User {
  id: string;
  token: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  expiresAt: string | null;
}

const mockUsers: User[] = [
  { id: '1', token: 'atm_v2_••••••a3f9', role: 'admin', status: 'active', createdAt: 'Feb 13, 2025', expiresAt: 'Never' },
  { id: '2', token: 'atm_v2_••••••b7e2', role: 'manager', status: 'active', createdAt: 'Feb 12, 2025', expiresAt: 'Mar 14, 2025' },
  { id: '3', token: 'atm_v2_••••••c1a5', role: 'user', status: 'active', createdAt: 'Feb 10, 2025', expiresAt: 'Mar 12, 2025' },
  { id: '4', token: 'atm_v2_••••••d8f1', role: 'user', status: 'inactive', createdAt: 'Feb 05, 2025', expiresAt: null },
  { id: '5', token: 'atm_v2_••••••e4b6', role: 'manager', status: 'pending', createdAt: 'Feb 01, 2025', expiresAt: 'Mar 03, 2025' },
];

export function Admin({ onNavigate }: { onNavigate: NavigateFunction }) {
  const { user, logout, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedRole, setSelectedRole] = useState('user');
  const [permissions, setPermissions] = useState({
    readDashboard: true,
    modifySettings: false,
    manageProviders: false,
    adminAccess: false,
  });
  const [expiresIn, setExpiresIn] = useState('30');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const initials = user ? `${user.role.charAt(0).toUpperCase()}U` : 'GU';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-neon-yellow mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">You don't have permission to access this page.</p>
          <button onClick={() => onNavigate('dashboard')} className="btn-neon">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handlePermissionChange = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateToken = async () => {
    setIsGenerating(true);
    
    setTimeout(async () => {
      const newToken = generateSecureToken();
      const tokenHash = await hashToken(newToken);
      
      try {
        const newUser = await createUser(tokenHash, selectedRole);
        
        const userEntry: User = {
          id: newUser.uuid,
          token: newToken.substring(0, 10) + '••••••',
          role: selectedRole as 'admin' | 'manager' | 'user',
          status: 'active',
          createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          expiresAt: expiresIn === 'never' ? 'Never' : new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        };
        
        setUsers(prev => [userEntry, ...prev]);
        setGeneratedToken(newToken);
        logAuditEvent('TOKEN_GENERATED', { role: selectedRole, permissions });
      } catch (error) {
        console.error('Failed to create user:', error);
      }
      
      setIsGenerating(false);
    }, 1500);
  };

  const copyToken = async () => {
    if (!generatedToken) return;
    
    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-neon-red/10 text-neon-red border-neon-red/20';
      case 'manager': return 'bg-neon-purple/10 text-neon-purple border-neon-purple/20';
      default: return 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'active';
      case 'inactive': return 'inactive';
      case 'pending': return 'pending';
      default: return 'active';
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-neon-green';
      case 'inactive': return 'bg-neon-red';
      case 'pending': return 'bg-neon-yellow';
      default: return 'bg-neon-green';
    }
  };

  const filteredUsers = users.filter(u => 
    u.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Animated Grid Background */}
      <div className="grid-bg" />

      {/* Sidebar */}
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
          <button onClick={() => onNavigate('dashboard')} className="nav-item">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => onNavigate('settings')} className="nav-item">
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button className="nav-item active">
            <Users className="w-5 h-5" />
            <span>Admin</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer" onClick={logout}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.role || 'User'}</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[260px] min-h-screen p-8 relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Admin Panel</h1>
            <p className="text-gray-400">Manage access tokens and system configuration</p>
          </div>
        </header>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-neon-green" />
              </div>
              <span className="text-sm text-gray-400">System Status</span>
            </div>
            <p className="text-2xl font-bold text-neon-green">Healthy</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-neon-cyan" />
              </div>
              <span className="text-sm text-gray-400">Active Users</span>
            </div>
            <p className="text-2xl font-bold text-neon-cyan">{users.filter(u => u.status === 'active').length}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-neon-purple" />
              </div>
              <span className="text-sm text-gray-400">Active Tokens</span>
            </div>
            <p className="text-2xl font-bold text-neon-purple">{users.length}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-neon-pink" />
              </div>
              <span className="text-sm text-gray-400">Requests/min</span>
            </div>
            <p className="text-2xl font-bold text-neon-pink">1,234</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generate Token Card */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-neon-cyan" />
                Generate Token
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="form-label">Role</label>
                  <select 
                    className="form-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Permissions</label>
                  <div className="checkbox-group">
                    <label className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={permissions.readDashboard}
                        onChange={() => handlePermissionChange('readDashboard')}
                      />
                      <span>Read Dashboard</span>
                    </label>
                    <label className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={permissions.modifySettings}
                        onChange={() => handlePermissionChange('modifySettings')}
                      />
                      <span>Modify Settings</span>
                    </label>
                    <label className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={permissions.manageProviders}
                        onChange={() => handlePermissionChange('manageProviders')}
                      />
                      <span>Manage Providers</span>
                    </label>
                    <label className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={permissions.adminAccess}
                        onChange={() => handlePermissionChange('adminAccess')}
                      />
                      <span>Admin Access</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Expires In</label>
                  <select 
                    className="form-select"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                
                <button 
                  onClick={generateToken}
                  disabled={isGenerating}
                  className="btn-neon w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="loading-spinner" style={{ width: '20px', height: '20px' }} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    'Generate Token'
                  )}
                </button>
              </div>
              
              {/* Token Result */}
              {generatedToken && (
                <div className="mt-6">
                  <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
                    <p className="text-sm text-gray-400 mb-2">Generated Token:</p>
                    <div className="token-result !mx-0 !mt-0">
                      <span className="token-value">{generatedToken}</span>
                      <button 
                        className="action-btn" 
                        onClick={copyToken}
                        title="Copy"
                      >
                        {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-neon-yellow mt-3 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Copy this now - it won't be shown again!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Management */}
          <div className="lg:col-span-2">
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">User Management</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search tokens..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input text-sm py-2 pl-10 w-48"
                    />
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userItem) => {
                      const roleBadgeClass = getRoleBadgeClass(userItem.role);
                      const statusBadgeClass = getStatusBadgeClass(userItem.status);
                      const statusDotClass = getStatusDotClass(userItem.status);
                      const roleLabel = userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1);
                      const statusLabel = userItem.status.charAt(0).toUpperCase() + userItem.status.slice(1);
                      
                      return (
                        <tr key={userItem.id}>
                          <td>
                            <code className="font-mono text-sm text-neon-cyan">{userItem.token}</code>
                          </td>
                          <td>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleBadgeClass}`}>
                              {roleLabel}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${statusBadgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="text-sm text-gray-400">{userItem.createdAt}</td>
                          <td className="text-sm text-gray-400">{userItem.expiresAt || '-'}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button className="action-btn" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button className="action-btn danger" title="Revoke">
                                <Ban className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="border-t border-white/10">
                <div className="pagination">
                  <button className="page-btn" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="page-btn active">1</button>
                  <button className="page-btn">2</button>
                  <button className="page-btn">3</button>
                  <span className="text-gray-500 px-2">...</span>
                  <button className="page-btn">12</button>
                  <button className="page-btn">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}