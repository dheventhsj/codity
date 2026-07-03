import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { Server as HttpServer, createServer } from 'http';

import { config } from './config';
import { getPrismaClient } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { attachMembershipResolver } from './middleware/rbac';
import { logger } from './utils/logger';
import { realtimeService } from './realtime/socket.service';

import { AuditRepository } from './repositories/audit.repository';

import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';
import { QueueService } from './services/queue.service';
import { JobService } from './services/job.service';
import { WorkerService } from './services/worker.service';
import { StatsService } from './services/stats.service';
import { RetryPolicyService } from './services/retryPolicy.service';
import { AnalyticsService } from './services/analytics.service';
import { AuditService } from './services/audit.service';
import { HealthService } from './services/health.service';
import { OrganizationService } from './services/organization.service';

import { AuthController } from './controllers/auth.controller';
import { ProjectController } from './controllers/project.controller';
import { QueueController } from './controllers/queue.controller';
import { JobController } from './controllers/job.controller';
import { WorkerController } from './controllers/worker.controller';
import { StatsController } from './controllers/stats.controller';
import { RetryPolicyController } from './controllers/retryPolicy.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AuditController } from './controllers/audit.controller';
import { HealthController } from './controllers/health.controller';
import { SearchController } from './controllers/search.controller';
import { DlqController } from './controllers/dlq.controller';

import { createAuthRoutes } from './routes/auth.routes';
import { createProjectRoutes } from './routes/project.routes';
import { createQueueRoutes } from './routes/queue.routes';
import { createJobRoutes } from './routes/job.routes';
import { createWorkerRoutes } from './routes/worker.routes';
import { createStatsRoutes } from './routes/stats.routes';
import { createRetryPolicyRoutes } from './routes/retryPolicy.routes';
import { createAnalyticsRoutes } from './routes/analytics.routes';
import { createAuditRoutes } from './routes/audit.routes';
import { createSearchRoutes } from './routes/search.routes';
import { createDlqRoutes } from './routes/dlq.routes';

export function createApp(): { app: Express; httpServer: HttpServer } {
  const app = express();
  const httpServer = createServer(app);
  const prisma = getPrismaClient();
  const orgService = new OrganizationService(prisma);

  const auditRepo = new AuditRepository(prisma);
  const authService = new AuthService(prisma);
  const projectService = new ProjectService(prisma);
  const queueService = new QueueService(prisma);
  const jobService = new JobService(prisma);
  const workerService = new WorkerService(prisma);
  const statsService = new StatsService(prisma);
  const retryPolicyService = new RetryPolicyService(prisma);
  const analyticsService = new AnalyticsService(prisma);
  const healthService = new HealthService(prisma);

  const authController = new AuthController(authService);
  const projectController = new ProjectController(projectService);
  const queueController = new QueueController(queueService);
  const jobController = new JobController(jobService);
  const workerController = new WorkerController(workerService);
  const statsController = new StatsController(statsService);
  const retryPolicyController = new RetryPolicyController(retryPolicyService);
  const analyticsController = new AnalyticsController(analyticsService);
  const auditController = new AuditController(new AuditService(auditRepo));
  const healthController = new HealthController(healthService);
  const searchController = new SearchController(prisma);
  const dlqController = new DlqController(jobService);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(
    attachMembershipResolver(async (orgId, userId) => {
      const m = await orgService.getMembership(orgId, userId);
      return m ? { role: m.role } : null;
    })
  );

  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1/auth', createAuthRoutes(authController));
  app.use('/api/v1/projects', createProjectRoutes(projectController));
  app.use('/api/v1/queues', createQueueRoutes(queueController));
  app.use('/api/v1/jobs', createJobRoutes(jobController));
  app.use('/api/v1/workers', createWorkerRoutes(workerController));
  app.use('/api/v1/stats', createStatsRoutes(statsController));
  app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsController));
  app.use('/api/v1/audit-logs', createAuditRoutes(auditController));
  app.use('/api/v1/dlq', createDlqRoutes(dlqController));
  app.use('/api/v1/search', createSearchRoutes(searchController));
  app.use('/api/v1/retry-policies', createRetryPolicyRoutes(retryPolicyController));
  app.get('/health', healthController.getHealth);
  app.get('/api/v1/health', healthController.getHealth);

  app.use(errorHandler);

  realtimeService.initialize(httpServer);

  return { app, httpServer };
}
