import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth = async (req: Request, res: Response): Promise<void> => {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const data = await this.healthService.getSystemHealth(projectId);
    res.json({ success: true, data });
  };
}
