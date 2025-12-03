import { Archive, Bell, CheckCircle, Clock, Download, FileText, Link, LogOut, Plus, Search, Target, Trash2, TrendingUp, Trophy, Upload, Users } from 'lucide-react';
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'tasks' | 'leaderboard' | 'submissions'>('dashboard');
  const [clearingTasks, setClearingTasks] = useState(false);
  const [clearingAnnouncements, setClearingAnnouncements] = useState(false);

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
    fetchDashboardData();
  }, []);

  useEffect(() => {
    filterMantris();
  }, [searchTerm, collegeFilter, mantris]);

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
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('task_submissions')
        .select(`
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
        `)
        .order('submitted_at', { ascending: false });

      if (submissionsError) console.error('Submissions error:', submissionsError);

      // Fetch leaderboard with simple query first
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
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

      console.log('Fetched data - mantris:', mantrisData?.length, 'tasks:', tasksData?.length, 'adminTasks:', adminTasksData?.length, 'submissions:', submissionsData?.length, 'leaderboard:', leaderboardData?.length);

      if (mantrisData && adminTasksData && submissionsData) {
        setMantris(mantrisData || []);
        setTasks(tasksData || []);
        setAdminTasks(adminTasksData);
        setTaskSubmissions(submissionsData);
        setLeaderboard(leaderboardData || []);

        // Calculate comprehensive stats
        const activeTasks = adminTasksData.filter(task => task.status === 'active').length;
        const completedTasks = (tasksData || []).filter(task => task.status === 'completed').length;
        const pendingSubmissions = submissionsData.filter(sub => sub.status === 'submitted').length;
        const totalPointsAwarded = submissionsData.reduce((sum, sub) => sum + (sub.points_awarded || 0), 0);
        const activeColleges = new Set(mantrisData.map(m => m.college_name)).size;

        setStats({
          totalMantris: mantrisData.length,
          activeTasks,
          completedTasks,
          totalTasks: (tasksData || []).length,
          pendingSubmissions,
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
  try {
    const { error } = await supabase.rpc('approve_submission', {
      submission_id: submissionId,
      points_value: 0
    });

    if (error) {
      console.error('Error approving submission:', error);
      return;
    }

    fetchDashboardData();
  } catch (error) {
    console.error('Error approving submission:', error);
  }
};

  const handleRejectSubmission = async (submissionId: string, feedback: string) => {
    try {
      const { error } = await supabase
        .from('task_submissions')
        .update({
          status: 'rejected',
          admin_feedback: feedback || 'Task needs improvement. Please resubmit.'
        })
        .eq('id', submissionId);

      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting submission:', error);
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

  const filterMantris = () => {
    let filtered = mantris;

    if (searchTerm) {
      filtered = filtered.filter(mantri => 
        mantri.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mantri.gfg_mantri_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mantri.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (collegeFilter) {
      filtered = filtered.filter(mantri => 
        mantri.college_name.toLowerCase().includes(collegeFilter.toLowerCase())
      );
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

  const exportData = () => {
    const csvData = mantris.map(mantri => {
      const mantriTasks = tasks.filter(task => task.assigned_to === mantri.id);
      const completed = mantriTasks.filter(task => task.status === 'completed').length;
      const leaderboardEntry = leaderboard.find(entry => entry.mantri_id === mantri.id);
      
      return {
        Name: mantri.name,
        Email: mantri.email,
        College: mantri.college_name,
        'GFG ID': mantri.gfg_mantri_id,
        'Total Tasks': mantriTasks.length,
        'Completed Tasks': completed,
        'Points': leaderboardEntry?.total_points || 0,
        'Rank': leaderboardEntry?.rank_position || 'N/A',
        'Success Rate': mantriTasks.length > 0 ? Math.round((completed / mantriTasks.length) * 100) + '%' : '0%',
      priority: 'task_1',
        'Joined Date': new Date(mantri.joined_date).toLocaleDateString()
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
    { title: 'Completed Tasks', value: stats.completedTasks, icon: CheckCircle, color: 'bg-green-500', change: '+15%' },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600">Task Management</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearOldTasks}
            disabled={clearingTasks}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            <span>{clearingTasks ? 'Clearing...' : 'Clear Completed Tasks'}</span>
          </button>
          <button
            onClick={handleClearOldAnnouncements}
            disabled={clearingAnnouncements}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{clearingAnnouncements ? 'Clearing...' : 'Clear Announcements'}</span>
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-6 py-3 rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Trophy className="h-5 w-5" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setCurrentView('tasks')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Target className="h-5 w-5" />
            <span>Manage Tasks</span>
          </button>
          <button
            onClick={() => setShowMantriList(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Search className="h-5 w-5" />
            <span>Find Mantris</span>
          </button>
          <button
            onClick={exportData}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Download className="h-5 w-5" />
            <span>Export Data</span>
          </button>
          <button
            onClick={onLogout}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                currentView === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
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
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      <p className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change} from last month
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Task Management View */}
      {currentView === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">Task Management</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
              >
                <Bell className="h-5 w-5" />
                <span>New Announcement</span>
              </button>
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Active Admin Tasks */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Active Tasks</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.assigned_to ? 'Specific Mantri' : 'All Mantris'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(task.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'active' ? 'bg-green-100 text-green-800' :
                          task.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Completed</th>
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
                        {entry.tasks_completed}
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
            <h3 className="text-2xl font-bold text-gray-900">Task Submissions with Proof</h3>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">All Submissions</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus Mantri</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taskSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{submission.campus_mantris?.name}</div>
                          <div className="text-sm text-gray-500">{submission.campus_mantris?.college_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{submission.admin_tasks?.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{submission.submission_text}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.proof_url ? (
                          <div className="flex items-center space-x-2">
                            {getProofTypeIcon(submission.proof_type || 'link')}
                            <a 
                              href={submission.proof_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View Proof
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No proof</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(submission.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {submission.status}
                        </span>
                      </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {submission.status === 'submitted' && (
                <>
          <button
        onClick={() =>
          handleApproveSubmission(submission.id)
        }
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
  )}
  {submission.status !== 'submitted' && (
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
          </div>
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
                  const mantriTasks = tasks.filter(task => task.assigned_to === mantri.id);
                  const completed = mantriTasks.filter(task => task.status === 'completed').length;
                  const leaderboardEntry = leaderboard.find(entry => entry.mantri_id === mantri.id);
                  const successRate = mantriTasks.length > 0 ? Math.round((completed / mantriTasks.length) * 100) : 0;
                  
                  return (
                    <div key={mantri.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{mantri.name}</h3>
                          <p className="text-sm text-gray-600">{mantri.college_name}</p>
                          <p className="text-sm text-green-600 font-mono">{mantri.gfg_mantri_id}</p>
                          <p className="text-xs text-gray-500">{mantri.email}</p>
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
                          {mantri.status}
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