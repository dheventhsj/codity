import { PrismaClient } from '@prisma/client';
import { workerConfig } from './config';
import { logger } from './utils/logger';
import { WorkerManager } from './services/worker-manager.service';

async function main(): Promise<void> {
  logger.info('Codity Worker Service starting...', {
    name: workerConfig.worker.name,
    pid: process.pid,
    projectId: workerConfig.worker.projectId,
  });

  if (!workerConfig.worker.projectId) {
    logger.error('PROJECT_ID environment variable is required');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const manager = new WorkerManager(prisma);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    await manager.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error });
    await manager.stop();
    await prisma.$disconnect();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  await manager.start();
}

main().catch((error) => {
  logger.error('Worker failed to start', { error });
  process.exit(1);
});
