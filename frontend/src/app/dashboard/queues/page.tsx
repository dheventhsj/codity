'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';

interface Queue {
  id: string;
  name: string;
  status: string;
  priority: number;
  concurrency: number;
  _count?: { jobs: number };
}

export default function QueuesPage() {
  const { token, project } = useAppStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const fetchQueues = async () => {
    if (!token || !project) { setLoading(false); return; }
    const res = await apiClient<Queue[]>(`/queues?projectId=${project.id}`, { token });
    const list = (res as { data: Queue[] }).data ?? [];
    setQueues(Array.isArray(list) ? list : []);
    setLoading(false);
  };

  useEffect(() => { fetchQueues(); }, [token, project]);

  const createQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient('/queues', {
      method: 'POST',
      body: { name, projectId: project!.id },
      token,
    });
    setName('');
    fetchQueues();
  };

  const toggle = async (id: string, status: string) => {
    await apiClient(`/queues/${id}/${status === 'ACTIVE' ? 'pause' : 'resume'}`, {
      method: 'PATCH',
      token,
    });
    fetchQueues();
  };

  return (
    <>
      <Header title="Queues" description="Configure job channels, priority, and concurrency" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <form onSubmit={createQueue} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Queue name" required />
          <Button type="submit">Create Queue</Button>
        </form>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#262626] text-left text-xs text-[#A1A1AA]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Concurrency</th>
                  <th className="px-4 py-3">Jobs</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {queues.map((q) => (
                  <tr key={q.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3 font-medium">{q.name}</td>
                    <td className="px-4 py-3"><Badge status={q.status} /></td>
                    <td className="px-4 py-3">{q.priority}</td>
                    <td className="px-4 py-3">{q.concurrency}</td>
                    <td className="px-4 py-3">{q._count?.jobs ?? 0}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => toggle(q.id, q.status)}>
                        {q.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </Button>
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
