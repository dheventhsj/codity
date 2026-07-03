import { Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AuthenticatedRequest } from '../types';
import { extractPagination } from '../utils/pagination';

export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const project = await this.projectService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: project });
  };

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pagination = extractPagination(req);
    const organizationId = String(req.query.organizationId);
    const result = await this.projectService.findAll(req.user!.id, organizationId, pagination);
    res.status(200).json({ success: true, ...result });
  };

  findById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const project = await this.projectService.findById(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: project });
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await this.projectService.delete(req.user!.id, String(req.params.id));
    res.status(204).send();
  };
}
