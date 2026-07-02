import { Router } from 'express';
import { z } from 'zod';
import { RetryPolicyController } from '../controllers/retryPolicy.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const createRetryPolicySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    strategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).optional(),
    maxRetries: z.number().int().min(1).max(20).optional(),
    baseDelay: z.number().int().min(100).max(600000).optional(),
    maxDelay: z.number().int().min(100).max(3600000).optional(),
  }),
});

export function createRetryPolicyRoutes(controller: RetryPolicyController): Router {
  const router = Router();

  router.use(authenticate);

  router.post('/', validate(createRetryPolicySchema), asyncHandler(controller.create));
  router.get('/', asyncHandler(controller.findAll));
  router.get('/:id', asyncHandler(controller.findById));

  return router;
}
