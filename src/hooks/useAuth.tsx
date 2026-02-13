// Authentication hook
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { AuthContextType, UserData } from '../types';
import { hashToken, verifyToken } from '../utils/crypto';
import { findUserByTokenHash, createUser } from '../utils/storage';
import { logAuditEvent } from '../utils/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      validateSession(storedToken);
    }
  }, []);

  const validateSession = async (storedToken: string) => {
    try {
      const tokenHash = await hashToken(storedToken);
      const userData = await findUserByTokenHash(tokenHash);
      if (userData) {
        setIsAuthenticated(true);
        setUser(userData);
        setToken(storedToken);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
    }
  };

  const login = useCallback(async (inputToken: string): Promise<boolean> => {
    try {
      const tokenHash = await hashToken(inputToken);
      const userData = await findUserByTokenHash(tokenHash);

      if (userData) {
        setIsAuthenticated(true);
        setUser(userData);
        setToken(inputToken);
        localStorage.setItem('auth_token', inputToken);
        logAuditEvent('LOGIN_SUCCESS', { uuid: userData.uuid });
        return true;
      }

      const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
      if (adminHash && await verifyToken(inputToken, adminHash)) {
        const adminUser = await createUser(tokenHash, 'admin');
        adminUser.permissions = ['read:dashboard', 'modify:settings', 'manage:providers', 'admin:access'];
        setIsAuthenticated(true);
        setUser(adminUser);
        setToken(inputToken);
        localStorage.setItem('auth_token', inputToken);
        logAuditEvent('ADMIN_LOGIN_SUCCESS', { uuid: adminUser.uuid });
        return true;
      }

      logAuditEvent('LOGIN_FAILED', { reason: 'Invalid token' });
      return false;
    } catch (error) {
      logAuditEvent('LOGIN_ERROR', { error: String(error) });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      logAuditEvent('LOGOUT', { uuid: user.uuid });
    }
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, [user]);

  const isAdmin = user?.role === 'admin' || user?.permissions?.includes('admin:access') || false;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
