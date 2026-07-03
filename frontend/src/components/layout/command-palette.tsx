'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, LayoutDashboard, ListTodo, Layers } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, token, organization } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    jobs: Array<{ id: string; name: string; status: string }>;
    queues: Array<{ id: string; name: string }>;
    projects: Array<{ id: string; name: string }>;
  }>({ jobs: [], queues: [], projects: [] });

  useEffect(() => {
    if (!query || query.length < 2 || !token || !organization) return;
    const t = setTimeout(async () => {
      try {
        const res = await apiClient<typeof results>(
          `/search?q=${encodeURIComponent(query)}&organizationId=${organization.id}`,
          { token }
        );
        if (res.data) setResults(res.data);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, token, organization]);

  const pages = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', href: '/dashboard/jobs', icon: ListTodo },
    { label: 'Queues', href: '/dashboard/queues', icon: Layers },
  ];

  const navigate = (href: string) => {
    setCommandPaletteOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <Dialog.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border border-[#262626] bg-[#171717] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[#262626] px-4">
            <Search className="h-4 w-4 text-[#A1A1AA]" />
            <Input
              className="border-0 bg-transparent focus-visible:ring-0"
              placeholder="Search jobs, queues, projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {!query && (
              <div className="space-y-1">
                <p className="px-2 py-1 text-[10px] font-medium uppercase text-[#52525B]">Pages</p>
                {pages.map((p) => (
                  <button
                    key={p.href}
                    onClick={() => navigate(p.href)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[#262626]"
                  >
                    <p.icon className="h-4 w-4 text-[#A1A1AA]" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            {query && (
              <>
                {results.jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => navigate('/dashboard/jobs')}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-[#262626]"
                  >
                    <span>{j.name}</span>
                    <span className="text-xs text-[#A1A1AA]">{j.status}</span>
                  </button>
                ))}
                {results.queues.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => navigate('/dashboard/queues')}
                    className="flex w-full rounded-md px-2 py-2 text-sm hover:bg-[#262626]"
                  >
                    Queue: {q.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
