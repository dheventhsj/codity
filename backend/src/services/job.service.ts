import { PrismaClient, JobStatus, JobType, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { FilterParams } from '../types';
import { logger } from '../utils/logger';
import { ProjectService } from './project.service';
import { JobRepository } from '../repositories/job.repository';

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
  private readonly projectService: ProjectService;
  private readonly jobRepo: JobRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.projectService = new ProjectService(prisma);
    this.jobRepo = new JobRepository(prisma);
  }

  async create(userId: string, input: CreateJobInput): Promise<JobResponse> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: input.queueId },
      include: { project: { select: { id: true } } },
    });

    if (!queue) throw new NotFoundError('Queue', input.queueId);
    await this.projectService.assertProjectAccess(userId, queue.project.id);

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
    if (!filters.projectId) {
      return buildPaginatedResponse([], 0, pagination);
    }

    await this.projectService.assertProjectAccess(userId, filters.projectId);

    const result = await this.jobRepo.findMany({
      where: {
        queue: { projectId: filters.projectId },
        ...(filters.status && { status: filters.status as JobStatus }),
        ...(filters.type && { type: filters.type as JobType }),
        ...(filters.queueId && { queueId: filters.queueId }),
        ...(filters.priority !== undefined && { priority: filters.priority }),
      },
      skip: pagination.skip,
      take: pagination.limit,
      search: filters.search,
    });

    return buildPaginatedResponse(result.data as unknown as JobResponse[], result.total, pagination);
  }

  private async assertJobAccess(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { queue: { select: { projectId: true } } },
    });
    if (!job) throw new NotFoundError('Job', jobId);
    await this.projectService.assertProjectAccess(userId, job.queue.projectId);
    return job;
  }

  async findById(userId: string, jobId: string): Promise<JobResponse> {
    await this.assertJobAccess(userId, jobId);

    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundError('Job', jobId);

    return job as unknown as JobResponse;
  }

  async retry(userId: string, jobId: string): Promise<JobResponse> {
    const job = await this.assertJobAccess(userId, jobId);

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

    await this.prisma.deadLetterQueue.deleteMany({ where: { jobId } });

    logger.info('Job retried', { jobId });

    return updated as unknown as JobResponse;
  }

  async cancel(userId: string, jobId: string): Promise<JobResponse> {
    const job = await this.assertJobAccess(userId, jobId);

    if (['COMPLETED', 'DEAD'].includes(job.status)) {
      throw new ValidationError('Cannot cancel a completed or dead job');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'DEAD', failedAt: new Date(), error: 'Cancelled by user' },
    });

    return updated as unknown as JobResponse;
  }

  async getDlq(userId: string, projectId: string, pagination: PaginationParams) {
    await this.projectService.assertProjectAccess(userId, projectId);

    const where = { job: { queue: { projectId } }, resolvedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.deadLetterQueue.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { failedAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              name: true,
              queueId: true,
              attempts: true,
              payload: true,
            },
          },
        },
      }),
      this.prisma.deadLetterQueue.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, pagination);
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
