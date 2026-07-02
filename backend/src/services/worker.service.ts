import { PrismaClient, WorkerStatus } from '@prisma/client';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';

export interface WorkerResponse {
  id: string;
  projectId: string;
  name: string;
  status: WorkerStatus;
  hostname: string | null;
  pid: number | null;
  concurrency: number;
  currentLoad: number;
  totalProcessed: number;
  totalFailed: number;
  lastHeartbeat: Date | null;
  startedAt: Date;
  stoppedAt: Date | null;
}

export class WorkerService {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(
    userId: string,
    projectId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<WorkerResponse>> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return buildPaginatedResponse([], 0, pagination);
    }

    const [workers, total] = await Promise.all([
      this.prisma.worker.findMany({
        where: { projectId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.worker.count({ where: { projectId } }),
    ]);

    return buildPaginatedResponse(workers as WorkerResponse[], total, pagination);
  }

  async getStats(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return { online: 0, busy: 0, idle: 0, stale: 0, offline: 0 };
    }

    const stats = await this.prisma.worker.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { status: true },
    });

    return stats.reduce(
      (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.status }),
      { online: 0, busy: 0, idle: 0, stale: 0, offline: 0 }
    );
  }
}
