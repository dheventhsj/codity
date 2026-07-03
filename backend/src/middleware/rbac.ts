import { OrgRole } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { OrganizationService } from '../services/organization.service';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function requireOrgRole(minRole: OrgRole) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();

    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      (req.body?.organizationId as string);

    if (!organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const orgService = new OrganizationService(
      (req as AuthenticatedRequest & { prisma?: unknown }).prisma as never
    );

    // Fallback: attach orgService via app locals in index.ts
    const membership = await (req as AuthenticatedRequest & {
      getMembership?: (orgId: string, userId: string) => Promise<{ role: OrgRole } | null>;
    }).getMembership?.(organizationId, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this organization');
    }

    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }

    req.organizationId = organizationId;
    req.orgRole = membership.role;
    next();
  };
}

export function attachMembershipResolver(
  resolver: (orgId: string, userId: string) => Promise<{ role: OrgRole } | null>
) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.getMembership = resolver;
    next();
  };
}
