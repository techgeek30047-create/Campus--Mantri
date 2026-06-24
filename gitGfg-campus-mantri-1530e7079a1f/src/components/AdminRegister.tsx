import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { ArrowLeft, Shield } from 'lucide-react';

interface AdminRegisterProps {
  onRegistered: (admin: any) => void;
  onBack?: () => void;
}

const AdminRegister: React.FC<AdminRegisterProps> = ({ onRegistered, onBack }) => {
  const [form, setForm] = useState({ username: '', name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.name.trim() || !form.password) {
      setError('All fields are required');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      // Check username uniqueness
      const { data: existing, error: existErr } = await supabase
        .from('admins')
        .select('id')
        .eq('username', form.username.trim())
        .limit(1);

      if (existErr) throw existErr;
      if (existing && existing.length > 0) {
        setError('Username already taken');
        setLoading(false);
        return;
      }

      // Hash password (client-side for now)
      const hash = bcrypt.hashSync(form.password, 10);

      const { data: inserted, error: insertErr } = await supabase
        .from('admins')
        .insert([{ username: form.username.trim(), name: form.name.trim(), password_hash: hash, is_super: false }])
        .select('*')
        .limit(1);

      if (insertErr) throw insertErr;

      const admin = (inserted && inserted[0]) || null;

      // record login
      try {
        await supabase.from('admin_logins').insert([{ admin_id: admin.id }]);
      } catch (logErr) {
        console.warn('Failed to record admin login:', logErr);
      }

      onRegistered(admin);
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
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
          onClick={onBack}
          className="fixed top-6 left-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-white/20 font-semibold hover:scale-110 transform"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Back to Login</span>
        </button>
      )}

      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10 w-full max-w-md border border-emerald-200/30 hover:shadow-3xl transition-all duration-500">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-110 transition-all duration-300">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">Create Admin Account</h2>
          <p className="text-slate-600 text-sm">Register to manage tasks and approvals</p>
        </div>

        {error && <div className="bg-red-50/80 border border-red-200/50 text-red-700 px-5 py-3 rounded-xl mb-6 font-semibold backdrop-blur-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
            <input 
              value={form.username} 
              onChange={(e) => setForm({ ...form, username: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
              placeholder="Choose a username"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
            <input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
              placeholder="Create a strong password"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
            <input 
              type="password" 
              value={form.confirm} 
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-white/50 font-medium placeholder-slate-400"
              placeholder="Confirm your password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-r-transparent"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button type="button" onClick={onBack} className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-semibold">← Back to login</button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
