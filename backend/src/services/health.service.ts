import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class HealthService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSystemHealth(projectId?: string) {
    const start = Date.now();
    let dbStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      if (dbLatencyMs > 500) dbStatus = 'degraded';
    } catch {
      dbStatus = 'down';
    }

    const baseHealth = {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTimeMs: Date.now() - start,
      components: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        api: { status: 'healthy' as const },
      },
    };

    if (!projectId) return baseHealth;

    const [queueStats, workerStats, dlqCount, pendingJobs] = await Promise.all([
      this.prisma.queue.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      this.prisma.worker.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      this.prisma.deadLetterQueue.count({
        where: { job: { queue: { projectId } }, resolvedAt: null },
      }),
      this.prisma.job.count({
        where: { queue: { projectId }, status: { in: ['QUEUED', 'RETRYING'] } },
      }),
    ]);

    const activeQueues = queueStats.find((q) => q.status === 'ACTIVE')?._count.status ?? 0;
    const onlineWorkers =
      (workerStats.find((w) => w.status === 'ONLINE')?._count.status ?? 0) +
      (workerStats.find((w) => w.status === 'IDLE')?._count.status ?? 0) +
      (workerStats.find((w) => w.status === 'BUSY')?._count.status ?? 0);

    return {
      ...baseHealth,
      project: {
        queues: { active: activeQueues, total: queueStats.reduce((a, q) => a + q._count.status, 0) },
        workers: { online: onlineWorkers, stale: workerStats.find((w) => w.status === 'STALE')?._count.status ?? 0 },
        dlq: { pending: dlqCount },
        backlog: pendingJobs,
      },
    };
  }
}
