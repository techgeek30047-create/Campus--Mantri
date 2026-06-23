import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Lazy load components to prevent loading issues
const AuthWrapper = React.lazy(() => import('./components/AuthWrapper'));
const AdminLogin = React.lazy(() => import('./components/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const DatabaseConnectionTest = React.lazy(() => import('./components/DatabaseConnectionTest'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [currentView, setCurrentView] = useState<'portal' | 'admin' | 'login' | 'dbtest' | 'certificate'>('portal');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [currentAdmin, setCurrentAdmin] = useState<any | null>(() => {
    const stored = localStorage.getItem('adminUser');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const validateStoredAdminSession = async () => {
      try {
        const storedAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        if (!storedAuthenticated) return;

        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminUser');
          setIsAdminAuthenticated(false);
          setCurrentAdmin(null);
          if (currentView === 'admin') {
            setCurrentView('login');
            window.history.pushState({}, '', '/admin');
          }
        }
      } catch (err) {
        console.error('Admin session validation error:', err);
      }
    };

    validateStoredAdminSession();
  }, [currentView]);

  // Check URL for admin access or certificate generator route
  useEffect(() => {
    try {
      const checkRoute = () => {
        const path = window.location.pathname;
        const hash = window.location.hash;

        if (path === '/admin' || path.startsWith('/admin') || hash === '#admin' || hash.includes('admin')) {
          if (localStorage.getItem('adminAuthenticated') === 'true') {
            setCurrentView('admin');
          } else {
            setCurrentView('login');
          }
        } else if (path === '/dbtest' || path.startsWith('/dbtest') || hash === '#dbtest' || hash.includes('dbtest')) {
          setCurrentView('dbtest');
        } else {
          setCurrentView('portal');
        }
      };
      
      checkRoute();
      
      const handleHashChange = () => {
        checkRoute();
      };
      
      const handlePopState = () => {
        checkRoute();
      };
      
      window.addEventListener('hashchange', handleHashChange);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('popstate', handlePopState);
      };
    } catch (err) {
      console.error('Error in useEffect:', err);
      setError('Failed to initialize application');
    }
  }, []);

  // Handle database test access
  const handleDatabaseTest = () => {
    try {
      setCurrentView('dbtest');
      window.history.pushState({}, '', '/dbtest');
    } catch (err) {
      console.error('Error accessing database test:', err);
    }
  };

  // Handle certificate generator access from anywhere in the app
  const handleCertificateAccess = () => {
    try {
      setCurrentView('portal');
      window.history.pushState({}, '', '/');
    } catch (err) {
      console.error('Error accessing certificate generator:', err);
    }
  };

  // Handle admin access from anywhere in the app
  const handleAdminAccess = () => {
    try {
      setCurrentView('login');
      window.history.pushState({}, '', '/admin');
    } catch (err) {
      console.error('Error accessing admin:', err);
    }
  };

  // Expose admin access globally
  useEffect(() => {
    try {
      (window as any).openAdminPanel = handleAdminAccess;
      (window as any).openDatabaseTest = handleDatabaseTest;
    } catch (err) {
      console.error('Error setting up admin access:', err);
    }
  }, []);

  const handleAdminLogin = (adminData: any) => {
    try {
      localStorage.setItem('adminAuthenticated', 'true');
      localStorage.setItem('adminUser', JSON.stringify(adminData));
      setLoading(true);
      setCurrentAdmin(adminData);
      setIsAdminAuthenticated(true);
      setCurrentView('admin');
      window.history.pushState({}, '', '/admin');
    } catch (err) {
      console.error('Error during admin login:', err);
      setError('Failed to login to admin panel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase.auth?.signOut) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminUser');
      setIsAdminAuthenticated(false);
      setCurrentAdmin(null);
      setCurrentView('portal');
      window.history.pushState({}, '', '/');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-800 mb-4">Application Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  try {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <React.Suspense fallback={<LoadingSpinner />}>
            {currentView === 'portal' && <AuthWrapper />}
            {currentView === 'login' && (
              <AdminLogin onLogin={handleAdminLogin} onBack={() => setCurrentView('portal')} />
            )}
            {currentView === 'admin' && isAdminAuthenticated && (
              <AdminDashboard onLogout={handleLogout} currentAdmin={currentAdmin} />
            )}
            {currentView === 'dbtest' && (
              <DatabaseConnectionTest />
            )}
          </React.Suspense>
        </div>
      </ErrorBoundary>
    );
  } catch (err) {
    console.error('Error rendering App:', err);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-800 mb-4">Render Error</h2>
          <p className="text-red-600 mb-4">Failed to render the application</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;
