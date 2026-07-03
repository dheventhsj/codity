'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThroughputChart } from '@/components/charts/throughput-chart';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatDuration } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { token, project } = useAppStore();
  const [data, setData] = useState<{
    summary: { successRate: number; failureRate: number; avgDurationMs: number };
    throughput: { series: Array<{ timestamp: string; count: number; avgDuration?: number }> };
    retryTrend: Array<{ status: string; _count: { status: number } }>;
  } | null>(null);
  const [latency, setLatency] = useState<{ p50: number; p95: number; p99: number; avg: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !project) { setLoading(false); return; }
    Promise.all([
      apiClient(`/analytics?projectId=${project.id}`, { token }),
      apiClient(`/analytics/latency?projectId=${project.id}`, { token }),
    ]).then(([analytics, lat]) => {
      if (analytics.data) setData(analytics.data as typeof data);
      if (lat.data) setLatency(lat.data as typeof latency);
    }).finally(() => setLoading(false));
  }, [token, project]);

  const retryData = data?.retryTrend?.map((r) => ({
    name: r.status,
    count: r._count.status,
  })) ?? [];

  return (
    <>
      <Header title="Analytics" description="Throughput, latency, and failure trends" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Success Rate', value: `${((data?.summary.successRate ?? 0) * 100).toFixed(1)}%` },
                { label: 'Failure Rate', value: `${((data?.summary.failureRate ?? 0) * 100).toFixed(1)}%` },
                { label: 'Avg Duration', value: formatDuration(data?.summary.avgDurationMs ?? 0) },
                { label: 'P95 Latency', value: formatDuration(latency?.p95 ?? 0) },
              ].map((m) => (
                <Card key={m.label}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">{m.label}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Jobs Per Interval</CardTitle></CardHeader>
              <CardContent>
                <ThroughputChart data={data?.throughput.series ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Retry & Failure Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={retryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
