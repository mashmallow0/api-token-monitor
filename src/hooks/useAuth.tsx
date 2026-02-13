// Authentication hook - BYPASSED for direct access
import { useState, useCallback, createContext, useContext } from 'react';
import type { AuthContextType, UserData } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

// Mock admin user for bypass mode
const mockAdminUser: UserData = {
  uuid: 'admin-bypass-001',
  tokenHash: 'bypass-hash',
  apiKeys: [],
  createdAt: new Date().toISOString(),
  lastAccess: new Date().toISOString(),
  role: 'admin',
  permissions: ['read:dashboard', 'modify:settings', 'manage:providers', 'admin:access'],
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always authenticated as admin
  const [isAuthenticated] = useState(true);
  const [user] = useState<UserData | null>(mockAdminUser);
  const [token] = useState<string | null>('bypass-token');

  const login = useCallback(async (): Promise<boolean> => {
    return true; // Always succeed
  }, []);

  const logout = useCallback(() => {
    // No-op - can't logout in bypass mode
    window.location.reload();
  }, []);

  const isAdmin = true; // Always admin

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
