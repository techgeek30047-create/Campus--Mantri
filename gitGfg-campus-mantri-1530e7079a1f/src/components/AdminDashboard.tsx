import { Archive, Bell, CheckCircle, Clock, Download, FileText, Link, LogOut, Plus, RefreshCw, Search, Target, Trash2, TrendingUp, Trophy, Upload, Users, Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminTask, CampusMantri, LeaderboardEntry, supabase, Task, TaskSubmission, isSupabaseAvailable } from '../lib/supabase';
import { Admin } from '../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
  currentAdmin?: Admin;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentAdmin }) => {

  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 50;

  // 🔥 FETCH SUBMISSIONS
  const fetchSubmissions = async () => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('task_submissions')
      .select(`
        *,
        admin_tasks (id,title,points),
        campus_mantris (name,college_name)
      `)
      .range(from, to)
      .order('submitted_at', { ascending: false });

    setTaskSubmissions(data || []);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page]);

  // ✅ APPROVE
  const handleApproveSubmission = async (id: string) => {
    const submission = taskSubmissions.find(s => s.id === id);
    const points = submission?.admin_tasks?.points || 0;

    await supabase.rpc('approve_submission', {
      submission_id: id,
      points_value: points
    });

    fetchSubmissions();
  };

  // ❌ REJECT
  const handleRejectSubmission = async (id: string) => {
    await supabase.rpc('update_submission_status', {
      submission_id: id,
      new_status: 'rejected'
    });

    fetchSubmissions();
  };

  // 🔁 ROLLBACK
  const handleRollback = async (id: string) => {
    await supabase.rpc('rollback_submission', {
      submission_id: id
    });

    fetchSubmissions();
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6">

      <h2 className="text-2xl font-bold mb-4">
        Submissions ({taskSubmissions.filter(s => s.status === 'submitted').length} Pending)
      </h2>

      {/* FILTERS */}
      <div className="flex gap-4 mb-4">

        <select
          value={selectedTaskFilter}
          onChange={(e) => setSelectedTaskFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Tasks</option>
          {Array.from(
            new Map(
              taskSubmissions.map(s => [s.admin_tasks?.id, s.admin_tasks])
            ).values()
          ).map(task => (
            <option key={task?.id} value={task?.id}>
              {task?.title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All</option>
          <option value="submitted">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

      </div>

      {/* TABLE */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>Name</th>
            <th>Task</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {taskSubmissions
            .filter(s => {
              const t = !selectedTaskFilter || s.admin_tasks?.id === selectedTaskFilter;
              const st = statusFilter === 'all' || s.status === statusFilter;
              return t && st;
            })
            .map(sub => (
              <tr key={sub.id} className="text-center border-t">

                <td>{sub.campus_mantris?.name}</td>
                <td>{sub.admin_tasks?.title}</td>

                <td>
                  <span className={
                    sub.status === 'approved'
                      ? 'text-green-600'
                      : sub.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }>
                    {sub.status}
                  </span>
                </td>

                <td>
                  {sub.status === 'submitted' ? (
                    <div className="flex gap-3 justify-center">

                      <button
                        onClick={() => handleApproveSubmission(sub.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded"
                      >
                        ✔
                      </button>

                      <button
                        onClick={() => handleRejectSubmission(sub.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        ✖
                      </button>

                    </div>
                  ) : (
                    <button
                      onClick={() => handleRollback(sub.id)}
                      className="text-blue-500 text-sm"
                    >
                      Rollback
                    </button>
                  )}
                </td>

              </tr>
            ))}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div className="flex gap-4 mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))}>
          Prev
        </button>

        <span>Page {page}</span>

        <button onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>

    </div>
  );
};

export default AdminDashboard;
