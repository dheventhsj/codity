'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatRelativeTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function AuditLogsPage() {
  const { token } = useAppStore();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiClient<AuditEntry[]>('/audit-logs?limit=50', { token })
      .then((res) => setLogs((res as { data: AuditEntry[] }).data ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <Header title="Audit Logs" description="Track user actions, queue changes, and system events" />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs text-[#A1A1AA]">
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3"><Badge status={log.action} /></td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{log.resource}</td>
                    <td className="px-4 py-3">{log.user?.name ?? 'System'}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{formatRelativeTime(log.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[#A1A1AA]">
                      No audit logs yet.
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
