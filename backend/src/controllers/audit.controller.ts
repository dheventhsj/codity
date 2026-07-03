import { Response } from 'express';
import { AuditResource, AuditAction } from '@prisma/client';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../types';
import { extractPagination } from '../utils/pagination';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const result = await this.auditService.findAll({
      skip: pagination.skip,
      take: pagination.limit,
      userId: req.query.userId ? String(req.query.userId) : undefined,
      resource: req.query.resource ? (String(req.query.resource) as AuditResource) : undefined,
      action: req.query.action ? (String(req.query.action) as AuditAction) : undefined,
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        ...pagination,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
        hasNext: pagination.page * pagination.limit < result.total,
        hasPrev: pagination.page > 1,
      },
    });
  };
}
