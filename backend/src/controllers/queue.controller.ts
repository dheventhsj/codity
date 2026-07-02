import { Response } from 'express';
import { QueueService } from '../services/queue.service';
import { AuthenticatedRequest } from '../types';
import { extractPagination } from '../utils/pagination';

export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const queue = await this.queueService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: queue });
  };

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const projectId = String(req.query.projectId || '');
    const result = await this.queueService.findAll(req.user!.id, projectId, pagination);
    res.status(200).json({ success: true, ...result });
  };

  findById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const queue = await this.queueService.findById(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: queue });
  };

  pause = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const queue = await this.queueService.pause(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: queue });
  };

  resume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const queue = await this.queueService.resume(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: queue });
  };

  getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = await this.queueService.getStats(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: stats });
  };
}
