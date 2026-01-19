import { ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import AdminRegister from './AdminRegister';

interface AdminLoginProps {
  onLogin: (admin: any) => void; // will receive Admin object on success
  onBack?: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerMode, setRegisterMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    try {
      // Lookup admin in DB
      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('*')
        .eq('username', credentials.username.trim())
        .limit(1)
        .single();

      if (adminErr || !adminData) {
        setError('Invalid admin credentials');
        setLoading(false);
        return;
      }

      // Support both plaintext password (legacy) and hashed password (password_hash)
      const storedHash = adminData.password_hash || adminData.password || null;
      if (!storedHash) {
        setError('Invalid admin credentials');
        setLoading(false);
        return;
      }

      let valid = false;
      try {
        if (adminData.password_hash) {
          valid = bcrypt.compareSync(credentials.password, adminData.password_hash);
        } else {
          // legacy plaintext fallback
          valid = adminData.password === credentials.password;
        }
      } catch (e) {
        console.error('Password check error:', e);
      }

      if (!valid) {
        setError('Invalid admin credentials');
        setLoading(false);
        return;
      }

      // Record login event
      try {
        await supabase.from('admin_logins').insert([{ admin_id: adminData.id }]);
      } catch (logErr) {
        console.warn('Failed to record admin login:', logErr);
      }

      // Call back with admin object
      onLogin(adminData as any);
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Login failed — check console for details');
    } finally {
      setLoading(false);
    }
  };

  // Render switching between Login and Register
  if (registerMode) {
    return <AdminRegister onRegistered={(admin) => { onLogin(admin); }} onBack={() => setRegisterMode(false)} />;
  }

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
      // Clear admin hash and return to portal
      window.history.pushState({}, '', '/');
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-20 w-80 h-80 bg-teal-700/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={handleBack}
          className="fixed top-6 left-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-white/20 font-semibold hover:scale-110 transform"
        >
      
      
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10 w-full max-w-md border border-emerald-200/30 hover:shadow-3xl transition-all duration-500">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-all duration-300">
            <Shield className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">Admin Access</h2>
          <p className="text-slate-600 font-medium">Sign in to the admin dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200/50 text-red-700 px-5 py-3 rounded-xl mb-6 font-semibold backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Username
            </label>
            <input
              type="text"
              required
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              className="w-full px-5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
              placeholder="Enter admin username"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-5 py-3 pr-14 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
                placeholder="Enter admin password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-colors duration-300 p-1"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-r-transparent"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center flex flex-col gap-3">
          <button type="button" onClick={() => setRegisterMode(true)} className="text-sm text-emerald-600 hover:underline">Don't have an account? Create one</button>
          <p className="text-sm text-slate-600 font-medium">🔒 Authorized admin access only</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
