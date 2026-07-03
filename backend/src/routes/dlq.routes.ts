import { Router } from 'express';
import { DlqController } from '../controllers/dlq.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createDlqRoutes(controller: DlqController): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(controller.findAll));
  return router;
}
