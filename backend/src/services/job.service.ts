import { PrismaClient, JobStatus, JobType, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { FilterParams } from '../types';
import { logger } from '../utils/logger';

export interface CreateJobInput {
  queueId: string;
  name: string;
  type?: JobType;
  payload?: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  scheduledFor?: string;
  cronExpression?: string;
  batchId?: string;
  idempotencyKey?: string;
}

export interface JobResponse {
  id: string;
  queueId: string;
  name: string;
  type: JobType;
  payload: unknown;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date | null;
  cronExpression: string | null;
  batchId: string | null;
  claimedBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class JobService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateJobInput): Promise<JobResponse> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: input.queueId },
      include: { project: { select: { userId: true } } },
    });

    if (!queue || queue.project.userId !== userId) {
      throw new NotFoundError('Queue', input.queueId);
    }

    if (queue.status === 'DRAINING') {
      throw new ValidationError('Queue is draining and not accepting new jobs');
    }

    if (input.idempotencyKey) {
      const existing = await this.prisma.job.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing as unknown as JobResponse;
      }
    }

    const jobType = input.type || this.inferJobType(input);
    const status = this.getInitialStatus(jobType, input.scheduledFor);

    const job = await this.prisma.job.create({
      data: {
        queueId: input.queueId,
        name: input.name,
        type: jobType,
        payload: (input.payload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        priority: input.priority ?? 0,
        maxAttempts: input.maxAttempts ?? 3,
        status,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        cronExpression: input.cronExpression,
        batchId: input.batchId,
        idempotencyKey: input.idempotencyKey,
      },
    });

    logger.info('Job created', { jobId: job.id, type: jobType, queue: queue.name });

    return job as unknown as JobResponse;
  }

  async findAll(
    userId: string,
    filters: FilterParams,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<JobResponse>> {
    const where: Prisma.JobWhereInput = {
      queue: { project: { userId } },
      ...(filters.status && { status: filters.status as JobStatus }),
      ...(filters.type && { type: filters.type as JobType }),
      ...(filters.queueId && { queueId: filters.queueId }),
      ...(filters.priority !== undefined && { priority: filters.priority }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.job.count({ where }),
    ]);

    return buildPaginatedResponse(jobs as unknown as JobResponse[], total, pagination);
  }

  async findById(userId: string, jobId: string): Promise<JobResponse> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        queue: { include: { project: { select: { userId: true } } } },
        executions: { orderBy: { attempt: 'desc' }, take: 10 },
        logs: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });

    if (!job || job.queue.project.userId !== userId) {
      throw new NotFoundError('Job', jobId);
    }

    return job as unknown as JobResponse;
  }

  async retry(userId: string, jobId: string): Promise<JobResponse> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { queue: { include: { project: { select: { userId: true } } } } },
    });

    if (!job || job.queue.project.userId !== userId) {
      throw new NotFoundError('Job', jobId);
    }

    if (!['FAILED', 'DEAD'].includes(job.status)) {
      throw new ValidationError('Only failed or dead jobs can be retried');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        attempts: 0,
        error: null,
        failedAt: null,
        claimedBy: null,
        lockedUntil: null,
      },
    });

    // Remove from DLQ if present
    await this.prisma.deadLetterQueue.deleteMany({
      where: { jobId },
    });

    logger.info('Job retried', { jobId });

    return updated as unknown as JobResponse;
  }

  async cancel(userId: string, jobId: string): Promise<JobResponse> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { queue: { include: { project: { select: { userId: true } } } } },
    });

    if (!job || job.queue.project.userId !== userId) {
      throw new NotFoundError('Job', jobId);
    }

    if (['COMPLETED', 'DEAD'].includes(job.status)) {
      throw new ValidationError('Cannot cancel a completed or dead job');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'DEAD', failedAt: new Date(), error: 'Cancelled by user' },
    });

    return updated as unknown as JobResponse;
  }

  private inferJobType(input: CreateJobInput): JobType {
    if (input.cronExpression) return 'RECURRING';
    if (input.batchId) return 'BATCH';
    if (input.scheduledFor) {
      const scheduled = new Date(input.scheduledFor);
      const now = new Date();
      return scheduled.getTime() - now.getTime() > 60000 ? 'SCHEDULED' : 'DELAYED';
    }
    return 'IMMEDIATE';
  }

  private getInitialStatus(type: JobType, scheduledFor?: string): JobStatus {
    if (type === 'SCHEDULED' || type === 'DELAYED' || type === 'RECURRING') {
      return 'SCHEDULED';
    }
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      return 'SCHEDULED';
    }
    return 'QUEUED';
  }
}
