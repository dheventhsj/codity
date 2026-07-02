import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createStatsRoutes(controller: StatsController): Router {
  const router = Router();

  router.use(authenticate);

  /**
   * @swagger
   * /stats:
   *   get:
   *     tags: [Statistics]
   *     summary: Get dashboard statistics
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: projectId, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: Dashboard statistics }
   */
  router.get('/', asyncHandler(controller.getDashboardStats));

  return router;
}
