import { AuditAction, AuditResource, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateAuditLogInput {
  userId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditRepository extends BaseRepository {
  async create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    userId?: string;
    resource?: AuditResource;
    action?: AuditAction;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.userId && { userId: params.userId }),
      ...(params.resource && { resource: params.resource }),
      ...(params.action && { action: params.action }),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from && { gte: params.from }),
              ...(params.to && { lte: params.to }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
