import { Router } from 'express';
import { z } from 'zod';
import { JobController } from '../controllers/job.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const createJobSchema = z.object({
  body: z.object({
    queueId: z.string().uuid(),
    name: z.string().min(1).max(200),
    type: z.enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH']).optional(),
    payload: z.record(z.unknown()).optional(),
    priority: z.number().int().min(0).max(100).optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    scheduledFor: z.string().datetime().optional(),
    cronExpression: z.string().max(100).optional(),
    batchId: z.string().uuid().optional(),
    idempotencyKey: z.string().max(255).optional(),
  }),
});

export function createJobRoutes(controller: JobController): Router {
  const router = Router();

  router.use(authenticate);

  /**
   * @swagger
   * /jobs:
   *   post:
   *     tags: [Jobs]
   *     summary: Create a new job
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [queueId, name]
   *             properties:
   *               queueId: { type: string, format: uuid }
   *               name: { type: string }
   *               type: { type: string, enum: [IMMEDIATE, DELAYED, SCHEDULED, RECURRING, BATCH] }
   *               payload: { type: object }
   *               priority: { type: integer }
   *               maxAttempts: { type: integer }
   *               scheduledFor: { type: string, format: date-time }
   *               cronExpression: { type: string }
   *               batchId: { type: string }
   *               idempotencyKey: { type: string }
   *     responses:
   *       201: { description: Job created }
   */
  router.post('/', validate(createJobSchema), asyncHandler(controller.create));

  /**
   * @swagger
   * /jobs:
   *   get:
   *     tags: [Jobs]
   *     summary: List jobs with filtering
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: status, schema: { type: string } }
   *       - { in: query, name: type, schema: { type: string } }
   *       - { in: query, name: queueId, schema: { type: string } }
   *       - { in: query, name: page, schema: { type: integer } }
   *       - { in: query, name: limit, schema: { type: integer } }
   *     responses:
   *       200: { description: List of jobs }
   */
  router.get('/', asyncHandler(controller.findAll));

  router.get('/:id', asyncHandler(controller.findById));
  router.post('/:id/retry', asyncHandler(controller.retry));
  router.post('/:id/cancel', asyncHandler(controller.cancel));

  return router;
}
