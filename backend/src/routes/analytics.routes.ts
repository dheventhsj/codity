import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(controller.getDashboard));
  router.get('/latency', asyncHandler(controller.getLatency));
  return router;
}
