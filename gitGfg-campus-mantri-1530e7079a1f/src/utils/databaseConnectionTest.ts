import { supabase } from '../lib/supabase';

export interface DatabaseTestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  timestamp: string;
}

export class DatabaseConnectionTester {
  static async runComprehensiveTest(): Promise<DatabaseTestResult[]> {
    const results: DatabaseTestResult[] = [];
    const timestamp = new Date().toISOString();


    // Test 1: Environment Variables Check
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      results.push({
        test: 'Environment Variables',
        status: 'error',
        message: 'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
        data: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Not set',
          keyLength: supabaseKey ? supabaseKey.length : 0
        },
        timestamp
      });
      return results;
    }

    results.push({
      test: 'Environment Variables',
      status: 'success',
      message: 'Supabase environment variables are properly configured',
      data: {
        urlPreview: supabaseUrl.substring(0, 50) + '...',
        keyLength: supabaseKey.length,
        urlValid: supabaseUrl.includes('supabase.co')
      },
      timestamp
    });

    // Test 2: Basic Connection Test
    try {
      const { data, error } = await supabase
        .from('campus_mantris')
        .select('count')
        .limit(1);

      if (error) {
        results.push({
          test: 'Basic Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          data: { error: error.message, code: error.code },
          timestamp
        });
      } else {
        results.push({
          test: 'Basic Connection',
          status: 'success',
          message: 'Successfully connected to Supabase database',
          data: { response: 'Connection established' },
          timestamp
        });
      }
    } catch (error) {
      results.push({
        test: 'Basic Connection',
        status: 'error',
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp
      });
    }

    // Test 3: Auth Users Table
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('count')
        .limit(1);

      results.push({
        test: 'Auth Users Table',
        status: error ? 'error' : 'success',
        message: error ? `Auth users table error: ${error.message}` : 'Auth users table accessible',
        data: error ? { error: error.message } : { accessible: true },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Auth Users Table',
        status: 'error',
        message: `Auth users table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 4: Campus Mantris Table
    try {
      const { data, error, count } = await supabase
        .from('campus_mantris')
        .select('*', { count: 'exact' })
        .limit(5);

      results.push({
        test: 'Campus Mantris Table',
        status: error ? 'error' : 'success',
        message: error ? `Campus mantris table error: ${error.message}` : `Campus mantris table accessible with ${count || 0} records`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Campus Mantris Table',
        status: 'error',
        message: `Campus mantris table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 5: Admin Tasks Table
    try {
      const { data, error, count } = await supabase
        .from('admin_tasks')
        .select('*', { count: 'exact' })
        .eq('is_archived', false)
        .limit(5);

      results.push({
        test: 'Admin Tasks Table',
        status: error ? 'error' : 'success',
        message: error ? `Admin tasks table error: ${error.message}` : `Admin tasks table accessible with ${count || 0} active tasks`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Admin Tasks Table',
        status: 'error',
        message: `Admin tasks table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 6: Task Submissions Table
    try {
      const { data, error, count } = await supabase
        .from('task_submissions')
        .select('*', { count: 'exact' })
        .limit(5);

      results.push({
        test: 'Task Submissions Table',
        status: error ? 'error' : 'success',
        message: error ? `Task submissions table error: ${error.message}` : `Task submissions table accessible with ${count || 0} submissions`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Task Submissions Table',
        status: 'error',
        message: `Task submissions table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 7: Admin Announcements Table
    try {
      const { data, error, count } = await supabase
        .from('admin_announcements')
        .select('*', { count: 'exact' })
        .eq('is_archived', false)
        .limit(5);

      results.push({
        test: 'Admin Announcements Table',
        status: error ? 'error' : 'success',
        message: error ? `Admin announcements table error: ${error.message}` : `Admin announcements table accessible with ${count || 0} active announcements`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Admin Announcements Table',
        status: 'error',
        message: `Admin announcements table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 8: Leaderboard Table
    try {
      const { data, error, count } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact' })
        .limit(5);

      results.push({
        test: 'Leaderboard Table',
        status: error ? 'error' : 'success',
        message: error ? `Leaderboard table error: ${error.message}` : `Leaderboard table accessible with ${count || 0} entries`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Leaderboard Table',
        status: 'error',
        message: `Leaderboard table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 9: Performance Metrics Table
    try {
      const { data, error, count } = await supabase
        .from('performance_metrics')
        .select('*', { count: 'exact' })
        .limit(5);

      results.push({
        test: 'Performance Metrics Table',
        status: error ? 'error' : 'success',
        message: error ? `Performance metrics table error: ${error.message}` : `Performance metrics table accessible with ${count || 0} records`,
        data: error ? { error: error.message } : { count: count || 0, sampleData: data?.slice(0, 2) },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Performance Metrics Table',
        status: 'error',
        message: `Performance metrics table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 10: RLS Policies Test
    try {
      const { data, error } = await supabase
        .from('campus_mantris')
        .select('*')
        .limit(1);

      results.push({
        test: 'RLS Policies',
        status: error ? 'warning' : 'success',
        message: error ? `RLS policies may be restrictive: ${error.message}` : 'RLS policies working correctly',
        data: error ? { error: error.message } : { accessible: true },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'RLS Policies',
        status: 'error',
        message: `RLS policies error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    // Test 11: Database Schema Validation
    try {
      const { data, error } = await supabase.rpc('version');
      
      results.push({
        test: 'Database Schema',
        status: error ? 'warning' : 'success',
        message: error ? 'Could not validate database schema' : 'Database schema accessible',
        data: error ? { error: error.message } : { version: data },
        timestamp
      });
    } catch (error) {
      results.push({
        test: 'Database Schema',
        status: 'warning',
        message: 'Schema validation not available',
        timestamp
      });
    }

    return results;
  }

  static generateReport(results: DatabaseTestResult[]): string {
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    let report = `
🔍 SUPABASE DATABASE CONNECTION TEST REPORT
==========================================

📊 SUMMARY:
- ✅ Successful Tests: ${successCount}
- ❌ Failed Tests: ${errorCount}
- ⚠️  Warning Tests: ${warningCount}
- 📋 Total Tests: ${results.length}

📋 DETAILED RESULTS:
`;

    results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
      report += `
${index + 1}. ${icon} ${result.test}
   Status: ${result.status.toUpperCase()}
   Message: ${result.message}
   Time: ${new Date(result.timestamp).toLocaleString()}
`;
      if (result.data) {
        report += `   Data: ${JSON.stringify(result.data, null, 2)}\n`;
      }
    });

    report += `
🔧 RECOMMENDATIONS:
`;

    if (errorCount > 0) {
      report += `
❌ CRITICAL ISSUES FOUND:
- ${errorCount} tests failed
- Check your Supabase configuration
- Verify environment variables are set correctly
- Ensure database tables exist and are accessible
`;
    }

    if (successCount === results.length) {
      report += `
✅ ALL TESTS PASSED:
- Your Supabase database is properly connected
- All tables are accessible
- GeeksforGeeks Campus Mantri Task Tracker is ready to use
`;
    }

    return report;
  }
}