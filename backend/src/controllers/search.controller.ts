import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JobRepository } from '../repositories/job.repository';
import { OrganizationService } from '../services/organization.service';
import { AuthenticatedRequest } from '../types';

export class SearchController {
  private readonly jobRepo: JobRepository;
  private readonly orgService: OrganizationService;

  constructor(private readonly prisma: PrismaClient) {
    this.jobRepo = new JobRepository(prisma);
    this.orgService = new OrganizationService(prisma);
  }

  global = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = String(req.query.q || '');
    const organizationId = String(req.query.organizationId);

    if (!query || query.length < 2) {
      res.json({ success: true, data: { jobs: [], queues: [], projects: [] } });
      return;
    }

    await this.orgService.assertMembership(organizationId, req.user!.id);

    const data = await this.jobRepo.searchGlobal(organizationId, query, 10);
    res.json({ success: true, data });
  };
}
