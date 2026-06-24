import React from 'react';
import { Shield, LogOut, Home } from 'lucide-react';

interface HeaderProps {
  currentView: 'portal' | 'admin' | 'login';
  setCurrentView: (view: 'portal' | 'admin' | 'login') => void;
  isAdminAuthenticated: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  setCurrentView, 
  isAdminAuthenticated, 
  onLogout 
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentView === 'admin' ? 'Admin Dashboard' : 'Campus Mantri Portal'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAdminAuthenticated && (
              <>
                <button
                  onClick={() => setCurrentView('portal')}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="h-5 w-5" />
                  <span>Portal</span>
                </button>
                
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;