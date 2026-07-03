import { JobStatus, JobType, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class JobRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        queue: { include: { project: true } },
        executions: { orderBy: { attempt: 'desc' }, take: 20 },
        logs: { orderBy: { timestamp: 'desc' }, take: 100 },
        dlqEntry: true,
      },
    });
  }

  async findMany(params: {
    where: Prisma.JobWhereInput;
    skip: number;
    take: number;
    search?: string;
  }) {
    const where: Prisma.JobWhereInput = {
      ...params.where,
      ...(params.search
        ? { name: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: { queue: { select: { id: true, name: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.JobCreateInput) {
    return this.prisma.job.create({ data });
  }

  async update(id: string, data: Prisma.JobUpdateInput) {
    return this.prisma.job.update({ where: { id }, data });
  }

  async countByStatus(projectId: string) {
    return this.prisma.job.groupBy({
      by: ['status'],
      where: { queue: { projectId } },
      _count: { status: true },
    });
  }

  async throughputSeries(projectId: string, from: Date, intervalMinutes: number) {
    const executions = await this.prisma.jobExecution.findMany({
      where: {
        status: 'COMPLETED',
        startedAt: { gte: from },
        job: { queue: { projectId } },
      },
      select: { startedAt: true, duration: true },
      orderBy: { startedAt: 'asc' },
    });

    const buckets = new Map<string, { count: number; totalDuration: number }>();
    for (const exec of executions) {
      const bucketMs = intervalMinutes * 60 * 1000;
      const bucketTime = new Date(
        Math.floor(exec.startedAt.getTime() / bucketMs) * bucketMs
      );
      const key = bucketTime.toISOString();
      const existing = buckets.get(key) ?? { count: 0, totalDuration: 0 };
      existing.count += 1;
      existing.totalDuration += exec.duration ?? 0;
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries()).map(([timestamp, stats]) => ({
      timestamp,
      count: stats.count,
      avgDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
    }));
  }

  async failureRate(projectId: string, from: Date) {
    const [completed, failed] = await Promise.all([
      this.prisma.job.count({
        where: { queue: { projectId }, status: 'COMPLETED', completedAt: { gte: from } },
      }),
      this.prisma.job.count({
        where: {
          queue: { projectId },
          status: { in: ['FAILED', 'DEAD', 'RETRYING'] },
          updatedAt: { gte: from },
        },
      }),
    ]);
    const total = completed + failed;
    return { completed, failed, rate: total > 0 ? failed / total : 0 };
  }

  async searchGlobal(organizationId: string, query: string, limit: number) {
    const [jobs, queues, projects] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
          queue: { project: { organizationId } },
        },
        take: limit,
        select: { id: true, name: true, status: true, queueId: true },
      }),
      this.prisma.queue.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
          project: { organizationId },
        },
        take: limit,
        select: { id: true, name: true, status: true, projectId: true },
      }),
      this.prisma.project.findMany({
        where: {
          organizationId,
          name: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true },
      }),
    ]);

    return { jobs, queues, projects };
  }
}
