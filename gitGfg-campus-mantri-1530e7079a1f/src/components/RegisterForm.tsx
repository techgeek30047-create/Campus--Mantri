import React, { useState } from 'react';
import { User, Mail, Phone, GraduationCap, Car as IdCard, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { authService, AuthUser, RegisterData } from '../lib/auth';

interface RegisterFormProps {
  onSuccess: (user: AuthUser) => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    collegeName: '',
    gfgMantriId: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPasswordError('');

    // Validate passwords match
    if (formData.password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || 
        !formData.collegeName.trim() || !formData.gfgMantriId.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const result = await authService.register(formData);
    
    if (result.success && result.user) {
      onSuccess(result.user);
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setLoading(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({...formData, password: newPassword});
    
    // Real-time password validation
    if (newPassword.length > 0 && newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
    } else {
      setPasswordError('');
    }
  };
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Join as Campus Mantri</h2>
        <p className="text-gray-600">Create your GeeksforGeeks Campus Mantri account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="your.email@college.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="+91-9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <GraduationCap className="inline h-4 w-4 mr-1" />
              College Name
            </label>
            <input
              type="text"
              required
              value={formData.collegeName}
              onChange={(e) => setFormData({...formData, collegeName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="Your College Name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <IdCard className="inline h-4 w-4 mr-1" />
            GFG_Username
          </label>
          <input
            type="text"
            required
            value={formData.gfgMantriId}
            onChange={(e) => setFormData({...formData, gfgMantriId: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="jcpjosephra3L"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline h-4 w-4 mr-1" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handlePasswordChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                placeholder="Create password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError && (
              <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{passwordError}</span>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Password must contain at least 6 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline h-4 w-4 mr-1" />
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-green-600 hover:text-green-700 font-semibold transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;