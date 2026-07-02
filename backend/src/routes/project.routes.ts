import { Router } from 'express';
import { z } from 'zod';
import { ProjectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  }),
});

export function createProjectRoutes(controller: ProjectController): Router {
  const router = Router();

  router.use(authenticate);

  /**
   * @swagger
   * /projects:
   *   post:
   *     tags: [Projects]
   *     summary: Create a new project
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *     responses:
   *       201: { description: Project created }
   */
  router.post('/', validate(createProjectSchema), asyncHandler(controller.create));

  /**
   * @swagger
   * /projects:
   *   get:
   *     tags: [Projects]
   *     summary: List all projects
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer } }
   *       - { in: query, name: limit, schema: { type: integer } }
   *     responses:
   *       200: { description: List of projects }
   */
  router.get('/', asyncHandler(controller.findAll));

  router.get('/:id', asyncHandler(controller.findById));
  router.delete('/:id', asyncHandler(controller.delete));

  return router;
}
