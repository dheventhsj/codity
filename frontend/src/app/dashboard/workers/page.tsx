'use client';

import { useEffect, useState } from 'react';
import { apiClient, getToken } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

interface Worker {
  id: string;
  name: string;
  status: string;
  hostname: string | null;
  pid: number | null;
  concurrency: number;
  currentLoad: number;
  totalProcessed: number;
  totalFailed: number;
  lastHeartbeat: string | null;
  startedAt: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const token = getToken();
        const projectId = localStorage.getItem('codity_project_id');
        if (!projectId) { setLoading(false); return; }

        const res = await apiClient<Worker[]>(`/workers?projectId=${projectId}`, { token: token || '' });
        if (res.data) setWorkers(res.data as unknown as Worker[]);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchWorkers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        <p className="text-gray-500 mt-1">Monitor registered worker instances</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Host</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Load</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Processed</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Failed</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{worker.name}</td>
                <td className="px-6 py-4"><StatusBadge status={worker.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {worker.hostname || '-'}
                  {worker.pid && <span className="text-gray-400 ml-1">:{worker.pid}</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{worker.currentLoad}/{worker.concurrency}</td>
                <td className="px-6 py-4 text-sm text-green-600 font-medium">{worker.totalProcessed}</td>
                <td className="px-6 py-4 text-sm text-red-600 font-medium">{worker.totalFailed}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {worker.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleTimeString() : 'Never'}
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No workers registered. Start a worker service to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
