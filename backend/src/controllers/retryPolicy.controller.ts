import { Request, Response } from 'express';
import { RetryPolicyService } from '../services/retryPolicy.service';

export class RetryPolicyController {
  constructor(private readonly retryPolicyService: RetryPolicyService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const policy = await this.retryPolicyService.create(req.body);
    res.status(201).json({ success: true, data: policy });
  };

  findAll = async (_req: Request, res: Response): Promise<void> => {
    const policies = await this.retryPolicyService.findAll();
    res.status(200).json({ success: true, data: policies });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const policy = await this.retryPolicyService.findById(String(req.params.id));
    res.status(200).json({ success: true, data: policy });
  };
}
