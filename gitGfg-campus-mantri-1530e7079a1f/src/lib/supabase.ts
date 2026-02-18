import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ⚠️ DO NOT crash production build if env missing
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase environment variables missing.');
  console.warn('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
}

// Create Supabase client (safe fallback)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    db: { schema: 'public' },
    global: {
      headers: {
        'X-Client-Info': 'GeeksforGeeks-Campus-Mantri-Task-Tracker',
        'X-Project-ID': 'bozmdglkyampbceqgsyi'
      }
    }
  }
);

// ✅ Connection test
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('campus_mantris')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// ✅ Availability check
export const isSupabaseAvailable = () =>
  !!supabaseUrl && !!supabaseKey;

// ✅ Alias (so isSupabaseConfigured import kabhi fail na ho)
export const isSupabaseConfigured = isSupabaseAvailable;

/* ===========================
   TYPES
=========================== */

export type CampusMantri = {
  id: string;
  name: string;
  email: string;
  phone: string;
  college_name: string;
  gfg_mantri_id: string;
  status: 'active' | 'inactive' | 'suspended';
  joined_date: string;
  created_at: string;
  user_id?: string;
  total_points?: number;
  approved_tasks?: number;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority:
    | 'low'
    | 'medium'
    | 'high'
    | 'urgent'
    | 'critical'
    | string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  campus_mantris?: CampusMantri;
};

export type AdminTask = {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date: string;
  priority:
    | 'task_1'
    | 'task_2'
    | 'task_3'
    | 'task_4'
    | 'task_5'
    | 'task_6'
    | 'low'
    | 'medium'
    | 'high'
    | 'urgent'
    | 'critical'
    | string;
  status: 'active' | 'completed' | 'cancelled';
  created_by_admin: boolean;
  created_at: string;
  is_archived?: boolean;
};

export type TaskSubmission = {
  id: string;
  admin_task_id: string;
  mantri_id: string;
  submission_text: string;
  submission_date: string;
  status: 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  admin_feedback?: string;
  points_awarded: number;
  submitted_at: string;
  proof_url?: string;
  proof_type?: string;
  admin_tasks?: AdminTask;
  campus_mantris?: CampusMantri;
};

export type LeaderboardEntry = {
  id: string;
  mantri_id: string;
  total_points: number;
  tasks_completed: number;
  rank_position: number;
  last_updated: string;
  campus_mantris?: CampusMantri;
};

export type AdminAnnouncement = {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  created_at: string;
  is_archived?: boolean;
};

export type PerformanceMetrics = {
  id: string;
  mantri_id: string;
  month: string;
  tasks_completed: number;
  tasks_assigned: number;
  performance_score: number;
  created_at: string;
};

// Safe wrapper
export const safeSupabaseOperation = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return {
      data: null,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Database operation failed'
      }
    };
  }
};
