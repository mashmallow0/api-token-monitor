import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Admin } from './components/Admin';
import type { Page } from './types';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

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

// Bypass auth - direct access to app
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
