import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, CheckCircle, Plus, LogOut, Bell, Target, Link, FileText } from 'lucide-react';
import { supabase, CampusMantri, AdminTask, TaskSubmission, AdminAnnouncement } from '../lib/supabase';
import { AuthUser, authService } from '../lib/auth';
import Footer from './Footer';

interface TaskSubmitterProps {
  user: AuthUser;
  onLogout: () => void;
}

const TaskSubmitter: React.FC<TaskSubmitterProps> = ({ user, onLogout }) => {
  const [campusMantri, setCampusMantri] = useState<CampusMantri | null>(null);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userLeaderboardData, setUserLeaderboardData] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [topFive, setTopFive] = useState<any[]>([]);
  const [showTopFiveModal, setShowTopFiveModal] = useState(false);

  // Form states
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [proofType, setProofType] = useState<'linkedin' | 'google_docs' | 'drive_link' | 'other'>('linkedin');

  useEffect(() => {    
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      
      // Check if Supabase is available
      if (!supabase) {
        console.error('❌ Supabase not available');
        setLoading(false);
        return;
      }

      // Fetch campus mantri profile
      const { data: mantriData, error: mantriError } = await supabase
        .from('campus_mantris')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let currentMantri = null;

      if (mantriError) {
        console.warn('⚠️ Could not fetch mantri data by user_id:', mantriError.message);
      } else if (mantriData) {
        currentMantri = mantriData;
        setCampusMantri(mantriData);
      }

      // If no profile found by user_id, try to find by email as fallback
      if (!currentMantri) {
        const { data: mantriByEmail, error: emailError } = await supabase
          .from('campus_mantris')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
          
        if (emailError) {
          console.warn('⚠️ Could not fetch mantri data by email:', emailError.message);
        } else if (mantriByEmail) {
          // Update user_id for future lookups
          const { error: updateError } = await supabase
            .from('campus_mantris')
            .update({ user_id: user.id })
            .eq('email', user.email);
            
          if (updateError) {
            console.warn('⚠️ Could not update user_id:', updateError.message);
          }
          
          currentMantri = mantriByEmail;
          setCampusMantri(mantriByEmail);
        } else {
          console.warn('⚠️ No campus mantri profile found for email:', user.email);
        }
      }

      // If still no profile found after both attempts, show helpful message
      if (!currentMantri) {
        setLoading(false);
        return;
      }


      // Fetch active tasks - only show tasks assigned to this mantri or tasks not assigned to anyone (general tasks)
      let tasksQuery = supabase
        .from('admin_tasks')
        .select('*')
        .eq('status', 'active')
        .or('is_archived.is.null,is_archived.eq.false');

      // Filter by assigned_to: either assigned to current mantri or assigned_to is null (general task for everyone)
      if (currentMantri?.id) {
        tasksQuery = tasksQuery.or(`assigned_to.eq.${currentMantri.id},assigned_to.is.null`);
      } else {
        tasksQuery = tasksQuery.is('assigned_to', null);
      }

      const { data: tasksData, error: tasksError } = await tasksQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (tasksError) {
        console.warn('⚠️ Could not fetch tasks:', tasksError.message);
        setTasks([]);
      } else {
        setTasks(tasksData || []);
      }
      

      // Fetch user's submissions
      if (currentMantri?.id) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('task_submissions')
          .select(`
            *,
            admin_tasks (
              title,
              priority
            )
          `)
          .eq('mantri_id', currentMantri.id)
          .order('submitted_at', { ascending: false });

        if (submissionsError) {
          console.warn('⚠️ Could not fetch submissions:', submissionsError.message);
          setSubmissions([]);
          setApprovedCount(0);
          setTotalPoints(0);
        } else {
          setSubmissions(submissionsData || []);

          // Compute approved submissions and total points (fallback to admin_tasks.points when points_awarded is missing)
          const approved = (submissionsData || []).filter((s: any) => s.status === 'approved');
          const approvedLen = approved.length || 0;
          const pointsSum = approved.reduce((sum: number, s: any) => {
            return sum + (Number(s.points_awarded ?? s.admin_tasks?.points ?? 0) || 0);
          }, 0);

          setApprovedCount(approvedLen);
          setTotalPoints(pointsSum);
        }
      } else {
        setSubmissions([]);
      }

      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcementsError) {
        console.warn('⚠️ Could not fetch announcements:', announcementsError.message);
        setAnnouncements([]);
      } else {
        setAnnouncements(announcementsData || []);
      }

      // Fetch leaderboard entries (no nested selects to avoid schema relationship issues)
      try {
        // Try selecting with total_points first; if the column is missing, retry without it
        let lbRes: any = await supabase
          .from('leaderboard')
          .select('mantri_id, tasks_completed, rank_position, total_points')
          .order('tasks_completed', { ascending: false })
          .limit(10);

        if (lbRes.error) {
          const msg = String(lbRes.error.message || '').toLowerCase();
          const code = lbRes.error.code || '';
          if (code === '42703' || msg.includes('total_points')) {
            console.warn('total_points column missing; retrying leaderboard select without total_points:', lbRes.error);
            lbRes = await supabase
              .from('leaderboard')
              .select('mantri_id, tasks_completed, rank_position')
              .order('tasks_completed', { ascending: false })
              .limit(10);
          } else {
            console.warn('⚠️ Could not fetch leaderboard (initial):', lbRes.error);
            setLeaderboard([]);
            lbRes = null;
          }
        }

        if (lbRes && !lbRes.error) {
          const rows = lbRes.data || [];
          // Batch fetch mantri details for enrichment
          const mantriIds = Array.from(new Set(rows.map((r: any) => r.mantri_id).filter(Boolean)));
          let mantriMap: Record<string, any> = {};
          if (mantriIds.length > 0) {
            try {
              const { data: mantris } = await supabase
                .from('campus_mantris')
                .select('id, name, college_name')
                .in('id', mantriIds)
                .limit(1000);
              mantriMap = (mantris || []).reduce((acc: any, m: any) => { acc[m.id] = m; return acc; }, {});
            } catch (err) {
              console.warn('⚠️ Could not fetch campus mantri details for leaderboard enrichment:', err);
            }
          }

          const enriched = rows.map((r: any) => ({
            ...r,
            campus_mantris: mantriMap[r.mantri_id] || null
          }));

          setLeaderboard(enriched);
        }
      } catch (err) {
        console.warn('⚠️ Unexpected error fetching leaderboard:', err);
        setLeaderboard([]);
      }

      // Fetch top 5 by total_points first, fallback to tasks_completed. Enrich with mantri details and calculated points.
      try {
        let topData: any[] = [];

        const tryQuery = async (orderBy: string) => {
          // try selecting total_points column first, but fallback to a safer select if the column is missing
          let res: any = await supabase
            .from('leaderboard')
            .select('mantri_id, tasks_completed, rank_position, total_points')
            .order(orderBy, { ascending: false })
            .limit(5);

          if (res.error) {
            const msg = String(res.error.message || '').toLowerCase();
            const code = res.error.code || '';
            if (code === '42703' || msg.includes('total_points')) {
              console.warn('total_points column missing for top-5; retrying without it:', res.error);
              res = await supabase
                .from('leaderboard')
                .select('mantri_id, tasks_completed, rank_position')
                .order(orderBy, { ascending: false })
                .limit(5);
            }
          }

          return { data: res.data, error: res.error };
        };

        // Prefer ordering by total_points, but if it fails, fall back to tasks_completed
        const { data: tByPoints, error: tPointsErr } = await tryQuery('total_points');
        if (!tPointsErr && tByPoints && tByPoints.length > 0) topData = tByPoints;
        else {
          const { data: tByTasks, error: tTasksErr } = await tryQuery('tasks_completed');
          if (!tTasksErr && tByTasks) topData = tByTasks;
        }

        // Enrich with mantri details
        const mantriIdsTop = Array.from(new Set((topData || []).map((r: any) => r.mantri_id).filter(Boolean)));
        let mantriMapTop: Record<string, any> = {};
        let pointsMapTop: Record<string, number> = {};
        
        if (mantriIdsTop.length > 0) {
          try {
            const { data: mantrisTop } = await supabase
              .from('campus_mantris')
              .select('id, name, college_name')
              .in('id', mantriIdsTop)
              .limit(1000);
            mantriMapTop = (mantrisTop || []).reduce((acc: any, m: any) => { acc[m.id] = m; return acc; }, {});
          } catch (err) {
            console.warn('⚠️ Could not fetch campus mantri details for top 5 enrichment:', err);
          }

          // Fetch actual calculated points for each top mantri from their submissions
          try {
            const { data: topSubmissions } = await supabase
              .from('task_submissions')
              .select('mantri_id, points_awarded')
              .in('mantri_id', mantriIdsTop)
              .eq('status', 'approved');
            
            if (topSubmissions) {
              pointsMapTop = mantriIdsTop.reduce((acc: any, id: any) => {
                acc[id] = topSubmissions
                  .filter((s: any) => s.mantri_id === id)
                  .reduce((sum: number, s: any) => sum + (Number(s.points_awarded ?? 0) || 0), 0);
                return acc;
              }, {});
            }
          } catch (err) {
            console.warn('⚠️ Could not fetch submission points for top 5:', err);
          }
        }

        const enrichedTop = (topData || []).map((r: any) => ({ 
          ...r, 
          campus_mantris: mantriMapTop[r.mantri_id] || null,
          calculated_points: pointsMapTop[r.mantri_id] ?? (r.total_points ?? r.tasks_completed ?? 0)
        }));
        setTopFive(enrichedTop);
      } catch (err) {
        console.warn('⚠️ Could not fetch top 5 leaderboard:', err);
        setTopFive([]);
      }

      // Fetch user's leaderboard data (try to include total_points but fall back on available fields)
      if (currentMantri?.id) {
        try {
          const { data: userLeaderboard, error: userLeaderboardError } = await supabase
            .from('leaderboard')
            .select('tasks_completed, rank_position, total_points')
            .eq('mantri_id', currentMantri.id)
            .maybeSingle();

          if (userLeaderboardError) {
            // Try a simpler select
            console.warn('Could not fetch user leaderboard data with points:', userLeaderboardError.message);
            const { data: simpler, error: simplerErr } = await supabase
              .from('leaderboard')
              .select('tasks_completed, rank_position')
              .eq('mantri_id', currentMantri.id)
              .maybeSingle();

            if (simplerErr) {
              console.warn('Could not fetch user leaderboard data (fallback):', simplerErr.message);
              setUserLeaderboardData(null);
            } else {
              setUserLeaderboardData(simpler);
            }
          } else {
            setUserLeaderboardData(userLeaderboard);
          }
        } catch (err) {
          console.warn('Could not fetch user leaderboard data:', err);
          setUserLeaderboardData(null);
        }
      }


    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      alert('Database connection not available. Please configure Supabase API key.');
      return;
    }
    
    if (!selectedTask || !submissionText.trim() || !submissionLink.trim()) {
      alert('Please select a task, provide submission description, and add a proof link');
      return;
    }

    // Validate proof link format based on type
    const validateProofLink = (link: string, type: string) => {
      const url = link.toLowerCase();
      switch (type) {
        case 'linkedin':
          return url.includes('linkedin.com');
        case 'google_docs':
          return url.includes('docs.google.com') || url.includes('drive.google.com');
        case 'drive_link':
          return url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('onedrive.com');
        default:
          return true; // Allow any valid URL for 'other'
      }
    };

    if (!validateProofLink(submissionLink, proofType)) {
      alert(`Please provide a valid ${proofType.replace('_', ' ')} link`);
      return;
    }

    if (!campusMantri?.id) {
      alert('Error: Campus Mantri profile not found');
      return;
    }
    try {
      setSubmissionLoading(selectedTask);

      const { error } = await supabase
        .from('task_submissions')
        .insert({
          mantri_id: campusMantri!.id,
          admin_task_id: selectedTask,
          submission_text: submissionText,
          submission_date: new Date().toISOString().split('T')[0],
          proof_url: submissionLink,
          proof_type: proofType,
          status: 'submitted'
        });

      if (error) throw error;

      // Reset form
      setSelectedTask('');
      setSubmissionText('');
      setSubmissionLink('');
      setProofType('linkedin');

      // Refresh data
      fetchData();
      
      alert('Task submitted successfully!');
    } catch (error) {
      console.error('Error submitting task:', error);
      alert(`Error submitting task: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmissionLoading(null);
    }
  };

  // Priority/points helpers removed — system now tracks only tasks_completed.

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCurrentRank = () => {
    if (!campusMantri?.name) return null;
    const userEntry = leaderboard.find(entry => 
      entry.campus_mantris?.name === campusMantri.name
    );
    return userEntry?.rank_position || leaderboard.findIndex(entry => 
      entry.campus_mantris?.name === campusMantri.name
    ) + 1 || null;
  };

  const getTaskDisplayName = (title: string) => {
    const match = title.match(/^(Task \d+)/i);
    return match ? match[1] : title;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!campusMantri) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Campus Mantri Profile Required</h3>
            <p className="text-blue-600 mb-4">
              You need to register as a Campus Mantri to access this dashboard. 
              Please contact your administrator or register with your Campus Mantri credentials.
            </p>
            <button
              onClick={() => {
                authService.logout();
                window.location.reload();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-3"
            >
              Back to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl border-b-4 border-emerald-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/30">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">Task Submitter</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="bg-white/20 hover:bg-red-500/30 text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center gap-2 border border-white/30 hover:border-red-400/50"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Card - Centered */}
        <div className="flex justify-center mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-emerald-100/50 p-8 w-full max-w-2xl hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center space-x-6">
              <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-4 rounded-2xl shadow-md">
                <User className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Welcome, {campusMantri.name}!</h2>
                <p className="text-gray-600 text-lg font-medium mt-1">{campusMantri.college_name}</p>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <div className="flex items-stretch gap-6">
                {/* Tasks Completed Card */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 text-center border border-emerald-200/50 shadow-md min-w-[220px]">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                    <span className="text-4xl font-bold text-gray-900">{userLeaderboardData?.tasks_completed || 0}</span>
                  </div>
                  <p className="text-emerald-700 font-semibold text-lg">Tasks Completed</p>
                </div>

                {/* Small Points & Top-5 Leaderboard Card */}
                <div className="bg-white/90 rounded-2xl p-4 border border-emerald-100 shadow-md w-[340px]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Points</p>
                      <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Your Rank</p>
                      <p className="text-lg font-semibold text-emerald-700">{userLeaderboardData?.rank_position || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">See who's on top</p>
                      <button
                        onClick={() => setShowTopFiveModal(true)}
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        View Top 5 →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
                    <Bell className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Latest Announcements</h3>
                </div>
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-r-xl hover:shadow-md transition-all">
                      <h4 className="font-bold text-gray-900 text-lg">{announcement.title}</h4>
                      <p className="text-gray-700 mt-2 leading-relaxed">{announcement.message}</p>
                      <p className="text-sm text-gray-500 mt-3 font-medium">
                        Date: {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Submission Form */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-3 rounded-xl">
                  <Plus className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Submit Task with Proof</h3>
              </div>

              <form onSubmit={handleSubmitTask} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Task <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white font-medium shadow-sm hover:shadow-md transition-all"
                    required
                  >
                    <option value="">Choose a task...</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {getTaskDisplayName(task.title)} - Due: {new Date(task.due_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  
                  {/* Show selected task description */}
                  {selectedTask && (
                    <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Task Details:
                      </h4>
                      {(() => {
                        const task = tasks.find(t => t.id === selectedTask);
                        return task ? (
                          <div className="space-y-3">
                            <div>
                              <span className="font-semibold text-blue-800">Title: </span>
                              <span className="text-blue-700 font-medium">{task.title}</span>
                            </div>
                            {task.description && (
                              <div>
                                <span className="font-semibold text-blue-800">Description: </span>
                                <div 
                                  className="text-blue-700 mt-2 whitespace-pre-wrap break-words leading-relaxed bg-white/50 p-3 rounded-lg"
                                  dangerouslySetInnerHTML={{
                                    __html: task.description.replace(
                                      /https?:\/\/[^\s]+/g, 
                                      '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">$&</a>'
                                    )
                                  }}
                                />
                              </div>
                            )}
                            <div className="text-sm font-medium text-blue-600 bg-white/50 p-2 rounded inline-block">
                              Date Due: {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Task Submission Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={4}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white font-medium shadow-sm hover:shadow-md transition-all resize-none"
                    placeholder="Describe what you accomplished for this task..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Proof Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={proofType}
                    onChange={(e) => setProofType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white font-medium shadow-sm hover:shadow-md transition-all"
                    required
                  >
                    <option value="linkedin">LinkedIn Post/Activity</option>
                    <option value="google_docs">Google Docs/Sheets</option>
                    <option value="drive_link">Google Drive/Cloud Storage</option>
                    <option value="other">Other Link/Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Proof Link <span className="text-red-500">*</span> (Required)
                  </label>
                  <div className="flex items-center gap-3 bg-white px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent shadow-sm hover:shadow-md transition-all">
                    <Link className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <input
                      type="url"
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      required
                      className="flex-1 outline-none font-medium"
                      placeholder={
                        proofType === 'linkedin' ? 'https://linkedin.com/posts/your-post' :
                        proofType === 'google_docs' ? 'https://docs.google.com/document/...' :
                        proofType === 'drive_link' ? 'https://drive.google.com/file/...' :
                        'https://your-proof-link.com'
                      }
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    {proofType === 'linkedin' && '🔗 Share your LinkedIn post about this task'}
                    {proofType === 'google_docs' && '📄 Share your Google Docs/Sheets document'}
                    {proofType === 'drive_link' && '☁️ Share your file from Google Drive or other cloud storage'}
                    {proofType === 'other' && '🔗 Share any relevant proof link or document'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submissionLoading === selectedTask}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  {submissionLoading === selectedTask ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Submit Task</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* My Submissions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">My Submissions</h3>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No submissions yet. Submit your first task above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border border-gray-300 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">
                            {submission.admin_tasks?.title}
                          </h4>
                          {submission.submission_text && (
                            <p className="text-gray-600 mt-2 leading-relaxed">{submission.submission_text}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                              submission.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                              submission.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-yellow-100 text-yellow-800 border-yellow-300'
                            }`}>
                              ✓ {submission.status.toUpperCase()}
                            </span>
                            {submission.proof_type && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-100 text-blue-800 border-blue-300">
                                {submission.proof_type.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div> 
                          {submission.proof_url && (
                            <a
                              href={submission.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 mt-3 font-bold transition-colors"
                            >
                              <Link className="h-4 w-4" />
                              <span className="text-sm">View Proof</span>
                            </a>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500 ml-4 flex-shrink-0">
                          <p className="font-semibold">{new Date(submission.submitted_at).toLocaleDateString()}</p>
                          <p className="text-xs mt-1">{new Date(submission.submitted_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      
                      {submission.admin_feedback && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm font-bold text-blue-900">💬 Admin Feedback:</p>
                          <p className="text-sm text-blue-700 mt-2 leading-relaxed">{submission.admin_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl border border-emerald-200/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="text-center">
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <User className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{campusMantri.name}</h3>
                <p className="text-gray-600 font-medium mt-1">{campusMantri.college_name}</p>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm bg-white/50 p-3 rounded-lg">
                  <Mail className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium break-all">{campusMantri.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm bg-white/50 p-3 rounded-lg">
                  <Phone className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{campusMantri.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm bg-white/50 p-3 rounded-lg">
                  <User className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{campusMantri.gfg_mantri_id}</span>
                </div>
              </div>
            </div>

            {/* Available Tasks */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
                  <Target className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Available Tasks</h3>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium">No active tasks available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="border border-gray-300 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-all hover:border-emerald-300">
                      <h4 className="font-bold text-gray-900 text-sm">{task.title}</h4>
                      {task.description && (
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          <div 
                            className="whitespace-pre-wrap break-words line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: task.description
                                .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:text-emerald-800 underline font-semibold">Link</a>')
                                .substring(0, 150) + (task.description.length > 150 ? '...' : '')
                            }}
                          />
                        </div>
                      )}
                      <div className="text-xs text-emerald-600 mt-3 font-semibold">
                        📅 Due: {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <p className="text-sm text-gray-500 text-center font-medium py-2">
                      +{tasks.length - 5} more tasks available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Points Modal */}


      {/* Top 5 Leaderboard Modal */}
      {showTopFiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowTopFiveModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-4">Top 5 Campus Mantris</h3>
            <div className="space-y-3">
              {topFive.length === 0 && (
                <div className="text-sm text-gray-500">No leaderboard data available.</div>
              )}
              {topFive.map((entry: any, idx: number) => {
                const name = entry.campus_mantris?.name || 'Unknown';
                const college = entry.campus_mantris?.college_name || '';
                const pts = entry.calculated_points ?? entry.total_points ?? entry.tasks_completed ?? 0;
                const rankPos = entry.rank_position ?? (idx + 1);
                const isYou = entry.mantri_id === (campusMantri?.id);
                return (
                  <div key={entry.mantri_id} className={`flex items-center justify-between p-3 rounded-lg ${isYou ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-semibold text-emerald-700">#{rankPos}</div>
                      <div>
                        <div className={`font-medium ${isYou ? 'text-emerald-700' : 'text-gray-900'}`}>{name}</div>
                        {college && <div className="text-xs text-gray-500">{college}</div>}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-800">{pts} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TaskSubmitter;
