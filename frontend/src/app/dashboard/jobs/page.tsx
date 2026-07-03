'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatRelativeTime } from '@/lib/utils';

interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export default function JobsPage() {
  const { token, project } = useAppStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchJobs = async () => {
    if (!token || !project) { setLoading(false); return; }
    let url = `/jobs?projectId=${project.id}&limit=50`;
    if (filter) url += `&status=${filter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await apiClient<Job[]>(url, { token });
    const list = (res as { data: Job[] }).data ?? [];
    setJobs(Array.isArray(list) ? list : []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [token, project, filter, search]);

  const retry = async (id: string) => {
    await apiClient(`/jobs/${id}/retry`, { method: 'POST', token });
    fetchJobs();
  };

  return (
    <>
      <Header title="Jobs" description="Monitor, filter, and manage scheduled jobs" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {['', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? 'default' : 'secondary'}
              onClick={() => setFilter(s)}
            >
              {s || 'All'}
            </Button>
          ))}
        </div>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs text-[#A1A1AA]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3 font-medium">{job.name}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{job.type}</td>
                    <td className="px-4 py-3"><Badge status={job.status} /></td>
                    <td className="px-4 py-3">{job.attempts}/{job.maxAttempts}</td>
                    <td className="px-4 py-3 text-[#A1A1AA]">{formatRelativeTime(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      {['FAILED', 'DEAD'].includes(job.status) && (
                        <Button size="sm" variant="ghost" onClick={() => retry(job.id)}>Retry</Button>
                      )}
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
