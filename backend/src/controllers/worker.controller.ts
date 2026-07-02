import { Response } from 'express';
import { WorkerService } from '../services/worker.service';
import { AuthenticatedRequest } from '../types';
import { extractPagination } from '../utils/pagination';

export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const projectId = req.query.projectId as string;
    const result = await this.workerService.findAll(req.user!.id, projectId, pagination);
    res.status(200).json({ success: true, ...result });
  };

  getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = req.query.projectId as string;
    const stats = await this.workerService.getStats(req.user!.id, projectId);
    res.status(200).json({ success: true, data: stats });
  };
}
