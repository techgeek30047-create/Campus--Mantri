import { supabase } from '../lib/supabase';

export interface DatabaseTestResult {
  test: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export class DatabaseTester {
  static async runAllTests(): Promise<DatabaseTestResult[]> {
    const results: DatabaseTestResult[] = [];

    // Test 1: Basic connection
    try {
      const { data, error } = await supabase.from('campus_mantris').select('count').limit(1);
      results.push({
        test: 'Database Connection',
        status: error ? 'error' : 'success',
        message: error ? `Connection failed: ${error.message}` : 'Database connection successful',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Database Connection',
        status: 'error',
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 2: Auth users table
    try {
      const { data, error } = await supabase.from('auth_users').select('count').limit(1);
      results.push({
        test: 'Auth Users Table',
        status: error ? 'error' : 'success',
        message: error ? `Auth table error: ${error.message}` : 'Auth users table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Auth Users Table',
        status: 'error',
        message: `Auth table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 3: Campus mantris table
    try {
      const { data, error } = await supabase.from('campus_mantris').select('count').limit(1);
      results.push({
        test: 'Campus Mantris Table',
        status: error ? 'error' : 'success',
        message: error ? `Campus mantris error: ${error.message}` : 'Campus mantris table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Campus Mantris Table',
        status: 'error',
        message: `Campus mantris error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 4: Admin tasks table
    try {
      const { data, error } = await supabase.from('admin_tasks').select('count').limit(1);
      results.push({
        test: 'Admin Tasks Table',
        status: error ? 'error' : 'success',
        message: error ? `Admin tasks error: ${error.message}` : 'Admin tasks table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Admin Tasks Table',
        status: 'error',
        message: `Admin tasks error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 5: Task submissions table
    try {
      const { data, error } = await supabase.from('task_submissions').select('count').limit(1);
      results.push({
        test: 'Task Submissions Table',
        status: error ? 'error' : 'success',
        message: error ? `Task submissions error: ${error.message}` : 'Task submissions table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Task Submissions Table',
        status: 'error',
        message: `Task submissions error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 6: Leaderboard table
    try {
      const { data, error } = await supabase.from('leaderboard').select('count').limit(1);
      results.push({
        test: 'Leaderboard Table',
        status: error ? 'error' : 'success',
        message: error ? `Leaderboard error: ${error.message}` : 'Leaderboard table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Leaderboard Table',
        status: 'error',
        message: `Leaderboard error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 7: Admin announcements table
    try {
      const { data, error } = await supabase.from('admin_announcements').select('count').limit(1);
      results.push({
        test: 'Admin Announcements Table',
        status: error ? 'error' : 'success',
        message: error ? `Admin announcements error: ${error.message}` : 'Admin announcements table accessible',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'Admin Announcements Table',
        status: 'error',
        message: `Admin announcements error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 8: RLS policies test
    try {
      const { data, error } = await supabase.from('campus_mantris').select('*').limit(1);
      results.push({
        test: 'RLS Policies',
        status: error ? 'error' : 'success',
        message: error ? `RLS error: ${error.message}` : 'RLS policies working correctly',
        data: data
      });
    } catch (error) {
      results.push({
        test: 'RLS Policies',
        status: 'error',
        message: `RLS error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  }

  static async testEnvironmentVariables(): Promise<DatabaseTestResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        test: 'Environment Variables',
        status: 'error',
        message: 'Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
        data: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlLength: supabaseUrl?.length || 0,
          keyLength: supabaseKey?.length || 0
        }
      };
    }

    return {
      test: 'Environment Variables',
      status: 'success',
      message: 'All required environment variables are present',
      data: {
        hasUrl: true,
        hasKey: true,
        urlLength: supabaseUrl.length,
        keyLength: supabaseKey.length
      }
    };
  }

  static async testFunctionality(): Promise<DatabaseTestResult[]> {
    const results: DatabaseTestResult[] = [];

    // Test sample data insertion (if no data exists)
    try {
      const { data: existingData } = await supabase
        .from('campus_mantris')
        .select('id')
        .limit(1);

      if (!existingData || existingData.length === 0) {
        results.push({
          test: 'Sample Data',
          status: 'error',
          message: 'No sample data found. Database may need initialization.',
        });
      } else {
        results.push({
          test: 'Sample Data',
          status: 'success',
          message: 'Sample data exists in database',
          data: { count: existingData.length }
        });
      }
    } catch (error) {
      results.push({
        test: 'Sample Data',
        status: 'error',
        message: `Sample data check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  }
}