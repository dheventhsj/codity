import { Router } from 'express';
import { z } from 'zod';
import { QueueController } from '../controllers/queue.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const createQueueSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    projectId: z.string().uuid(),
    priority: z.number().int().min(0).max(100).optional(),
    concurrency: z.number().int().min(1).max(100).optional(),
    retryPolicyId: z.string().uuid().optional(),
    description: z.string().max(500).optional(),
  }),
});

export function createQueueRoutes(controller: QueueController): Router {
  const router = Router();

  router.use(authenticate);

  /**
   * @swagger
   * /queues:
   *   post:
   *     tags: [Queues]
   *     summary: Create a new queue
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, projectId]
   *             properties:
   *               name: { type: string }
   *               projectId: { type: string, format: uuid }
   *               priority: { type: integer, default: 0 }
   *               concurrency: { type: integer, default: 5 }
   *               retryPolicyId: { type: string, format: uuid }
   *               description: { type: string }
   *     responses:
   *       201: { description: Queue created }
   */
  router.post('/', validate(createQueueSchema), asyncHandler(controller.create));

  /**
   * @swagger
   * /queues:
   *   get:
   *     tags: [Queues]
   *     summary: List queues for a project
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: projectId, required: true, schema: { type: string } }
   *     responses:
   *       200: { description: List of queues }
   */
  router.get('/', asyncHandler(controller.findAll));

  router.get('/:id', asyncHandler(controller.findById));
  router.patch('/:id/pause', asyncHandler(controller.pause));
  router.patch('/:id/resume', asyncHandler(controller.resume));
  router.post('/:id/pause', asyncHandler(controller.pause));
  router.post('/:id/resume', asyncHandler(controller.resume));
  router.get('/:id/stats', asyncHandler(controller.getStats));

  return router;
}
