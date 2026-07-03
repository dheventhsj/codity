'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatRelativeTime } from '@/lib/utils';

interface DlqEntry {
  id: string;
  reason: string;
  attempts: number;
  lastError: string | null;
  failedAt: string;
  job: { id: string; name: string };
}

export default function DlqPage() {
  const { token, project } = useAppStore();
  const [entries, setEntries] = useState<DlqEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDlq = async () => {
    if (!token || !project) return;
    const res = await apiClient<DlqEntry[]>(`/dlq?projectId=${project.id}`, { token });
    setEntries((res as { data: DlqEntry[] }).data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDlq(); }, [token, project]);

  const retry = async (jobId: string) => {
    await apiClient(`/jobs/${jobId}/retry`, { method: 'POST', token });
    fetchDlq();
  };

  return (
    <>
      <Header title="Dead Letter Queue" description="Permanently failed jobs requiring investigation" />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : entries.length === 0 ? (
          <div className="card-surface py-16 text-center text-sm text-[#A1A1AA]">
            No jobs in the dead letter queue.
          </div>
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs text-[#A1A1AA]">
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3 font-medium">{e.job.name}</td>
                    <td className="px-4 py-3 text-[#A1A1AA] max-w-xs truncate">{e.lastError ?? e.reason}</td>
                    <td className="px-4 py-3">{e.attempts}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{formatRelativeTime(e.failedAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => retry(e.job.id)}>Retry</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
