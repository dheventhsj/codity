'use client';

import { useEffect } from 'react';
import { Bell, Command, LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { disconnectSocket } from '@/lib/socket';

interface HeaderProps {
  title: string;
  description?: string;
  onSearchClick?: () => void;
}

export function Header({ title, description, onSearchClick }: HeaderProps) {
  const router = useRouter();
  const { user, project, notifications, logout, setCommandPaletteOpen } = useAppStore();
  const unread = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push('/login');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#262626] bg-[#0B0B0B] px-6">
      <div>
        <h1 className="text-sm font-semibold">{title}</h1>
        {description && <p className="text-xs text-[#A1A1AA]">{description}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex gap-2 text-[#A1A1AA]"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="ml-2 rounded border border-[#262626] px-1.5 text-[10px]">⌘K</kbd>
        </Button>

        {project && (
          <span className="hidden rounded-md border border-[#262626] px-2 py-1 text-xs text-[#A1A1AA] lg:inline">
            {project.name}
          </span>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3B82F6] text-[10px]">
              {unread}
            </span>
          )}
        </Button>

        <div className="hidden items-center gap-2 pl-2 md:flex">
          <div className="h-7 w-7 rounded-full bg-[#262626] flex items-center justify-center text-xs font-medium">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-xs text-[#A1A1AA]">{user?.email}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
