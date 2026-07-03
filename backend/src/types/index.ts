import { Request } from 'express';
import { OrgRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  organizationId?: string;
  orgRole?: OrgRole;
  getMembership?: (orgId: string, userId: string) => Promise<{ role: OrgRole } | null>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FilterParams {
  status?: string;
  type?: string;
  priority?: number;
  queueId?: string;
  projectId?: string;
  organizationId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}
