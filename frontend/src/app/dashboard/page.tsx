'use client';

import { useEffect, useState } from 'react';
import { apiClient, getToken } from '@/lib/api';
import StatCard from '@/components/StatCard';

interface DashboardStats {
  jobs: { total: number; queued: number; running: number; completed: number; failed: number; dead: number };
  workers: { total: number; online: number; busy: number };
  queues: { total: number; active: number; paused: number };
  throughput: { last24h: number; lastHour: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = getToken();
        const projectId = localStorage.getItem('codity_project_id');
        if (!projectId) {
          setLoading(false);
          return;
        }

        const res = await apiClient<DashboardStats>(`/stats?projectId=${projectId}`, { token: token || '' });
        if (res.data) setStats(res.data);
      } catch {
        // Stats may not be available yet
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Create a project first to see statistics. Go to the Projects page to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">System overview and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Jobs" value={stats.jobs.total} color="blue" />
        <StatCard title="Running" value={stats.jobs.running} color="yellow" />
        <StatCard title="Completed" value={stats.jobs.completed} color="green" />
        <StatCard title="Failed" value={stats.jobs.failed + stats.jobs.dead} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Workers Online" value={stats.workers.online} subtitle={`${stats.workers.busy} busy`} color="green" />
        <StatCard title="Active Queues" value={stats.queues.active} subtitle={`${stats.queues.paused} paused`} color="purple" />
        <StatCard title="Throughput (24h)" value={stats.throughput.last24h} subtitle={`${stats.throughput.lastHour} last hour`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Status Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats.jobs).filter(([k]) => k !== 'total').map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{key}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${stats.jobs.total > 0 ? (value / stats.jobs.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Workers Online</span>
              <span className="text-lg font-bold text-green-700">{stats.workers.online}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Queues Active</span>
              <span className="text-lg font-bold text-blue-700">{stats.queues.active}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-700">Jobs Processing</span>
              <span className="text-lg font-bold text-yellow-700">{stats.jobs.running}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">Dead Letter Queue</span>
              <span className="text-lg font-bold text-red-700">{stats.jobs.dead}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
