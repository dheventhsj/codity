import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config, validateConfig } from './config';
import { getPrismaClient, disconnectDatabase } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';
import { QueueService } from './services/queue.service';
import { JobService } from './services/job.service';
import { WorkerService } from './services/worker.service';
import { StatsService } from './services/stats.service';
import { RetryPolicyService } from './services/retryPolicy.service';

import { AuthController } from './controllers/auth.controller';
import { ProjectController } from './controllers/project.controller';
import { QueueController } from './controllers/queue.controller';
import { JobController } from './controllers/job.controller';
import { WorkerController } from './controllers/worker.controller';
import { StatsController } from './controllers/stats.controller';
import { RetryPolicyController } from './controllers/retryPolicy.controller';

import { createAuthRoutes } from './routes/auth.routes';
import { createProjectRoutes } from './routes/project.routes';
import { createQueueRoutes } from './routes/queue.routes';
import { createJobRoutes } from './routes/job.routes';
import { createWorkerRoutes } from './routes/worker.routes';
import { createStatsRoutes } from './routes/stats.routes';
import { createRetryPolicyRoutes } from './routes/retryPolicy.routes';

validateConfig();

const app = express();
const prisma = getPrismaClient();

// --- Dependency Injection (Poor Man's DI - sufficient for this scale) ---
const authService = new AuthService(prisma);
const projectService = new ProjectService(prisma);
const queueService = new QueueService(prisma);
const jobService = new JobService(prisma);
const workerService = new WorkerService(prisma);
const statsService = new StatsService(prisma);
const retryPolicyService = new RetryPolicyService(prisma);

const authController = new AuthController(authService);
const projectController = new ProjectController(projectService);
const queueController = new QueueController(queueService);
const jobController = new JobController(jobService);
const workerController = new WorkerController(workerService);
const statsController = new StatsController(statsService);
const retryPolicyController = new RetryPolicyController(retryPolicyService);

// --- Middleware ---
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- Routes ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/auth', createAuthRoutes(authController));
app.use('/api/v1/projects', createProjectRoutes(projectController));
app.use('/api/v1/queues', createQueueRoutes(queueController));
app.use('/api/v1/jobs', createJobRoutes(jobController));
app.use('/api/v1/workers', createWorkerRoutes(workerController));
app.use('/api/v1/stats', createStatsRoutes(statsController));
app.use('/api/v1/retry-policies', createRetryPolicyRoutes(retryPolicyController));

// --- Health Check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Server Startup ---
const server = app.listen(config.port, () => {
  logger.info(`🚀 Codity API Server running on port ${config.port}`);
  logger.info(`📖 API Documentation: http://localhost:${config.port}/api/docs`);
});

// --- Graceful Shutdown ---
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    await disconnectDatabase();
    logger.info('Server shut down gracefully');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
