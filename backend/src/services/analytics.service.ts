import { PrismaClient } from '@prisma/client';
import { JobRepository } from '../repositories/job.repository';

import { ProjectService } from './project.service';

export class AnalyticsService {
  private readonly jobRepo: JobRepository;
  private readonly projectService: ProjectService;

  constructor(private readonly prisma: PrismaClient) {
    this.jobRepo = new JobRepository(prisma);
    this.projectService = new ProjectService(prisma);
  }

  async getDashboardAnalytics(userId: string, projectId: string) {
    await this.projectService.assertProjectAccess(userId, projectId);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      statusCounts,
      throughput,
      failureStats,
      workerStats,
      queueStats,
      recentJobs,
      avgDuration,
      retryTrend,
    ] = await Promise.all([
      this.jobRepo.countByStatus(projectId),
      this.jobRepo.throughputSeries(projectId, last24h, 15),
      this.jobRepo.failureRate(projectId, last24h),
      this.prisma.worker.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      this.prisma.queue.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { jobs: true } },
        },
      }),
      this.prisma.job.findMany({
        where: { queue: { projectId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
          createdAt: true,
          durationMs: true,
        },
      }),
      this.prisma.jobExecution.aggregate({
        where: {
          status: 'COMPLETED',
          startedAt: { gte: last24h },
          job: { queue: { projectId } },
        },
        _avg: { duration: true },
      }),
      this.prisma.job.groupBy({
        by: ['status'],
        where: {
          queue: { projectId },
          status: { in: ['RETRYING', 'FAILED', 'DEAD'] },
          updatedAt: { gte: last24h },
        },
        _count: { status: true },
      }),
    ]);

    const jobsByStatus = statusCounts.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      {} as Record<string, number>
    );

    const workersByStatus = workerStats.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      {} as Record<string, number>
    );

    const completedLastHour = await this.prisma.job.count({
      where: {
        queue: { projectId },
        status: 'COMPLETED',
        completedAt: { gte: lastHour },
      },
    });

    const completedLast24h = await this.prisma.job.count({
      where: {
        queue: { projectId },
        status: 'COMPLETED',
        completedAt: { gte: last24h },
      },
    });

    return {
      summary: {
        totalJobs: Object.values(jobsByStatus).reduce((a, b) => a + b, 0),
        queued: jobsByStatus.queued ?? 0,
        running: (jobsByStatus.running ?? 0) + (jobsByStatus.claimed ?? 0),
        completed: jobsByStatus.completed ?? 0,
        failed: (jobsByStatus.failed ?? 0) + (jobsByStatus.retrying ?? 0),
        dead: jobsByStatus.dead ?? 0,
        successRate: 1 - failureStats.rate,
        failureRate: failureStats.rate,
        avgDurationMs: Math.round(avgDuration._avg.duration ?? 0),
      },
      throughput: {
        series: throughput,
        lastHour: completedLastHour,
        last24h: completedLast24h,
        jobsPerMinute: completedLastHour / 60,
      },
      workers: workersByStatus,
      queues: queueStats.map((q) => ({
        id: q.id,
        name: q.name,
        status: q.status,
        jobCount: q._count.jobs,
        health: q.status === 'ACTIVE' ? 'healthy' : q.status === 'PAUSED' ? 'paused' : 'draining',
      })),
      retryTrend,
      recentJobs,
    };
  }

  async getQueueLatency(userId: string, projectId: string, queueId?: string) {
    await this.projectService.assertProjectAccess(userId, projectId);
    const executions = await this.prisma.jobExecution.findMany({
      where: {
        status: 'COMPLETED',
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        job: {
          queue: {
            projectId,
            ...(queueId && { id: queueId }),
          },
        },
      },
      select: { duration: true, startedAt: true },
      orderBy: { startedAt: 'asc' },
      take: 500,
    });

    const durations = executions.map((e) => e.duration ?? 0).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0;

    return {
      p50,
      p95,
      p99,
      avg: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      sampleSize: durations.length,
    };
  }
}
