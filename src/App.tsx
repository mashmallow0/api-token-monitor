import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Admin } from './components/Admin';
import type { Page } from './types';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: Page) => setCurrentPage(page);

  switch (currentPage) {
    case 'settings':
      return <Settings onNavigate={handleNavigate} />;
    case 'admin':
      return <Admin onNavigate={handleNavigate} />;
    case 'dashboard':
    default:
      return <Dashboard onNavigate={handleNavigate} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
