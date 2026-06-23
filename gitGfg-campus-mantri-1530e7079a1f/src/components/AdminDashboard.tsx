import { Archive, Bell, CheckCircle, Clock, Download, LogOut, Plus, RefreshCw, Search, Target, Trash2, TrendingUp, Trophy, Users, Menu, X, Moon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminTask, CampusMantri, LeaderboardEntry, supabase, Task, TaskSubmission, isSupabaseAvailable } from '../lib/supabase';

import { Admin } from '../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
  currentAdmin?: Admin;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentAdmin }) => {
  const [stats, setStats] = useState({
    totalMantris: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    pendingSubmissions: 0,
    totalPointsAwarded: 0,
    activeColleges: 0
  });
  const [mantris, setMantris] = useState<CampusMantri[]>([]);
  const [filteredMantris, setFilteredMantris] = useState<CampusMantri[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [showMantriList, setShowMantriList] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'tasks' | 'leaderboard' | 'submissions'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<TaskSubmission | null>(null);
  const [clearingTasks, setClearingTasks] = useState(false);
  const [clearingAnnouncements, setClearingAnnouncements] = useState(false);
  const [recomputingLeaderboard, setRecomputingLeaderboard] = useState(false);
  // Leaderboard/points state
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [pointsEnabled, setPointsEnabled] = useState<boolean | null>(null);
  // Task filter state for submissions
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('');
  // 🔹 Submissions pagination state
const [page, setPage] = useState(1);
const PAGE_SIZE = 250;
const [totalSubmissions, setTotalSubmissions] = useState(0);

  // Admin tracking state
  const [adminStats, setAdminStats] = useState<Array<{ admin: Admin; approvals: number; last_login?: string | null; logged_in?: boolean }>>([]);


  // Task form state
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    points: 0
  });

  // Announcement form state
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as const
  });
  // Load all data ONCE on component mount
  useEffect(() => {
    fetchDashboardData();
    fetchAdminStats();
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('campus-mantri-theme');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('campus-mantri-theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Reset page and filter when switching to submissions view
  useEffect(() => {
    if (currentView === 'submissions') {
      setPage(1);
      setSelectedTaskFilter('');
    }
  }, [currentView]);

  // Fetch submissions only when page or view changes
  useEffect(() => {
    if (currentView === 'submissions') {
      fetchSubmissions();
    }
  }, [page, currentView]);

  // Fetch leaderboard data when switching to leaderboard view
  useEffect(() => {
    if (currentView === 'leaderboard') {
      fetchDashboardData();
    }
  }, [currentView]);

  useEffect(() => {
    filterMantris();
  }, [searchTerm, collegeFilter, mantris]);
  const fetchSubmissions = async () => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // First, try fetching submissions with nested admin_tasks including points
  let res = await supabase
    .from('task_submissions')
    .select(
      `
      *,
      admin_tasks (
        id,
        title,
        description,
        due_date,
        priority,
        points
      ),
      campus_mantris (
        id,
        name,
        email,
        college_name,
        gfg_mantri_id
      )
      `,
      { count: 'exact' }
    )
    .order('submitted_at', { ascending: false })
    .range(from, to);

  // If the nested select failed (for example older DBs missing columns), retry with a simpler select that omits the nested admin_tasks entirely
  if (res.error) {
    console.warn('Submissions query failed with nested admin_tasks; retrying without nested admin_tasks select:', res.error);
    res = await supabase
      .from('task_submissions')
      .select(`*, campus_mantris (id, name, email, college_name, gfg_mantri_id)`, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(from, to);
  }

  const { data, count, error } = res;

  if (error) {
    console.error('Submissions error:', error);
    return;
  }

  setTaskSubmissions(data || []);
  setTotalSubmissions(count || 0);
};


  const fetchDashboardData = async () => {
    try {
      console.log('SESSION', await supabase.auth.getSession());
      setLoading(true);
      // Ensure leaderboard variable is always in scope to avoid ReferenceError
      let fetchedLeaderboard: any[] | null | undefined = undefined;
      
      // Fetch campus mantris
      const { data: mantrisData, error: mantrisError } = await supabase
        .from('campus_mantris')
        .select('*')
        .order('created_at', { ascending: false });

      if (mantrisError) console.error('Mantris error:', mantrisError);

      // Fetch tasks with mantri details
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          campus_mantris (
            id,
            name,
            email,
            college_name,
            gfg_mantri_id
          )
        `)
        .order('created_at', { ascending: false });

      if (tasksError) console.error('Tasks error:', tasksError);

      // Fetch admin tasks
      const { data: adminTasksData, error: adminTasksError } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminTasksError) console.error('Admin tasks error:', adminTasksError);

      // Fetch task submissions with proof
      // 🔹 Fetch task submissions (PAGINATED)


      // Only fetch leaderboard if the leaderboard view is active (improves responsiveness)
      if (currentView === 'leaderboard') {
        fetchedLeaderboard = null;
        try {
          setLeaderboardLoading(true);

          // Try ordering by points (preferred) - limit to top 100 for performance
          const { data: lbByPoints, error: lbPointsErr } = await supabase
            .from('leaderboard')
            .select('*')
            .gt('tasks_completed', 0)
            .order('total_points', { ascending: false })
            .limit(100);

          if (!lbPointsErr) {
            fetchedLeaderboard = lbByPoints || [];
            setPointsEnabled(true);
            console.log('Leaderboard fetched (points ordering):', fetchedLeaderboard.length);
          } else {
            // If total_points column doesn't exist, fallback to ordering by tasks_completed
            const msg = String(lbPointsErr?.message || '').toLowerCase();
            const code = lbPointsErr?.code || '';

            if (code === '42703' || msg.includes('total_points')) {
              console.warn('total_points column missing; falling back to tasks ordering');
              const { data: lbByTasks, error: lbTasksErr } = await supabase
                .from('leaderboard')
                .select('*')
                .gt('tasks_completed', 0)
                .order('tasks_completed', { ascending: false })
                .limit(100);

              if (!lbTasksErr) {
                fetchedLeaderboard = lbByTasks || [];
                setPointsEnabled(false);
                console.log('Leaderboard fetched (tasks ordering):', fetchedLeaderboard.length);
              } else {
                console.error('Leaderboard fallback error:', lbTasksErr);
              }
            } else {
              console.error('Leaderboard error:', lbPointsErr);
            }
          }

          // Enrich with mantri details if we have results (batch fetch for performance)
          if (fetchedLeaderboard && fetchedLeaderboard.length > 0) {
            const mantriIds = Array.from(new Set(fetchedLeaderboard.map((e: any) => e.mantri_id).filter(Boolean)));
            const { data: mantrisMap } = await supabase
              .from('campus_mantris')
              .select('id, name, college_name, gfg_mantri_id')
              .in('id', mantriIds)
              .limit(1000);

            const mantriById: Record<string, any> = {};
            (mantrisMap || []).forEach((m: any) => { mantriById[m.id] = m; });

            const enrichedData = fetchedLeaderboard.map((entry: any, index: number) => ({
              ...entry,
              campus_mantris: mantriById[entry.mantri_id] || null,
              rank_position: index + 1
            }));

            setLeaderboard(enrichedData);
          } else {
            setLeaderboard([]);
          }
        } catch (err) {
          console.error('Error fetching leaderboard:', err);
          setLeaderboard([]);
        } finally {
          setLeaderboardLoading(false);
        }
      }

// Set whatever data we have (don't require all queries to succeed)
setMantris(mantrisData || []);
setTasks(tasksData || []);
setAdminTasks(adminTasksData || []);

// NOTE: leaderboard is already set via setLeaderboard() in the enrichment logic above
// Do NOT overwrite it here, as it contains the enriched mantri details
// Only set leaderboard to empty if it wasn't fetched at all
if (currentView !== 'leaderboard' && (!fetchedLeaderboard || fetchedLeaderboard.length === 0)) {
  setLeaderboard([]);
}

// Fetch exact total count (Supabase returns a 1,000 row cap by default)
const { count: exactCount } = await supabase
  .from('campus_mantris')
  .select('*', { count: 'exact', head: true });

const totalMantrisCount = typeof exactCount === 'number' ? exactCount : ((mantrisData && mantrisData.length) || 0);

// Calculate comprehensive stats (use safe fallbacks)
const activeTasks = (adminTasksData || []).filter(task => task.status === 'active').length;
const completedTasks = (tasksData || []).filter(task => task.status === 'completed').length;
const { count: pendingCount } = await supabase
  .from('task_submissions')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'submitted');

const pendingSubmissions = pendingCount ?? 0;

// Sum approved submission points using paged fetch to avoid 1000-row cap
const allApprovedSubsPaged = await fetchAllRows('task_submissions', 'points_awarded');
const totalPointsAwarded =
  (allApprovedSubsPaged || []).reduce((sum: number, s: any) => sum + (s.points_awarded || 0), 0);


// Fetch ALL campus mantris (no 1000 limit)
const allMantris = await fetchAllRows('campus_mantris', 'college_name,status');

// Normalize & count unique active colleges
const activeColleges = new Set(
  allMantris
    .filter((m: any) => m.status === 'active')
    .map((m: any) => (m.college_name || '').trim())
    .filter(Boolean)
).size;


setStats({
  totalMantris: totalMantrisCount,
  activeTasks,
  completedTasks,
  totalTasks: (tasksData || []).length,
  pendingSubmissions, // ✅ exact count now
  totalPointsAwarded,
  activeColleges
});

// Admin stats fetched on mount via useEffect above
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskData: any = {
        title: taskFormData.title,
        description: taskFormData.description,
        assigned_to: taskFormData.assigned_to || null,
        due_date: taskFormData.due_date,
        status: 'active'
      };

      // Add points only if provided (schema may not have it in old DBs)
      if (taskFormData.points) {
        taskData.points = Number(taskFormData.points || 0);
      }

      const { error } = await supabase
        .from('admin_tasks')
        .insert([taskData]);

      if (error) throw error;

      setTaskFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        points: 0
      });
      setShowTaskForm(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Ensure all fields are filled correctly.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .insert([announcementFormData]);

      if (error) throw error;

      setAnnouncementFormData({
        title: '',
        message: '',
        priority: 'normal'
      });
      setShowAnnouncementForm(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

 //Approval task with points backend //
 const handleApproveSubmission = async (submissionId: string) => {
  // Find submission to determine points
  const submission = taskSubmissions.find(s => s.id === submissionId);
  const points = submission?.admin_tasks?.points ?? submission?.points_awarded ?? 0;

  // ✅ 1. OPTIMISTIC UI UPDATE (instant approve feel)
  setTaskSubmissions(prev =>
    prev.map(sub =>
      sub.id === submissionId
        ? { ...sub, status: 'approved', points_awarded: points }
        : sub
    )
  );

  try {
    // ✅ 2. Backend RPC for approval and leaderboard sync
    const { error } = await supabase.rpc('approve_submission', {
      submission_id: submissionId,
      points_value: points
    });

    if (error) {
      console.error('Approve failed:', error);

      // Fallback to a direct update if RPC is unavailable or misconfigured
      const { error: updateError } = await supabase
        .from('task_submissions')
        .update({
          status: 'approved',
          points_awarded: points,
          admin_feedback: 'Task approved successfully!'
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Approve fallback failed:', updateError);
        fetchDashboardData();
        return;
      }
    }

    await fetchSubmissions();
    if (currentView === 'leaderboard') {
      await fetchDashboardData();
    }
  } catch (err) {
    console.error('Approve error:', err);
    // Rollback on error
    setTaskSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? { ...sub, status: 'submitted' }
          : sub
      )
    );
  }
};

  const handleRejectSubmission = async (submissionId: string, feedback: string) => {
  // ✅ 1. OPTIMISTIC UI UPDATE (instant reject feel)
  setTaskSubmissions(prev =>
    prev.map(sub =>
      sub.id === submissionId
        ? {
            ...sub,
            status: 'rejected',
            admin_feedback: feedback || 'Task needs improvement. Please resubmit.'
          }
        : sub
    )
  );

  try {
    // ✅ 2. Backend update via direct table update (avoid missing RPC function)
    const { error } = await supabase
      .from('task_submissions')
      .update({
        status: 'rejected',
        admin_feedback: feedback || 'Task needs improvement. Please resubmit.',
        points_awarded: 0
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Reject failed:', error);
      fetchDashboardData();
      return;
    }

    await fetchSubmissions();
    if (currentView === 'leaderboard') {
      await fetchDashboardData();
    }
  } catch (err) {
    console.error('Reject error:', err);
    fetchDashboardData();
  }
};

  const handleClearOldTasks = async () => {
    try {
      setClearingTasks(true);
      const { data, error } = await supabase.rpc('clear_all_completed_tasks');
      
      if (error) throw error;
      
      const clearedCount = data && data.length > 0 ? data[0].cleared_count : 0;
      fetchDashboardData();
      alert(`Successfully cleared ${clearedCount} completed tasks!`);
    } catch (error) {
      console.error('Error clearing old tasks:', error);
      alert('Failed to clear old tasks. Please try again.');
    } finally {
      setClearingTasks(false);
    }
  };

  const handleClearOldAnnouncements = async () => {
    try {
      setClearingAnnouncements(true);
      const { data, error } = await supabase.rpc('clear_all_active_announcements');
      
      if (error) throw error;
      
      const clearedCount = data && data.length > 0 ? data[0].cleared_count : 0;
      fetchDashboardData();
      alert(`Successfully cleared ${clearedCount} announcements!`);
    } catch (error) {
      console.error('Error clearing old announcements:', error);
      alert('Failed to clear old announcements. Please try again.');
    } finally {
      setClearingAnnouncements(false);
    }
  };

  const handleRecomputeLeaderboard = async () => {
    try {
      if (!confirm('Recompute leaderboard now? This will sync task counts with approved submissions.')) return;
      setRecomputingLeaderboard(true);
      const { data, error } = await supabase.rpc('recompute_leaderboard');
      if (error) {
        console.error('Recompute error:', error);
        alert('Recompute failed: ' + (error.message || 'unknown error'));
        return;
      }
      console.log('Recompute result:', data);
      fetchDashboardData();
      alert('Leaderboard recomputed successfully');
    } catch (err) {
      console.error('Error running recompute:', err);
      alert('Recompute failed — check console for details');
    } finally {
      setRecomputingLeaderboard(false);
    }
  };

  // Helper to fetch all rows from Supabase in pages (avoids 1000 row default limit)
  const fetchAllRows = async (table: string, select = '*', pageSize = 1000) => {
    const results: any[] = [];
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from(table).select(select).range(from, to);
      if (error) {
        console.error(`Error fetching ${table}:`, error.message || error);
        break;
      }
      if (!data || data.length === 0) break;
      results.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return results;
  };

  const fetchAdminStats = async () => {
    try {
      const { data: adminsData } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
      const approvals = await fetchAllRows('admin_approvals', '*');
      const { data: loginsData } = await supabase.from('admin_logins').select('*').order('logged_in_at', { ascending: false });

      const approvalsMap: Record<string, number> = {};
      (approvals || []).forEach((a: any) => { approvalsMap[a.admin_id] = (approvalsMap[a.admin_id] || 0) + 1; });

      const lastLoginMap: Record<string, string> = {};
      (loginsData || []).forEach((l: any) => { if (!lastLoginMap[l.admin_id]) lastLoginMap[l.admin_id] = l.logged_in_at; });

      const list = (adminsData || []).map((ad: any) => ({
        admin: ad,
        approvals: approvalsMap[ad.id] || 0,
        last_login: lastLoginMap[ad.id] || null,
        logged_in: currentAdmin?.id === ad.id
      }));

      setAdminStats(list);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  const filterMantris = () => {
    // Defensive filtering that tolerates missing fields
    let filtered = mantris || [];

    const term = (searchTerm || '').trim().toLowerCase();
    const college = (collegeFilter || '').trim().toLowerCase();

    if (term) {
      filtered = filtered.filter(mantri => {
        const name = (mantri.name || '').toLowerCase();
        const id = (mantri.gfg_mantri_id || '').toLowerCase();
        const email = (mantri.email || '').toLowerCase();
        return name.includes(term) || id.includes(term) || email.includes(term);
      });
    }

    if (college) {
      filtered = filtered.filter(mantri => ((mantri.college_name || '').toLowerCase().includes(college)));
    }

    setFilteredMantris(filtered);
  };

  const getUniqueColleges = () => {
    const colleges = mantris.map(mantri => mantri.college_name).filter(Boolean);
    return [...new Set(colleges)].sort();
  };
//proof section//
  const formatDate = (date?: string | null) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const exportData = async () => {
    // Fetch all rows directly from the DB so export contains everything (including duplicates and empty rows)
    const allMantris = await fetchAllRows('campus_mantris', '*');
    if (!allMantris || allMantris.length === 0) {
      alert('No campus mantris to export.');
      return;
    }

    const csvData = allMantris.map(mantri => {
      const mantriTasks = tasks.filter(task => task.assigned_to === mantri.id);
      const completed = mantriTasks.filter(task => task.status === 'completed').length;
      const leaderboardEntry = leaderboard.find(entry => entry.mantri_id === mantri.id);
      
      return {
        Name: mantri.name ?? 'EMPTY',
        Email: mantri.email ?? 'EMPTY',
        College: mantri.college_name ?? 'EMPTY',
        'GFG ID': mantri.gfg_mantri_id ?? 'EMPTY',
        'Total Tasks': mantriTasks.length,
        'Completed Tasks': completed,
        'Points': leaderboardEntry?.total_points || 0,
        'Rank': leaderboardEntry?.rank_position || 'N/A',
        'Success Rate': mantriTasks.length > 0 ? Math.round((completed / mantriTasks.length) * 100) + '%' : '0%',
        'Joined Date': formatDate(mantri.joined_date)
      };
    });

    const quote = (v: any) => {
      const s = String(v ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      Object.keys(csvData[0]).map(quote).join(','),
      ...csvData.map(row => Object.values(row).map(quote).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus_mantris_performance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statCards = [
    { title: 'Total Campus Mantris', value: stats.totalMantris, icon: Users, color: 'bg-cyan-500', change: '+12%' },
    { title: 'Active Admin Tasks', value: stats.activeTasks, icon: Target, color: 'bg-teal-500', change: '+8%' },
    { title: 'Pending Submissions', value: stats.pendingSubmissions, icon: Clock, color: 'bg-amber-500', change: '-5%' },
    { title: 'Active Colleges', value: stats.activeColleges, icon: Users, color: 'bg-emerald-500', change: '+3%' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">G</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Campus Mantri</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMantriList(true)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm hidden sm:block dark:text-slate-200 dark:hover:text-white"
            >
              Find Mantris
            </button>
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 py-12 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 dark:text-slate-100">Dashboard Overview</h2>
            <p className="text-gray-600 dark:text-slate-300">Monitor tasks, mantris, and performance metrics</p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-600 mb-2 dark:text-slate-400">Total Campus Mantris</p>
              <p className="text-4xl font-bold text-green-600 dark:text-emerald-300">{stats?.totalMantris || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-600 mb-2 dark:text-slate-400">Active Tasks</p>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-300">{stats?.activeTasks || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-600 mb-2 dark:text-slate-400">Pending Submissions</p>
              <p className="text-4xl font-bold text-amber-600 dark:text-amber-300">{stats?.pendingSubmissions || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-600 mb-2 dark:text-slate-400">Active Colleges</p>
              <p className="text-4xl font-bold text-teal-600 dark:text-teal-300">{stats?.activeColleges || 0}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Controls */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setCurrentView('tasks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'tasks'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Manage Tasks
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'leaderboard'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setCurrentView('submissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'submissions'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Submissions
          </button>
        </div>

        {!isSupabaseAvailable() && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-yellow-800"><strong>Warning:</strong> Supabase is not configured.</p>
          </div>
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Admin Activity Panel */}
            {currentAdmin?.is_super && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Admin Activity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">Admin Name</th>
                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">Approvals</th>
                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">Last Login</th>
                        <th className="px-4 py-2 text-left text-gray-700 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.map((row) => (
                        <tr key={row.admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.admin.name}</td>
                          <td className="px-4 py-3 text-gray-600">{row.approvals}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{row.last_login ? new Date(row.last_login).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3">{row.logged_in ? <span className="text-green-600 font-semibold">Online</span> : <span className="text-gray-400">Offline</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Task Management View */}
      {currentView === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                New Announcement
              </button>
              <button
                onClick={() => setShowTaskForm(true)}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
            </div>
          </div>

          {/* Active Tasks Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Active Tasks</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Task</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Assigned To</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Due Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Points</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-xs text-gray-600">{task.description}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {task.assigned_to ? 'Specific Mantri' : 'All Mantris'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {task.points ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          task.status === 'active' ? 'bg-green-100 text-green-800' :
                          task.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard View */}
      {currentView === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
              Campus Mantri Leaderboard
            </h3>
            {leaderboardLoading && (
              <div className="ml-4 text-sm text-gray-500 flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading leaderboard...
              </div>
            )}
          </div>

          {/* Points system note */}
          {pointsEnabled === false && (
            <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Points system not enabled.</strong>
                  <div className="text-sm">Leaderboard is ranked by tasks completed. Run the points migration to enable points and ranking by total points.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Show README or open migration file in editor — best-effort fallback
                      window.open('/supabase/migrations/20260114120000_reinstate_points_system.sql', '_blank');
                    }}
                    className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700"
                  >
                    View Migration
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <h4 className="text-lg font-semibold text-gray-900">Top Performers</h4>
                <p className="text-gray-600">Campus Mantris ranked by points (primary) then tasks completed</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus Mantri</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{entry.campus_mantris?.name}</div>
                          <div className="text-sm text-gray-500">{entry.campus_mantris?.gfg_mantri_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.campus_mantris?.college_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.total_points ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submissions View */}
      {currentView === 'submissions' && (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-2xl font-bold text-gray-900">
        Task Submissions with Proof
      </h3>
    </div>

    {/* ✅ WHITE CARD START */}
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-semibold text-gray-900">
            All Submissions
          </h4>
          <div className="w-64">
            <select
              value={selectedTaskFilter}
              onChange={(e) => {
                setSelectedTaskFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Tasks</option>
              {Array.from(
                new Map<string, AdminTask>(
                  (taskSubmissions || [])
                    .filter((s): s is TaskSubmission & { admin_tasks: AdminTask } => Boolean(s.admin_tasks?.id))
                    .map((s) => [s.admin_tasks.id, s.admin_tasks] as [string, AdminTask])
                    .sort((a, b) => 
                      (a[1].title || '').localeCompare(b[1].title || '')
                    )
                ).values()
              ).map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus Mantri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {taskSubmissions
  .filter(submission => 
    !selectedTaskFilter || submission.admin_tasks?.id === selectedTaskFilter
  )
              .map((submission) => (
              <tr key={submission.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {submission.campus_mantris?.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {submission.campus_mantris?.college_name}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                  {submission.admin_tasks?.title}
                </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                  <button
                    onClick={() => setSelectedSubmissionForView(submission)}
                    className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium"
                  >
                    View Text
                  </button>
                </td>

                <td className="px-6 py-4">
                  {submission.proof_url ? (
                    <a
                      href={submission.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline text-sm"
                    >
                      View Proof
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No proof</span>
                  )}
                </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(submission.submission_date)}
                </td>

                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    submission.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : submission.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {submission.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm">
                  {submission.status === 'submitted' ? (
                    <div className="flex flex-col gap-2 min-w-max">
                      <button
                        onClick={() => handleApproveSubmission(submission.id)}
                        className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors duration-200 whitespace-nowrap"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleRejectSubmission(submission.id, 'Please improve and resubmit')
                        }
                        className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors duration-200 whitespace-nowrap"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {submission.status === 'approved'
                        ? `✓ ${submission.points_awarded} pts`
                        : '✗ Rejected'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ PAGINATION INSIDE CARD */}
      <div className="flex justify-center items-center gap-4 py-6 border-t">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span className="font-semibold text-gray-700">
          Page {page} of {Math.ceil(totalSubmissions / PAGE_SIZE)}
        </span>

        <button
          onClick={() =>
            setPage(p =>
              p < Math.ceil(totalSubmissions / PAGE_SIZE) ? p + 1 : p
            )
          }
          disabled={page >= Math.ceil(totalSubmissions / PAGE_SIZE)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* ✅ SUBMISSION TEXT MODAL */}
      {selectedSubmissionForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSubmissionForView.campus_mantris?.name} - {selectedSubmissionForView.admin_tasks?.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted on {formatDate(selectedSubmissionForView.submission_date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmissionForView(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Submission Text</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-900 break-words">
                    {selectedSubmissionForView.submission_text}
                  </div>
                </div>
                {selectedSubmissionForView.proof_url && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Proof Link</h4>
                    <a
                      href={selectedSubmissionForView.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:text-cyan-800 hover:underline text-sm break-all"
                    >
                      {selectedSubmissionForView.proof_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ✅ WHITE CARD END */}
  </div>
)}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the task requirements"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={taskFormData.assigned_to}
                  onChange={(e) => setTaskFormData({...taskFormData, assigned_to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Campus Mantris</option>
                  {mantris.map(mantri => (
                    <option key={mantri.id} value={mantri.id}>{mantri.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  min={0}
                  value={taskFormData.points}
                  onChange={(e) => setTaskFormData({...taskFormData, points: Number(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Points awarded for completing this task"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Form Modal */}
      {showAnnouncementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Announcement</h2>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={announcementFormData.title}
                  onChange={(e) => setAnnouncementFormData({...announcementFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  required
                  value={announcementFormData.message}
                  onChange={(e) => setAnnouncementFormData({...announcementFormData, message: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Announcement message"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={announcementFormData.priority}
                  onChange={(e) => setAnnouncementFormData({...announcementFormData, priority: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="moderate">Moderate</option>
  <option value="high">High</option>
  <option value="urgent">Urgent</option>
</select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  Create Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* Campus Mantris List Modal */}
      {showMantriList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Campus Mantris Directory</h2>
                <button
                  onClick={() => setShowMantriList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Search and Filter */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Search by name, email, or GFG ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <select
                    value={collegeFilter}
                    onChange={(e) => setCollegeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Colleges</option>
                    {getUniqueColleges().map(college => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-96 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMantris.map((mantri) => {
                  // Consider both tasks assigned to the mantri and global tasks (assigned_to NULL)
                  const mantriTasks = tasks.filter(task => !task.assigned_to || task.assigned_to === mantri.id);
                  // Completed should be counted from approved submissions, not task.status
                  const completed = taskSubmissions.filter(s => s.mantri_id === mantri.id && s.status === 'approved').length;
                  const leaderboardEntry = leaderboard.find(entry => entry.mantri_id === mantri.id);
                  const successRate = mantriTasks.length > 0 ? Math.round((completed / mantriTasks.length) * 100) : 0;
                  
                  return (
                    <div key={mantri.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{mantri.name || 'EMPTY'}</h3>
                          <p className="text-sm text-gray-600">{mantri.college_name || 'EMPTY'}</p>
                          <p className="text-sm text-green-600 font-mono">{mantri.gfg_mantri_id || 'EMPTY'}</p>
                          <p className="text-xs text-gray-500">{mantri.email || 'EMPTY'}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-xs text-gray-600">Tasks: {completed}/{mantriTasks.length}</span>
                            <span className="text-xs text-yellow-600 font-semibold">Points: {leaderboardEntry?.total_points || 0}</span>
                            <span className="text-xs text-green-600 font-semibold">{successRate}%</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mantri.status === 'active' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {mantri.status || 'unknown'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {filteredMantris.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No campus mantris found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
