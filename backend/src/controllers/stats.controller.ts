import { Response } from 'express';
import { StatsService } from '../services/stats.service';
import { AuthenticatedRequest } from '../types';

export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = req.query.projectId as string;
    const stats = await this.statsService.getDashboardStats(req.user!.id, projectId);
    res.status(200).json({ success: true, data: stats });
  };
}
