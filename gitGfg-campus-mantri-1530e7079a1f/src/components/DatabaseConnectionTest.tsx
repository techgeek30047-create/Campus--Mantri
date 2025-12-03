import React, { useState } from 'react';
import { Database, Play, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, Download } from 'lucide-react';
import { DatabaseConnectionTester, DatabaseTestResult } from '../utils/databaseConnectionTest';

const DatabaseConnectionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<DatabaseTestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      const results = await DatabaseConnectionTester.runComprehensiveTest();
      setTestResults(results);
      setShowDetails(true);
      
    } catch (error) {
      console.error('Test execution error:', error);
      setTestResults([{
        test: 'Test Execution',
        status: 'error',
        message: `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setTesting(false);
    }
  };

  const copyReport = () => {
    const report = DatabaseConnectionTester.generateReport(testResults);
    navigator.clipboard.writeText(report);
    alert('Report copied to clipboard!');
  };

  const downloadReport = () => {
    const report = DatabaseConnectionTester.generateReport(testResults);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-connection-test-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
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
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Supabase Database Connection Test</h1>
                <p className="text-gray-600">GeeksforGeeks Campus Mantri Task Tracker</p>
              </div>
            </div>
            
            <button
              onClick={runTest}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Run Connection Test</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Test Results Summary</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyReport}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Report</span>
                </button>
                <button
                  onClick={downloadReport}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-900">{testResults.length}</p>
                <p className="text-blue-600 font-medium">Total Tests</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-900">{successCount}</p>
                <p className="text-green-600 font-medium">Successful</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-900">{warningCount}</p>
                <p className="text-yellow-600 font-medium">Warnings</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-900">{errorCount}</p>
                <p className="text-red-600 font-medium">Failed</p>
              </div>
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-lg border-2 ${
              errorCount === 0 && successCount > 0 ? 'bg-green-50 border-green-200' :
              errorCount > 0 ? 'bg-red-50 border-red-200' :
              'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2">
                {errorCount === 0 && successCount > 0 ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="font-medium text-green-800">
                      ✅ Database Connection Successful - All systems operational
                    </span>
                  </>
                ) : errorCount > 0 ? (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="font-medium text-red-800">
                      ❌ Database Connection Issues Detected - {errorCount} test(s) failed
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      ⚠️ Database Connection Status Unknown
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detailed Test Results</h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <h3 className="font-semibold">{result.test}</h3>
                        <p className="text-sm mt-1">{result.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(result.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      result.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {showDetails && result.data && (
                    <div className="mt-3 p-3 bg-black/5 rounded border">
                      <p className="text-xs font-medium text-gray-700 mb-1">Test Data:</p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {testResults.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <Database className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Database Connection Test</h3>
                <p className="text-blue-800 mb-4">
                  Click "Run Connection Test" to check if your Supabase database is properly connected and configured for the GeeksforGeeks Campus Mantri Task Tracker.
                </p>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>This test will check:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Environment variables configuration</li>
                    <li>Database connection status</li>
                    <li>All required tables accessibility</li>
                    <li>Row Level Security policies</li>
                    <li>Data integrity and structure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseConnectionTest;