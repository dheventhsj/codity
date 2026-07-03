'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatRelativeTime } from '@/lib/utils';

interface Worker {
  id: string;
  name: string;
  status: string;
  hostname: string | null;
  currentLoad: number;
  concurrency: number;
  totalProcessed: number;
  totalFailed: number;
  lastHeartbeat: string | null;
}

export default function WorkersPage() {
  const { token, project } = useAppStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !project) { setLoading(false); return; }
    apiClient<Worker[]>(`/workers?projectId=${project.id}`, { token })
      .then((res) => setWorkers((res as { data: Worker[] }).data ?? []))
      .finally(() => setLoading(false));
  }, [token, project]);

  return (
    <>
      <Header title="Workers" description="Monitor worker instances, heartbeats, and utilization" />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs text-[#A1A1AA]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Load</th>
                  <th className="px-4 py-3">Processed</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3 font-medium">{w.name}</td>
                    <td className="px-4 py-3"><Badge status={w.status} /></td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{w.hostname ?? '—'}</td>
                    <td className="px-4 py-3">{w.currentLoad}/{w.concurrency}</td>
                    <td className="px-4 py-3 text-[#22C55E]">{w.totalProcessed}</td>
                    <td className="px-4 py-3 text-[#EF4444]">{w.totalFailed}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {w.lastHeartbeat ? formatRelativeTime(w.lastHeartbeat) : 'Never'}
                    </td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#A1A1AA]">
                      No workers registered. Start a worker service to process jobs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
