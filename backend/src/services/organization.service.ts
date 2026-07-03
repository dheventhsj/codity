import { OrgRole, PrismaClient } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export class OrganizationService {
  constructor(private readonly prisma: PrismaClient) {}

  async createForUser(userId: string, name: string) {
    const slug = `${slugify(name)}-${Date.now().toString(36)}`;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'OWNER',
        },
      });

      return org;
    });
  }

  async getMembership(organizationId: string, userId: string) {
    return this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
  }

  async assertMembership(organizationId: string, userId: string, minRole: OrgRole = 'VIEWER') {
    const membership = await this.getMembership(organizationId, userId);
    if (!membership) throw new ForbiddenError('Not a member of this organization');

    const hierarchy: Record<OrgRole, number> = {
      VIEWER: 1,
      MEMBER: 2,
      ADMIN: 3,
      OWNER: 4,
    };

    if (hierarchy[membership.role] < hierarchy[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }

    return membership;
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { where: { userId }, select: { role: true } },
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, userId: string) {
    await this.assertMembership(organizationId, userId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { projects: true } },
      },
    });

    if (!org) throw new NotFoundError('Organization', organizationId);
    return org;
  }
}
