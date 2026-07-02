import { Router } from 'express';
import { WorkerController } from '../controllers/worker.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createWorkerRoutes(controller: WorkerController): Router {
  const router = Router();

  router.use(authenticate);

  /**
   * @swagger
   * /workers:
   *   get:
   *     tags: [Workers]
   *     summary: List workers for a project
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: projectId, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: List of workers }
   */
  router.get('/', asyncHandler(controller.findAll));
  router.get('/stats', asyncHandler(controller.getStats));

  return router;
}
