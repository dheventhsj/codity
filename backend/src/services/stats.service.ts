import { PrismaClient } from '@prisma/client';

export interface DashboardStats {
  jobs: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    dead: number;
  };
  workers: {
    total: number;
    online: number;
    busy: number;
  };
  queues: {
    total: number;
    active: number;
    paused: number;
  };
  throughput: {
    last24h: number;
    lastHour: number;
  };
}

export class StatsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardStats(userId: string, projectId: string): Promise<DashboardStats> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      jobStats,
      workerStats,
      queueStats,
      completedLast24h,
      completedLastHour,
    ] = await Promise.all([
      this.prisma.job.groupBy({
        by: ['status'],
        where: { queue: { project: { id: projectId, userId } } },
        _count: { status: true },
      }),
      this.prisma.worker.groupBy({
        by: ['status'],
        where: { project: { id: projectId, userId } },
        _count: { status: true },
      }),
      this.prisma.queue.groupBy({
        by: ['status'],
        where: { project: { id: projectId, userId } },
        _count: { status: true },
      }),
      this.prisma.job.count({
        where: {
          queue: { project: { id: projectId, userId } },
          status: 'COMPLETED',
          completedAt: { gte: last24h },
        },
      }),
      this.prisma.job.count({
        where: {
          queue: { project: { id: projectId, userId } },
          status: 'COMPLETED',
          completedAt: { gte: lastHour },
        },
      }),
    ]);

    const jobCounts = jobStats.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      { queued: 0, scheduled: 0, claimed: 0, running: 0, completed: 0, failed: 0, retrying: 0, dead: 0 }
    );

    const workerCounts = workerStats.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      { online: 0, busy: 0, idle: 0, stale: 0, offline: 0 }
    );

    const queueCounts = queueStats.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      { active: 0, paused: 0, draining: 0 }
    );

    return {
      jobs: {
        total: Object.values(jobCounts).reduce((a, b) => a + b, 0),
        queued: jobCounts.queued,
        running: jobCounts.running + jobCounts.claimed,
        completed: jobCounts.completed,
        failed: jobCounts.failed + jobCounts.retrying,
        dead: jobCounts.dead,
      },
      workers: {
        total: Object.values(workerCounts).reduce((a, b) => a + b, 0),
        online: workerCounts.online + workerCounts.idle,
        busy: workerCounts.busy,
      },
      queues: {
        total: Object.values(queueCounts).reduce((a, b) => a + b, 0),
        active: queueCounts.active,
        paused: queueCounts.paused,
      },
      throughput: {
        last24h: completedLast24h,
        lastHour: completedLastHour,
      },
    };
  }
}
