'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';

export default function Home() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    router.push(token ? '/dashboard' : '/login');
  }, [router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#262626] border-t-[#3B82F6]" />
    </div>
  );
}
