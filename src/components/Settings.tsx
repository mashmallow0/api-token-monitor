import { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Users, 
  Eye, 
  EyeOff, 
  Copy, 
  Pencil, 
  Trash2,
  Plus,
  X,
  Check,
  Brain,
  Triangle,
  Circle,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PROVIDERS, type NavigateFunction } from '../types';
import { encryptApiKey } from '../utils/crypto';
import { sanitizeInput } from '../utils/auth';

interface StoredProvider {
  id: string;
  provider: string;
  name: string;
  key: string;
  masked: boolean;
}

const mockProviders: StoredProvider[] = [
  { id: '1', provider: 'openai', name: 'OpenAI', key: 'sk-proj-abc123xyz789...', masked: true },
  { id: '2', provider: 'anthropic', name: 'Anthropic', key: 'sk-ant-api03-xyz789abc...', masked: true },
  { id: '3', provider: 'grok', name: 'Grok', key: 'xai-1234567890abcdef...', masked: true },
];

export function Settings({ onNavigate }: { onNavigate: NavigateFunction }) {
  const { user, logout, isAdmin } = useAuth();
  const [providers, setProviders] = useState<StoredProvider[]>(mockProviders);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initials = user ? `${user.role.charAt(0).toUpperCase()}U` : 'GU';

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'openai': return <Brain className="w-6 h-6" />;
      case 'anthropic': return <Triangle className="w-6 h-6" />;
      case 'grok': return <Circle className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'openai': return 'neon-green';
      case 'anthropic': return 'neon-purple';
      case 'grok': return 'neon-red';
      default: return 'neon-cyan';
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setProviders(prev => prev.map(p => 
      p.id === id ? { ...p, masked: !p.masked } : p
    ));
  };

  const copyKey = async (id: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setSelectedProvider('');
    setNewApiKey('');
    setTestResult(null);
    setShowKey(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProvider('');
    setNewApiKey('');
    setTestResult(null);
    setIsTesting(false);
  };

  const testConnection = async () => {
    if (!newApiKey.trim()) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    // Simulate API test
    setTimeout(() => {
      setTestResult(true);
      setIsTesting(false);
    }, 1500);
  };

  const saveProvider = async () => {
    if (!selectedProvider || !newApiKey.trim()) return;

    const providerInfo = PROVIDERS.find(p => p.id === selectedProvider);
    if (!providerInfo) return;

    // Encrypt the API key (for production use)
    await encryptApiKey(newApiKey, user?.uuid || 'default');

    const newProvider: StoredProvider = {
      id: Date.now().toString(),
      provider: selectedProvider,
      name: providerInfo.name,
      key: newApiKey, // In production, store encrypted
      masked: true
    };

    setProviders(prev => [...prev, newProvider]);
    closeModal();
  };

  const deleteProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
  };

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
          <button className="nav-item active">
            <SettingsIcon className="w-5 h-5" />
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

      {/* Main Content */}
      <main className="ml-[260px] min-h-screen p-8 relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
              <p className="text-gray-400">Manage your API providers and configurations</p>
            </div>
            <button 
              onClick={openModal}
              className="btn-neon flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Provider
            </button>
          </div>
        </header>

        {/* API Providers Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">API Providers</h2>
          <div className="space-y-4">
            {providers.map((provider) => (
              <div key={provider.id} className="provider-card">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-${getProviderColor(provider.provider)}/10 border border-${getProviderColor(provider.provider)}/30 flex items-center justify-center flex-shrink-0 text-${getProviderColor(provider.provider)}`}>
                      {getProviderIcon(provider.provider)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{provider.name}</h3>
                      <p className="text-xs text-gray-500">{
                        PROVIDERS.find(p => p.id === provider.provider)?.models.join(', ') || 'AI Model'
                      }</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 lg:max-w-md">
                    <div className="provider-key">
                      <span className="key-text">
                        {provider.masked 
                          ? `${provider.key.substring(0, 3)}-••••••••••••••••` 
                          : sanitizeInput(provider.key)}
                      </span>
                      <div className="provider-actions ml-auto">
                        <button 
                          className="action-btn" 
                          onClick={() => toggleKeyVisibility(provider.id)}
                          title="Show/Hide"
                        >
                          {provider.masked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button 
                          className="action-btn" 
                          onClick={() => copyKey(provider.id, provider.key)}
                          title="Copy"
                        >
                          {copiedId === provider.id ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="action-btn" title="Edit">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                      className="action-btn danger" 
                      title="Delete"
                      onClick={() => deleteProvider(provider.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-6">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Alert Threshold (%)</label>
              <input type="number" defaultValue="80" min="1" max="100" className="form-input" />
              <p className="text-xs text-gray-500 mt-2">Receive alerts when API usage exceeds this percentage</p>
            </div>
            <div>
              <label className="form-label">Default Timezone</label>
              <select className="form-select">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>
            <div>
              <label className="form-label">Auto-refresh Interval</label>
              <select className="form-select">
                <option>5 seconds</option>
                <option selected>30 seconds</option>
                <option>1 minute</option>
                <option>5 minutes</option>
              </select>
            </div>
            <div>
              <label className="form-label">Theme</label>
              <select className="form-select">
                <option selected>Dark (Cyberpunk)</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-secondary">Reset Defaults</button>
            <button className="btn-neon">Save Changes</button>
          </div>
        </div>
      </main>

      {/* Add Provider Modal */}
      {showModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="text-white">Add API Provider</h3>
              <button className="modal-close" onClick={closeModal}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body space-y-4">
              <div>
                <label className="form-label">Provider Name</label>
                <select 
                  className="form-select" 
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                >
                  <option value="">Select a provider...</option>
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="custom">Custom Provider</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">API Key</label>
                <div className="input-with-toggle">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="form-input pr-12"
                    placeholder="Enter API key"
                  />
                  <button 
                    type="button" 
                    className="input-toggle" 
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {testResult !== null && (
                <div className={testResult ? 'p-4 rounded-xl bg-neon-green/10 border border-neon-green/30' : 'p-4 rounded-xl bg-neon-red/10 border border-neon-red/30'}>
                  <div className={`flex items-center gap-2 ${testResult ? 'text-neon-green' : 'text-neon-red'}`}>
                    {testResult ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-semibold">
                      {testResult ? 'Connection successful!' : 'Connection failed'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${testResult ? 'text-gray-400' : 'text-gray-400'}`}>
                    {testResult ? 'API key is valid and ready to use.' : 'Please check your API key and try again.'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={testConnection}
                disabled={isTesting || !selectedProvider || !newApiKey}
              >
                {isTesting ? (
                  <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                ) : (
                  'Test Connection'
                )}
              </button>
              <button 
                type="button" 
                className="btn-neon"
                onClick={saveProvider}
                disabled={!selectedProvider || !newApiKey}
              >
                Save Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}