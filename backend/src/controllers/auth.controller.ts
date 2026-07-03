import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  };

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  };

  profile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const profile = await this.authService.getProfile(req.user!.id);
    res.status(200).json({ success: true, data: profile });
  };
}
