'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';

interface Project {
  id: string;
  name: string;
  description: string | null;
  _count?: { queues: number; workers: number };
}

export default function ProjectsPage() {
  const { token, organization, setProject } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const fetchProjects = async () => {
    if (!token || !organization) { setLoading(false); return; }
    const res = await apiClient<Project[]>(
      `/projects?organizationId=${organization.id}`,
      { token }
    );
    const paginated = res as unknown as { data: Project[]; pagination?: unknown };
    setProjects(Array.isArray(paginated.data) ? paginated.data : []);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [token, organization]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient('/projects', {
      method: 'POST',
      body: { name, organizationId: organization!.id },
      token,
    });
    setName('');
    setShowForm(false);
    fetchProjects();
  };

  return (
    <>
      <Header title="Projects" description="Organize queues, jobs, and workers" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>New Project</Button>
        </div>
        {showForm && (
          <Card className="mb-4">
            <CardContent className="pt-5">
              <form onSubmit={handleCreate} className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required />
                <Button type="submit">Create</Button>
              </form>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setProject({ id: p.id, name: p.name })}
                className="card-surface p-5 text-left transition hover:border-[#3B82F6]/50"
              >
                <h3 className="font-semibold">{p.name}</h3>
                {p.description && <p className="mt-1 text-xs text-[#A1A1AA]">{p.description}</p>}
                <div className="mt-4 flex gap-4 text-xs text-[#A1A1AA]">
                  <span>{p._count?.queues ?? 0} queues</span>
                  <span>{p._count?.workers ?? 0} workers</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
