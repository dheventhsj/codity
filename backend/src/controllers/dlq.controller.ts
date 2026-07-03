import { Response } from 'express';
import { JobService } from '../services/job.service';
import { AuthenticatedRequest } from '../types';
import { extractPagination } from '../utils/pagination';

export class DlqController {
  constructor(private readonly jobService: JobService) {}

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const projectId = String(req.query.projectId);
    const result = await this.jobService.getDlq(req.user!.id, projectId, pagination);
    res.json({ success: true, ...result });
  };
}
