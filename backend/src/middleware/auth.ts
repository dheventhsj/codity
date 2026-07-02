import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  id: string;
  email: string;
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
