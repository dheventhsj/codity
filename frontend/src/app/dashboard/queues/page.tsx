'use client';

import { useEffect, useState } from 'react';
import { apiClient, getToken } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

interface Queue {
  id: string;
  name: string;
  status: string;
  priority: number;
  concurrency: number;
  description: string | null;
  _count?: { jobs: number };
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(0);
  const [concurrency, setConcurrency] = useState(5);

  const fetchQueues = async () => {
    try {
      const token = getToken();
      const projectId = localStorage.getItem('codity_project_id');
      if (!projectId) { setLoading(false); return; }

      const res = await apiClient<Queue[]>(`/queues?projectId=${projectId}`, { token: token || '' });
      if (res.data) setQueues(res.data as unknown as Queue[]);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueues(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const projectId = localStorage.getItem('codity_project_id');
      await apiClient('/queues', {
        method: 'POST',
        body: { name, projectId, priority, concurrency },
        token: token || '',
      });
      setName('');
      setPriority(0);
      setConcurrency(5);
      setShowForm(false);
      fetchQueues();
    } catch {
      // Handle error
    }
  };

  const togglePause = async (queueId: string, currentStatus: string) => {
    const token = getToken();
    const action = currentStatus === 'ACTIVE' ? 'pause' : 'resume';
    await apiClient(`/queues/${queueId}/${action}`, { method: 'POST', token: token || '' });
    fetchQueues();
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
          <h1 className="text-2xl font-bold text-gray-900">Queues</h1>
          <p className="text-gray-500 mt-1">Manage job queues and their configurations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          New Queue
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input type="number" value={priority} onChange={(e) => setPriority(+e.target.value)} min={0} max={100} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concurrency</label>
              <input type="number" value={concurrency} onChange={(e) => setConcurrency(+e.target.value)} min={1} max={100} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Concurrency</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Jobs</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {queues.map((queue) => (
              <tr key={queue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{queue.name}</td>
                <td className="px-6 py-4"><StatusBadge status={queue.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-600">{queue.priority}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{queue.concurrency}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{queue._count?.jobs || 0}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => togglePause(queue.id, queue.status)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {queue.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                </td>
              </tr>
            ))}
            {queues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No queues found. Select a project and create a queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
