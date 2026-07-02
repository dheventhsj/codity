'use client';

import { useEffect, useState } from 'react';
import { apiClient, getToken } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { queues: number; workers: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchProjects = async () => {
    try {
      const token = getToken();
      const res = await apiClient<Project[]>('/projects', { token: token || '' });
      if (res.data) setProjects(res.data as unknown as Project[]);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      await apiClient('/projects', {
        method: 'POST',
        body: { name, description },
        token: token || '',
      });
      setName('');
      setDescription('');
      setShowForm(false);
      fetchProjects();
    } catch {
      // Handle error
    }
  };

  const selectProject = (projectId: string) => {
    localStorage.setItem('codity_project_id', projectId);
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
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your job scheduling projects</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => selectProject(project.id)}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            )}
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>{project._count?.queues || 0} queues</span>
              <span>{project._count?.workers || 0} workers</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No projects yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
