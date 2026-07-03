import { config, validateConfig } from './config';
import { disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import { createApp } from './app';

validateConfig();

const { app, httpServer } = createApp();

httpServer.listen(config.port, () => {
  logger.info(`Codity API Server running on port ${config.port}`);
  logger.info(`API Documentation: http://localhost:${config.port}/api/docs`);
  logger.info(`Socket.IO enabled on /socket.io`);
});

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  httpServer.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
