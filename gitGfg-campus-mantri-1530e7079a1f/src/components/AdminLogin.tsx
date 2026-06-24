import { Eye, EyeOff, Shield } from 'lucide-react';
import bcrypt from 'bcryptjs';
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminLoginProps {
  onLogin: (admin: any) => void;
  onBack: () => void;
}


const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      let adminData = null;
      let isOfflineFallback = false;

      // Try to lookup admin in Supabase DB
      if (isSupabaseConfigured) {
        const { data: supData, error: adminErr } = await supabase
          .from('admins')
          .select('*')
          .eq('username', credentials.username.trim())
          .maybeSingle();

        if (!adminErr && supData) {
          adminData = supData;
        } else if (adminErr) {
          const message = String(adminErr.message || '').toLowerCase();
          // If table doesn't exist or is empty, fall through to offline lookup
          if (message.includes('does not exist') || message.includes('0 rows') || message.includes('pgrst116')) {
            console.warn('Admins table empty or unavailable; using offline auth');
          } else if (message.includes('failed to fetch') || message.includes('enotfound') || message.includes('dns') || message.includes('networkerror')) {
            setError(`Supabase connection failed: ${adminErr.message}`);
            setLoading(false);
            return;
          } else {
            console.warn('Admin lookup error', { adminErr });
          }
        }
      }

      // Fallback: check offline default admin (for development)
      if (!adminData && credentials.username.trim() === 'shivam0754' && credentials.password === 'Shivam@9589') {
        adminData = {
          id: 'admin-offline-1',
          username: 'shivam0754',
          name: 'Shivam Admin',
          email: 'shivam0754@campusmantri.local',
          password: 'Shivam@9589',  // Plain password for offline fallback
          is_super: true,
          created_at: new Date().toISOString()
        };
        isOfflineFallback = true;
      }

      if (!adminData) {
        setError('Invalid admin credentials');
        setLoading(false);
        return;
      }

      let authenticated = false;
      let authFailureReason = '';
      let localAuthFallback = false;
      console.debug('Admin login candidate', { adminData, isOfflineFallback });

      // Only try Supabase auth if NOT using offline fallback
      if (!isOfflineFallback && adminData.email && isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: adminData.email,
          password: credentials.password
        });

        if (!authError && authData?.session) {
          authenticated = true;
        } else {
          authFailureReason = authError?.message || 'Supabase auth failed for admin email';
          console.warn('Supabase auth failed for admin email', { authError, email: adminData.email });
        }
      }

      // Fall back to offline password check if Supabase auth not available or failed
      if (!authenticated) {
        if (adminData.password_hash) {
          const passwordValid = await bcrypt.compare(credentials.password, adminData.password_hash);
          if (passwordValid) {
            authenticated = true;
            localAuthFallback = true;
          } else {
            console.warn('Admin password_hash compare failed');
          }
        }

        if (!authenticated && adminData.password) {
          authenticated = adminData.password === credentials.password;
          if (authenticated) localAuthFallback = true;
        }

        if (!authenticated && adminData.auth_user_id) {
          const { data: authUser, error: authUserError } = await supabase
            .from('auth_users')
            .select('*')
            .eq('id', adminData.auth_user_id)
            .maybeSingle();

          if (!authUserError && authUser) {
            if (authUser.password_hash) {
              const passwordValid = await bcrypt.compare(credentials.password, authUser.password_hash);
              if (passwordValid) {
                authenticated = true;
                localAuthFallback = true;
              }
            } else if (authUser.email) {
              const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: authUser.email,
                password: credentials.password
              });
              if (!authError && authData?.session) {
                authenticated = true;
              } else {
                authFailureReason = authError?.message || 'Supabase auth failed for linked auth user';
                console.warn('Supabase auth failed for linked auth user', { authError, email: authUser.email });
              }
            }
          } else {
            console.warn('Admin auth_user_id lookup failed', { authUserError, auth_user_id: adminData.auth_user_id });
          }
        }
      }

      if (!authenticated) {
        const reason = authFailureReason ? `Invalid admin credentials or login failed: ${authFailureReason}` : 'Invalid admin credentials';
        setError(reason);
        setLoading(false);
        return;
      }

      const shouldPersistOfflineAdmin = isOfflineFallback || localAuthFallback;
      if (shouldPersistOfflineAdmin) {
        localStorage.setItem('isOfflineAdmin', 'true');
      } else {
        localStorage.removeItem('isOfflineAdmin');
      }

      try {
        await supabase.from('admin_logins').insert([{ admin_id: adminData.id }]);
      } catch (logErr) {
        console.warn('Failed to record admin login:', logErr);
      }

      onLogin(adminData as any);
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Login failed — check console for details');
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-20 w-80 h-80 bg-teal-700/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

  
      
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
          <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Back to portal</button>
          <p className="text-sm text-slate-600 font-medium">🔒 Authorized admin access only</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
