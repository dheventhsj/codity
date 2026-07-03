'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient, getApiBase } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';

export default function HealthPage() {
  const { token, project } = useAppStore();
  const [health, setHealth] = useState<{
    uptime?: number;
    components?: { api?: { status: string }; database?: { status: string; latencyMs?: number } };
    project?: {
      workers?: { online: number };
      backlog?: number;
      dlq?: { pending: number };
    };
  } | null>(null);

  useEffect(() => {
    const url = project
      ? `${getApiBase()}/api/v1/health?projectId=${project.id}`
      : `${getApiBase()}/health`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setHealth(d.data));
  }, [token, project]);

  return (
    <>
      <Header title="System Health" description="Database, queue, and worker health monitoring" />
      <main className="flex-1 overflow-y-auto p-6">
        {!health ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>API Server</CardTitle></CardHeader>
              <CardContent>
                <Badge status={health.components?.api?.status ?? 'healthy'} />
                <p className="mt-2 text-xs text-[#A1A1AA]">Uptime: {Math.floor(health.uptime ?? 0)}s</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Database</CardTitle></CardHeader>
              <CardContent>
                <Badge status={health.components?.database?.status ?? 'healthy'} />
                <p className="mt-2 text-xs text-[#A1A1AA]">
                  Latency: {health.components?.database?.latencyMs ?? 0}ms
                </p>
              </CardContent>
            </Card>
            {health.project && (
              <>
                <Card>
                  <CardHeader><CardTitle>Workers</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {health.project.workers?.online ?? 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">online</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Queue Backlog</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {health.project.backlog ?? 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">pending jobs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Dead Letter Queue</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-[#EF4444]">
                      {health.project.dlq?.pending ?? 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">unresolved</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
