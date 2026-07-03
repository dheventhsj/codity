import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

export function createSearchRoutes(controller: SearchController): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(controller.global));
  return router;
}
