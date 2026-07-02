import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { queues: number; workers: number };
}

export class ProjectService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateProjectInput): Promise<ProjectResponse> {
    return this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        userId,
      },
      include: { _count: { select: { queues: true, workers: true } } },
    });
  }

  async findAll(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<ProjectResponse>> {
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        include: { _count: { select: { queues: true, workers: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where: { userId } }),
    ]);

    return buildPaginatedResponse(projects, total, pagination);
  }

  async findById(userId: string, projectId: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { _count: { select: { queues: true, workers: true } } },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    return project;
  }

  async delete(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }
}
