import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createAuditRoutes(controller: AuditController): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(controller.findAll));
  return router;
}
