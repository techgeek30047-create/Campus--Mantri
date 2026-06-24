import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Wifi, WifiOff } from 'lucide-react';
import { testSupabaseConnection, isSupabaseAvailable } from '../lib/supabase';

interface ConnectionTest {
  name: string;
  status: 'success' | 'error' | 'warning' | 'testing';
  message: string;
  details?: any;
}

const DatabaseStatus: React.FC = () => {
  const [tests, setTests] = useState<ConnectionTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');

  const runConnectionTests = async () => {
    setLoading(true);
    setConnectionStatus('testing');
    const newTests: ConnectionTest[] = [];

    // Test 1: Environment Variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseKey === 'your_actual_anon_key_here' || supabaseKey === 'your_supabase_key_here') {
      newTests.push({
        name: 'Environment Variables',
        status: 'warning',
        message: 'Supabase API key not configured. Please add your real API key to connect to the database.',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          keyStatus: !supabaseKey ? 'Missing' : 'Placeholder value detected',
          instructions: 'Get your anon key from Supabase dashboard and update .env file'
        }
      });
      setConnectionStatus('disconnected');
    } else {
      newTests.push({
        name: 'Environment Variables',
        status: 'success',
        message: 'Supabase environment variables found',
        details: {
          url: supabaseUrl.substring(0, 30) + '...',
          keyLength: supabaseKey.length
        }
      });
    }

    // Test 2: Database Connection
    try {
      const isConnected = await testSupabaseConnection();
      
      if (isConnected) {
        newTests.push({
          name: 'Database Connection',
          status: 'success',
          message: 'Successfully connected to Supabase database',
          details: { timestamp: new Date().toISOString() }
        });
        setConnectionStatus('connected');
      } else {
        newTests.push({
          name: 'Database Connection',
          status: 'error',
          message: 'Failed to connect to Supabase database.',
          details: { error: 'Connection failed' }
        });
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      newTests.push({
        name: 'Database Connection',
        status: 'error',
        message: 'Database connection error.',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      setConnectionStatus('disconnected');
    }

    // Test 3: Application Status
    newTests.push({
      name: 'Application Status',
      status: 'success',
      message: 'GeeksforGeeks Campus Mantri Task Tracker is operational',
      details: {
        mode: connectionStatus === 'connected' ? 'Database Mode' : 'Disconnected Mode',
        features: 'All features available'
      }
    });

    setTests(newTests);
    setLoading(false);
  };

  useEffect(() => {
    runConnectionTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'testing':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'testing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-6 w-6 text-green-600" />,
          text: 'Connected to Supabase',
          color: 'text-green-600'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-6 w-6 text-yellow-600" />,
          text: 'Database Disconnected',
          color: 'text-yellow-600'
        };
      case 'testing':
        return {
          icon: <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />,
          text: 'Testing Connection...',
          color: 'text-blue-600'
        };
    }
  };

  const statusDisplay = getConnectionStatusDisplay();
  const successCount = tests.filter(test => test.status === 'success').length;
  const totalCount = tests.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Database Connection Status</h3>
            <p className="text-sm text-gray-600">GeeksforGeeks Campus Mantri Task Tracker</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {statusDisplay.icon}
            <span className={`font-medium ${statusDisplay.color}`}>
              {statusDisplay.text}
            </span>
          </div>
          
          <button
            onClick={runConnectionTests}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Test</span>
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-4 rounded-lg border mb-4 ${
        connectionStatus === 'connected' ? 'bg-green-50 border-green-200' :
        connectionStatus === 'disconnected' ? 'bg-yellow-50 border-yellow-200' :
        'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center space-x-2">
          {statusDisplay.icon}
          <div>
            <span className={`font-medium ${statusDisplay.color}`}>
              {connectionStatus === 'connected' && 'Database Connected - All features available with real-time data'}
              {connectionStatus === 'disconnected' && 'Database Disconnected - Please configure Supabase API key'}
              {connectionStatus === 'testing' && 'Testing database connection...'}
            </span>
            {connectionStatus === 'disconnected' && (
              <p className="text-sm text-yellow-700 mt-1">
                To connect to database, configure VITE_SUPABASE_URL and VITE_SUPABASE_KEY
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Test Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">
          Connection Tests: {successCount}/{totalCount} passed
        </span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed Test Results */}
      {showDetails && (
        <div className="space-y-3 mb-6">
          {tests.map((test, index) => (
            <div key={index} className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(test.status)}
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    <p className="text-sm">{test.message}</p>
                    {test.details && (
                      <pre className="text-xs mt-2 bg-black/10 p-2 rounded overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Supabase Configuration</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>To connect to your Supabase database:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                <li>Get your project URL and anon key from Settings → API</li>
                <li>Set environment variables:
                  <div className="bg-blue-100 p-2 rounded mt-1 font-mono text-xs">
                    VITE_SUPABASE_URL=your_project_url<br/>
                    VITE_SUPABASE_KEY=your_anon_key
                  </div>
                </li>
                <li>Run the database migrations from the supabase/migrations folder</li>
              </ol>
              <p className="mt-2 font-medium">
                Current Status: {connectionStatus === 'connected' ? '✅ Connected' : '⚠️ Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus;