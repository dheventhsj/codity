import dotenv from 'dotenv';

dotenv.config();

export const workerConfig = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  worker: {
    name: process.env.WORKER_NAME || `worker-${process.pid}`,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '10000', 10),
    staleThresholdMs: parseInt(process.env.STALE_THRESHOLD_MS || '30000', 10),
    projectId: process.env.PROJECT_ID || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;
