import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags: [Authentication]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, name]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               name: { type: string }
   *     responses:
   *       201: { description: User registered successfully }
   *       409: { description: User already exists }
   */
  router.post('/register', validate(registerSchema), asyncHandler(controller.register));

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Authentication]
   *     summary: Login user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200: { description: Login successful }
   *       401: { description: Invalid credentials }
   */
  router.post('/login', validate(loginSchema), asyncHandler(controller.login));

  return router;
}
