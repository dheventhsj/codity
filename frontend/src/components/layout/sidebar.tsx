'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  ListTodo,
  Cpu,
  BarChart3,
  HeartPulse,
  Skull,
  ScrollText,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/queues', label: 'Queues', icon: Layers },
  { href: '/dashboard/jobs', label: 'Jobs', icon: ListTodo },
  { href: '/dashboard/workers', label: 'Workers', icon: Cpu },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/health', label: 'System Health', icon: HeartPulse },
  { href: '/dashboard/dlq', label: 'Dead Letter Queue', icon: Skull },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[#262626] bg-[#0B0B0B]">
      <div className="flex h-14 items-center gap-2 border-b border-[#262626] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">Codity</p>
          <p className="text-[10px] text-[#A1A1AA]">Job Scheduler</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-[#171717] text-white'
                  : 'text-[#A1A1AA] hover:bg-[#121212] hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#262626] p-3">
        <p className="text-[10px] text-[#52525B]">v2.0 · Distributed Scheduler</p>
      </div>
    </aside>
  );
}
