import React, { useState, useEffect } from 'react';
import { authService, AuthUser } from '../lib/auth';
import { testSupabaseConnection, supabase } from '../lib/supabase';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import CampusMantriPortal from './CampusMantriPortal';

const AuthWrapper: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        
        // Test database connection first
        const isConnected = await testSupabaseConnection();
        if (!isConnected) {
          setConnectionError('Unable to connect to database. Please check your internet connection and try again.');
          setLoading(false);
          return;
        }
        
        
        // Try to initialize auth from existing session
        const sessionUser = await authService.initializeAuth();
        if (sessionUser) {
          setUser(sessionUser);
        } else {
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setConnectionError('Failed to initialize application. Please refresh the page and try again.');
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  const handleAuthSuccess = (user: AuthUser) => {
    setUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h3>
          <p className="text-red-600 mb-4">{connectionError}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }


  if (user) {
    return <CampusMantriPortal user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      {/* Admin Access Button - Only visible on login/register page */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => {
            // Trigger the admin access function
            if ((window as any).openAdminPanel) {
              (window as any).openAdminPanel();
            } else {
              // Fallback: navigate to admin
              window.location.href = '/admin';
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-.732 5.162-2.217 7.162-4.248.185-.187.366-.378.543-.573A11.951 11.951 0 0021 9c0-1.357-.23-2.662-.632-3.874z" />
          </svg>
          <span>Admin Panel</span>
        </button>
      </div>
      
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm 
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm 
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
};

export default AuthWrapper;