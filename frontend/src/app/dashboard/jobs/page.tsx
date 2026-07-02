'use client';

import { useEffect, useState } from 'react';
import { apiClient, getToken } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  error: string | null;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [jobName, setJobName] = useState('');
  const [queueId, setQueueId] = useState('');
  const [payload, setPayload] = useState('{}');

  const fetchJobs = async () => {
    try {
      const token = getToken();
      let url = '/jobs?limit=50';
      if (filter) url += `&status=${filter}`;

      const res = await apiClient<Job[]>(url, { token: token || '' });
      if (res.data) setJobs(res.data as unknown as Job[]);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      await apiClient('/jobs', {
        method: 'POST',
        body: { queueId, name: jobName, payload: JSON.parse(payload) },
        token: token || '',
      });
      setJobName('');
      setPayload('{}');
      setShowForm(false);
      fetchJobs();
    } catch {
      // Handle error
    }
  };

  const retryJob = async (jobId: string) => {
    const token = getToken();
    await apiClient(`/jobs/${jobId}/retry`, { method: 'POST', token: token || '' });
    fetchJobs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Monitor and manage scheduled jobs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          New Job
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
              <input type="text" value={jobName} onChange={(e) => setJobName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queue ID</label>
              <input type="text" value={queueId} onChange={(e) => setQueueId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payload (JSON)</label>
              <input type="text" value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        {['', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Attempts</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{job.type}</td>
                <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-600">{job.priority}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{job.attempts}/{job.maxAttempts}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(job.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  {['FAILED', 'DEAD'].includes(job.status) && (
                    <button
                      onClick={() => retryJob(job.id)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
