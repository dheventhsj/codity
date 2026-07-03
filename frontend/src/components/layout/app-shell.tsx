'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { CommandPalette } from './command-palette';
import { useAppStore } from '@/stores/app-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0B0B]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#262626] border-t-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0B0B]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <CommandPalette />
    </div>
  );
}
