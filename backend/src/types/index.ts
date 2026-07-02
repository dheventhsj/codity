import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FilterParams {
  status?: string;
  type?: string;
  priority?: number;
  queueId?: string;
  projectId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}
