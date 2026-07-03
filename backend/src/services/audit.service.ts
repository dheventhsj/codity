import { AuditAction, AuditResource } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';

export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  async log(input: {
    userId?: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.auditRepo.create(input);
  }

  async findAll(params: {
    skip: number;
    take: number;
    userId?: string;
    resource?: AuditResource;
    action?: AuditAction;
    from?: Date;
    to?: Date;
  }) {
    return this.auditRepo.findMany(params);
  }
}
