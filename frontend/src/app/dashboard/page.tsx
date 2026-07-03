'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock, ListTodo, Skull, Zap } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ThroughputChart } from '@/components/charts/throughput-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { formatRelativeTime } from '@/lib/utils';
import { subscribeToProject } from '@/lib/socket';

interface Analytics {
  summary: {
    totalJobs: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    dead: number;
    successRate: number;
    avgDurationMs: number;
  };
  throughput: {
    series: Array<{ timestamp: string; count: number }>;
    jobsPerMinute: number;
  };
  recentJobs: Array<{ id: string; name: string; status: string; createdAt: string }>;
  queues: Array<{ id: string; name: string; status: string; health: string; jobCount: number }>;
}

export default function DashboardPage() {
  const { token, project } = useAppStore();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token || !project) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient<Analytics>(`/analytics?projectId=${project.id}`, { token });
      if (res.data) setData(res.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, project]);

  useEffect(() => {
    if (!token || !project) return;
    return subscribeToProject(token, project.id, {
      onMetricsUpdate: () => fetchData(),
      onJobUpdate: () => fetchData(),
    });
  }, [token, project]);

  return (
    <>
      <Header title="Dashboard" description="Real-time overview of your job scheduling platform" />
      <main className="flex-1 overflow-y-auto p-6">
        {!project ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[#A1A1AA]">
              Select a project from the Projects page to view metrics.
            </CardContent>
          </Card>
        ) : loading ? (
          <TableSkeleton rows={4} />
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Total Jobs" value={data.summary.totalJobs} icon={ListTodo} />
              <KpiCard title="Running" value={data.summary.running} icon={Activity} variant="warning" />
              <KpiCard title="Completed" value={data.summary.completed} icon={CheckCircle2} variant="success" />
              <KpiCard title="Dead Letter" value={data.summary.dead} icon={Skull} variant="danger" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Throughput (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ThroughputChart data={data.throughput.series} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.queues.map((q) => (
                    <div key={q.id} className="flex items-center justify-between rounded-md border border-[#262626] p-3">
                      <div>
                        <p className="text-sm font-medium">{q.name}</p>
                        <p className="text-xs text-[#A1A1AA]">{q.jobCount} jobs</p>
                      </div>
                      <Badge status={q.health} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#262626]">
                  {data.recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-[#52525B]" />
                        <div>
                          <p className="text-sm font-medium">{job.name}</p>
                          <p className="text-xs text-[#A1A1AA]">{formatRelativeTime(job.createdAt)}</p>
                        </div>
                      </div>
                      <Badge status={job.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </>
  );
}
