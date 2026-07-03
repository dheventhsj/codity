'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/app-store';

export default function SettingsPage() {
  const { user, organization, project } = useAppStore();

  return (
    <>
      <Header title="Settings" description="Account and workspace configuration" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-[#262626] py-2">
              <span className="text-[#A1A1AA]">Name</span>
              <span>{user?.name}</span>
            </div>
            <div className="flex justify-between border-b border-[#262626] py-2">
              <span className="text-[#A1A1AA]">Email</span>
              <span>{user?.email}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-[#262626] py-2">
              <span className="text-[#A1A1AA]">Organization</span>
              <span>{organization?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#A1A1AA]">Active Project</span>
              <span>{project?.name ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Keyboard Shortcuts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-[#A1A1AA]">Command Palette</span>
              <kbd className="rounded border border-[#262626] px-2 py-0.5 text-xs">⌘ K</kbd>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
