import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { PaginationParams, buildPaginatedResponse, PaginatedResponse } from '../utils/pagination';
import { OrganizationService } from './organization.service';

export interface CreateProjectInput {
  name: string;
  description?: string;
  organizationId: string;
}

export class ProjectService {
  private readonly orgService: OrganizationService;

  constructor(private readonly prisma: PrismaClient) {
    this.orgService = new OrganizationService(prisma);
  }

  async create(userId: string, input: CreateProjectInput) {
    await this.orgService.assertMembership(input.organizationId, userId, 'MEMBER');

    return this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
      },
      include: { _count: { select: { queues: true, workers: true } } },
    });
  }

  async findAll(userId: string, organizationId: string, pagination: PaginationParams) {
    await this.orgService.assertMembership(organizationId, userId);

    const where = { organizationId };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { _count: { select: { queues: true, workers: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return buildPaginatedResponse(projects, total, pagination);
  }

  async findById(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        _count: { select: { queues: true, workers: true } },
      },
    });

    if (!project) throw new NotFoundError('Project', projectId);
    await this.orgService.assertMembership(project.organizationId, userId);

    return project;
  }

  async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.findById(userId, projectId);
    return project;
  }

  async delete(userId: string, projectId: string) {
    await this.orgService.assertMembership(
      (await this.findById(userId, projectId)).organizationId,
      userId,
      'ADMIN'
    );
    await this.prisma.project.delete({ where: { id: projectId } });
  }
}
