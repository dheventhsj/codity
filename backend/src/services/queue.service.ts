import { PrismaClient, QueueStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { ProjectService } from './project.service';

export interface CreateQueueInput {
  name: string;
  projectId: string;
  priority?: number;
  concurrency?: number;
  retryPolicyId?: string;
  description?: string;
}

export interface QueueResponse {
  id: string;
  name: string;
  projectId: string;
  priority: number;
  concurrency: number;
  status: QueueStatus;
  description: string | null;
  retryPolicyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { jobs: number };
}

export class QueueService {
  private readonly projectService: ProjectService;

  constructor(private readonly prisma: PrismaClient) {
    this.projectService = new ProjectService(prisma);
  }

  async create(userId: string, input: CreateQueueInput): Promise<QueueResponse> {
    await this.projectService.assertProjectAccess(userId, input.projectId);

    if (input.retryPolicyId) {
      const policy = await this.prisma.retryPolicy.findUnique({
        where: { id: input.retryPolicyId },
      });
      if (!policy) {
        throw new ValidationError('Invalid retry policy ID');
      }
    }

    return this.prisma.queue.create({
      data: {
        name: input.name,
        projectId: input.projectId,
        priority: input.priority ?? 0,
        concurrency: input.concurrency ?? 5,
        retryPolicyId: input.retryPolicyId,
        description: input.description,
      },
      include: { _count: { select: { jobs: true } } },
    });
  }

  async findAll(
    userId: string,
    projectId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<QueueResponse>> {
    await this.projectService.assertProjectAccess(userId, projectId);

    const [queues, total] = await Promise.all([
      this.prisma.queue.findMany({
        where: { projectId },
        include: { _count: { select: { jobs: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.queue.count({ where: { projectId } }),
    ]);

    return buildPaginatedResponse(queues, total, pagination);
  }

  async findById(userId: string, queueId: string): Promise<QueueResponse> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        _count: { select: { jobs: true } },
        project: { select: { organizationId: true } },
      },
    });

    if (!queue) throw new NotFoundError('Queue', queueId);
    await this.projectService.assertProjectAccess(userId, queue.projectId);

    const { project: _, ...queueData } = queue as typeof queue & { project: unknown };
    return queueData as unknown as QueueResponse;
  }

  async pause(userId: string, queueId: string): Promise<QueueResponse> {
    await this.findById(userId, queueId);
    return this.prisma.queue.update({
      where: { id: queueId },
      data: { status: 'PAUSED' },
      include: { _count: { select: { jobs: true } } },
    });
  }

  async resume(userId: string, queueId: string): Promise<QueueResponse> {
    await this.findById(userId, queueId);
    return this.prisma.queue.update({
      where: { id: queueId },
      data: { status: 'ACTIVE' },
      include: { _count: { select: { jobs: true } } },
    });
  }

  async getStats(userId: string, queueId: string) {
    await this.findById(userId, queueId);

    const stats = await this.prisma.job.groupBy({
      by: ['status'],
      where: { queueId },
      _count: { status: true },
    });

    const statusCounts = stats.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count.status }),
      {} as Record<string, number>
    );

    return {
      queueId,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      ...statusCounts,
    };
  }
}
