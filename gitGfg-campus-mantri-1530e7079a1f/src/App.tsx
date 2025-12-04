import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Expose admin open helpers
  useEffect(() => {
    try {
      (window as any).openAdminPanel = () => navigate('/admin/login');
      (window as any).openDatabaseTest = () => navigate('/dbtest');
    } catch (err) {
      console.error('Error setting up admin access:', err);
    }
  }, [navigate]);

  const handleAdminLogin = () => {
    try {
      setLoading(true);
      setTimeout(() => {
        setIsAdminAuthenticated(true);
        setLoading(false);
        navigate('/admin');
      }, 500);
    } catch (err) {
      console.error('Error during admin login:', err);
      setError('Failed to login to admin panel');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      setIsAdminAuthenticated(false);
      navigate('/');
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

  try {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <React.Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<AuthWrapper />} />
              <Route path="/admin/login" element={<AdminLogin onLogin={handleAdminLogin} onBack={() => navigate('/')} />} />
              <Route path="/admin" element={isAdminAuthenticated ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/admin/login" replace />} />
              <Route path="/dbtest" element={<DatabaseConnectionTest />} />
              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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
            Refresh Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;