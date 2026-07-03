import { Response } from 'express';
import { JobService } from '../services/job.service';
import { AuthenticatedRequest, FilterParams } from '../types';
import { extractPagination } from '../utils/pagination';

export class JobController {
  constructor(private readonly jobService: JobService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const job = await this.jobService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: job });
  };

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const filters: FilterParams = {
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      queueId: req.query.queueId as string | undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      priority: req.query.priority ? parseInt(String(req.query.priority)) : undefined,
    };
    const result = await this.jobService.findAll(req.user!.id, filters, pagination);
    res.status(200).json({ success: true, ...result });
  };

  findById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const job = await this.jobService.findById(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: job });
  };

  retry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const job = await this.jobService.retry(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: job });
  };

  cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const job = await this.jobService.cancel(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: job });
  };
}
