import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRateLimit } from '../hooks/useRateLimit';
import { sanitizeInput } from '../utils/auth';

export function Login() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { isLocked, retryAfter, checkAttempt } = useRateLimit('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check rate limit
    const rateCheck = checkAttempt();
    if (!rateCheck.allowed) {
      setError(`Rate limit exceeded. Please wait ${Math.ceil(rateCheck.retryAfter / 60)} minutes.`);
      return;
    }

    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setIsLoading(true);

    try {
      const sanitizedToken = sanitizeInput(token.trim());
      const success = await login(sanitizedToken);
      
      if (!success) {
        setError('Invalid access token');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg-primary">
      {/* Animated Grid Background */}
      <div className="grid-bg" />
      
      {/* Animated Particles */}
      <div className="particles-container">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="particle" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </div>

      {/* Radial Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-[120px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card p-8 md:p-10 animate-float">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 mb-4 glow-cyan">
              <Shield className="w-8 h-8 text-neon-cyan" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">API Token Monitor</h1>
            <p className="text-sm text-gray-400">v2.0.0 Enterprise</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Input */}
            <div>
              <label className="form-label">Access Token</label>
              <div className="input-with-toggle">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="form-input pr-12"
                  placeholder="Enter your API token"
                  autoComplete="off"
                  disabled={isLoading || isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="input-toggle"
                  disabled={isLoading || isLocked}
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Rate Limit Warning */}
            {isLocked && (
              <div className="alert alert-warning">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Rate Limit Exceeded</p>
                  <p className="text-sm opacity-80">
                    Please wait <span>{Math.ceil(retryAfter / 60)}</span> minutes before retrying.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !isLocked && (
              <div className="alert alert-danger">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Authentication Failed</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* Authenticate Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner" style={{ width: '20px', height: '20px' }} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Authenticate</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure 256-bit encrypted connection</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">API Token Monitor v2.0.0 • Build 2025.02.13</p>
          <p className="text-xs text-gray-600 mt-1">© 2025 SecureAPI Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}