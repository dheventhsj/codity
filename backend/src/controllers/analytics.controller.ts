import { Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AuthenticatedRequest } from '../types';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = String(req.query.projectId);
    const data = await this.analyticsService.getDashboardAnalytics(req.user!.id, projectId);
    res.json({ success: true, data });
  };

  getLatency = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = String(req.query.projectId);
    const queueId = req.query.queueId ? String(req.query.queueId) : undefined;
    const data = await this.analyticsService.getQueueLatency(req.user!.id, projectId, queueId);
    res.json({ success: true, data });
  };
}
