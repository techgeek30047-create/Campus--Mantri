import { Archive, Bell, CheckCircle, Clock, Download, FileText, Link, LogOut, Plus, RefreshCw, Search, Target, Trash2, TrendingUp, Trophy, Upload, Users, Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminTask, CampusMantri, LeaderboardEntry, supabase, Task, TaskSubmission } from '../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
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
  const [clearingTasks, setClearingTasks] = useState(false);
  const [clearingAnnouncements, setClearingAnnouncements] = useState(false);
  const [recomputingLeaderboard, setRecomputingLeaderboard] = useState(false);
  // 🔹 Submissions pagination state
const [page, setPage] = useState(1);
const PAGE_SIZE = 20;
const [totalSubmissions, setTotalSubmissions] = useState(0);


  // Task form state
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: ''
  });

  // Announcement form state
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as const
  });
  useEffect(() => {
  if (currentView === 'submissions') {
    setPage(1);
  }
}, [currentView]);
  useEffect(() => {
  fetchDashboardData();
}, [currentView]);
useEffect(() => {
  if (currentView === 'submissions') {
    fetchSubmissions();
  }
}, [page, currentView]);


  useEffect(() => {
    filterMantris();
  }, [searchTerm, collegeFilter, mantris]);
  const fetchSubmissions = async () => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from('task_submissions')
    .select(
      `
      *,
      admin_tasks (
        title,
        description,
        due_date,
        priority
      ),
      campus_mantris (
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

  if (error) {
    console.error('Submissions error:', error);
    return;
  }

  setTaskSubmissions(data || []);
  setTotalSubmissions(count || 0);
};


  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
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
      console.log('Admin tasks data:', adminTasksData);

      // Fetch task submissions with proof
      // 🔹 Fetch task submissions (PAGINATED)


      // Fetch leaderboard with simple query first
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
        .gt('tasks_completed', 0)
        .order('tasks_completed', { ascending: false });

      if (leaderboardError) {
        console.error('Leaderboard error:', leaderboardError);
      } else {
        console.log('Leaderboard fetched successfully:', leaderboardData?.length, 'entries');
        // Now enrich with campus_mantris data
        if (leaderboardData && leaderboardData.length > 0) {
          const enrichedData = await Promise.all(
            leaderboardData.map(async (entry) => {
              const { data: mantri } = await supabase
                .from('campus_mantris')
                .select('name, college_name, gfg_mantri_id')
                .eq('id', entry.mantri_id)
                .single();
              return {
                ...entry,
                campus_mantris: mantri
              };
            })
          );
          leaderboardData.length = 0;
          leaderboardData.push(...enrichedData);
        }
      }

     console.log(
  'Fetched data - mantris:',
  mantrisData?.length,
  'tasks:',
  tasksData?.length,
  'adminTasks:',
  adminTasksData?.length,
  'leaderboard:',
  leaderboardData?.length
);

if (mantrisData && adminTasksData) {

        setMantris(mantrisData || []);
        setTasks(tasksData || []);
        setAdminTasks(adminTasksData);
        setLeaderboard(leaderboardData || []);

        // Fetch exact total count (Supabase returns a 1,000 row cap by default)
        const { count: exactCount } = await supabase
          .from('campus_mantris')
          .select('*', { count: 'exact', head: true });

        const totalMantrisCount = typeof exactCount === 'number' ? exactCount : (mantrisData.length || 0);

        // Calculate comprehensive stats
        const activeTasks = adminTasksData.filter(task => task.status === 'active').length;
        const completedTasks = (tasksData || []).filter(task => task.status === 'completed').length;
        const { count: pendingCount, error: pendingError } = await supabase
  .from('task_submissions')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'submitted');

const pendingSubmissions = pendingCount ?? 0;

       const { data: allApprovedSubs } = await supabase
  .from('task_submissions')
  .select('points_awarded')
  .eq('status', 'approved');

const totalPointsAwarded =
  allApprovedSubs?.reduce((sum, s) => sum + (s.points_awarded || 0), 0) || 0;

        const normalizeCollege = (name?: string) =>
  (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/university|college|of|engineering|technology|institute|campus/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Fetch ALL campus mantris (no 1000 limit)
const allMantris = await fetchAllRows('campus_mantris', 'college_name,status');

// Normalize & count unique active colleges
const activeColleges = new Set(
  allMantris
    .filter((m: any) => m.status === 'active')
    .map((m: any) => normalizeCollege(m.college_name))
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

      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .insert([{
          title: taskFormData.title,
          description: taskFormData.description,
          assigned_to: taskFormData.assigned_to || null,
          due_date: taskFormData.due_date
        }]);

      if (error) throw error;

      setTaskFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: ''
      });
      setShowTaskForm(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating task:', error);
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
  // ✅ 1. OPTIMISTIC UI UPDATE (instant approve feel)
  setTaskSubmissions(prev =>
    prev.map(sub =>
      sub.id === submissionId
        ? { ...sub, status: 'approved' }
        : sub
    )
  );

  try {
    // ✅ 2. Backend RPC (background me chalega)
    const { error } = await supabase.rpc('approve_submission', {
      submission_id: submissionId
    });

    if (error) {
      console.error('Approve failed:', error);
      // rollback only if backend fails
      fetchDashboardData();
    }
  } catch (err) {
    console.error('Approve error:', err);
    fetchDashboardData();
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
    // ✅ 2. Backend update (background me)
    const { error } = await supabase
      .from('task_submissions')
      .update({
        status: 'rejected',
        admin_feedback: feedback || 'Task needs improvement. Please resubmit.'
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Reject failed:', error);
      // rollback only if backend fails
      fetchDashboardData();
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
    const colleges = mantris.map(mantri => mantri.college_name);
    return [...new Set(colleges)].sort();
  };
//proof section//
  const getProofTypeIcon = (proofType: string) => {
    switch (proofType) {
      case 'linkedin': return <Link className="h-4 w-4" />;
      case 'image': return <Upload className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Link className="h-4 w-4" />;
    }
  };

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

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
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
    { title: 'Total Campus Mantris', value: stats.totalMantris, icon: Users, color: 'bg-blue-500', change: '+12%' },
    { title: 'Active Admin Tasks', value: stats.activeTasks, icon: Target, color: 'bg-purple-500', change: '+8%' },
    { title: 'Pending Submissions', value: stats.pendingSubmissions, icon: Clock, color: 'bg-yellow-500', change: '-5%' },
    { title: 'Active Colleges', value: stats.activeColleges, icon: Users, color: 'bg-indigo-500', change: '+3%' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl border-b-4 border-indigo-400/50">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-6 sm:space-y-0">
            <div className="text-white">
              <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-indigo-100 text-lg font-medium mt-2">Task Management & Analytics</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleClearOldTasks}
                disabled={clearingTasks}
                className="bg-red-500/90 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm disabled:opacity-50 transform hover:-translate-y-1"
              >
                <Archive className="h-4 w-4" />
                <span>{clearingTasks ? 'Clearing...' : 'Clear Completed'}</span>
              </button>
              <button
                onClick={handleClearOldAnnouncements}
                disabled={clearingAnnouncements}
                className="bg-orange-500/90 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm disabled:opacity-50 transform hover:-translate-y-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>{clearingAnnouncements ? 'Clearing...' : 'Clear Announcements'}</span>
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className="bg-yellow-500/90 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1"
              >
                <Trophy className="h-5 w-5" />
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => setCurrentView('tasks')}
                className="bg-purple-500/90 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1"
              >
                <Target className="h-5 w-5" />
                <span>Manage Tasks</span>
              </button>
              <button
                onClick={() => setShowMantriList(true)}
                className="bg-blue-500/90 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1"
              >
                <Search className="h-5 w-5" />
                <span>Find Mantris</span>
              </button>
              <button
                onClick={exportData}
                className="bg-green-500/90 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1"
              >
                <Download className="h-5 w-5" />
                <span>Export Data</span>
              </button>
              <button
                onClick={handleRecomputeLeaderboard}
                disabled={recomputingLeaderboard}
                className="bg-amber-400/90 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1 disabled:opacity-50"
              >
                <RefreshCw className="h-5 w-5" />
                <span>{recomputingLeaderboard ? 'Recomputing...' : 'Recompute Leaderboard'}</span>
              </button>
              <button
                onClick={onLogout}
                className="bg-red-600/90 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold text-sm transform hover:-translate-y-1"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            {/* Mobile menu toggle - visible on small screens */}
            <div className="sm:hidden">
              <button
                onClick={() => setShowMobileMenu((s) => !s)}
                aria-label="Open mobile menu"
                className="p-2 bg-white/10 text-white rounded-lg shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            </div>
          </div>
        </div>
      </header>

    {/* Mobile menu panel */}
    {showMobileMenu && (
      <div className="sm:hidden fixed top-20 right-4 z-50 w-[90%] max-w-xs bg-slate-800/95 rounded-xl p-4 shadow-2xl">
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowMobileMenu(false)} className="text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={handleClearOldTasks} className="w-full text-left px-4 py-2 rounded-lg bg-red-500 text-white">{clearingTasks ? 'Clearing...' : 'Clear Completed'}</button>
          <button onClick={handleClearOldAnnouncements} className="w-full text-left px-4 py-2 rounded-lg bg-orange-500 text-white">{clearingAnnouncements ? 'Clearing...' : 'Clear Announcements'}</button>
          <button onClick={() => { setCurrentView('leaderboard'); setShowMobileMenu(false);} } className="w-full text-left px-4 py-2 rounded-lg bg-yellow-500 text-white">Leaderboard</button>
          <button onClick={() => { setCurrentView('tasks'); setShowMobileMenu(false);} } className="w-full text-left px-4 py-2 rounded-lg bg-purple-600 text-white">Manage Tasks</button>
          <button onClick={() => { setShowMantriList(true); setShowMobileMenu(false);} } className="w-full text-left px-4 py-2 rounded-lg bg-blue-500 text-white">Find Mantris</button>
          <button onClick={() => { exportData(); setShowMobileMenu(false);} } className="w-full text-left px-4 py-2 rounded-lg bg-green-500 text-white">Export Data</button>
          <button onClick={() => { onLogout(); setShowMobileMenu(false);} } className="w-full text-left px-4 py-2 rounded-lg bg-red-600 text-white">Logout</button>
        </div>
      </div>
    )}

      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 bg-slate-800/50 backdrop-blur-sm p-2 rounded-xl border border-slate-700 w-fit">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { key: 'tasks', label: 'Task Management', icon: Target },
            { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { key: 'submissions', label: 'Submissions', icon: CheckCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setCurrentView(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                  currentView === tab.key
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <>
            {/* Enhanced Stats Cards - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="group relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-2xl p-7 border border-slate-600 hover:border-indigo-400/50 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-3xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-slate-300 text-sm font-bold uppercase tracking-wider">{stat.title}</p>
                        <div className={`${stat.color} p-3 rounded-xl shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                      <p className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {stat.change} from last month
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      {/* Task Management View */}
      {currentView === 'tasks' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-bold text-white">Task Management</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold transform hover:-translate-y-1"
              >
                <Bell className="h-5 w-5" />
                <span>New Announcement</span>
              </button>
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold transform hover:-translate-y-1"
              >
                <Plus className="h-5 w-5" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Active Admin Tasks */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-2xl border border-slate-600 overflow-hidden">
            <div className="p-6 border-b border-slate-600 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
              <h4 className="text-xl font-bold text-white">Active Tasks</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {adminTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-white">{task.title}</div>
                          <div className="text-sm text-slate-400">{task.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                        {task.assigned_to ? 'Specific Mantri' : 'All Mantris'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg ${
                          task.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                          task.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' :
                          'bg-slate-500/20 text-slate-300 border border-slate-500/50'
                        }`}>
                          {task.status.toUpperCase()}
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
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <h4 className="text-lg font-semibold text-gray-900">Top Performers</h4>
                <p className="text-gray-600">Campus Mantris ranked by tasks completed</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus Mantri</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
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
        <h4 className="text-lg font-semibold text-gray-900">
          All Submissions
        </h4>
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
            {taskSubmissions.map((submission) => (
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

                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {submission.submission_text}
                </td>

                <td className="px-6 py-4">
                  {submission.proof_url ? (
                    <a
                      href={submission.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
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
                      ? 'bg-green-100 text-green-800'
                      : submission.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {submission.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm space-x-2">
                  {submission.status === 'submitted' ? (
                    <>
                      <button
                        onClick={() => handleApproveSubmission(submission.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleRejectSubmission(submission.id, 'Please improve and resubmit')
                        }
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500">
                      {submission.status === 'approved'
                        ? `${submission.points_awarded} pts awarded`
                        : 'Rejected'}
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
