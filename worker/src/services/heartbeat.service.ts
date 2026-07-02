import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { workerConfig } from '../config';

/**
 * Heartbeat Service
 * 
 * Design Decision: Workers must continuously prove liveness to the system.
 * If a worker crashes without graceful shutdown, its heartbeat will stop,
 * and the stale detector will mark it STALE → OFFLINE and release its jobs.
 * 
 * Heartbeats are written to a separate table to avoid write amplification
 * on the workers table (which is read-heavy for dashboard queries).
 * 
 * The worker also updates its own record's `lastHeartbeat` field for
 * quick staleness checks without joining the heartbeats table.
 */
export class HeartbeatService {
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  start(workerId: string, getLoad: () => number): void {
    this.intervalHandle = setInterval(async () => {
      try {
        const memUsage = process.memoryUsage();
        const memoryMb = memUsage.heapUsed / 1024 / 1024;
        const currentLoad = getLoad();

        await Promise.all([
          this.prisma.workerHeartbeat.create({
            data: {
              workerId,
              load: currentLoad,
              memory: Math.round(memoryMb * 100) / 100,
            },
          }),
          this.prisma.worker.update({
            where: { id: workerId },
            data: {
              lastHeartbeat: new Date(),
              currentLoad,
              status: currentLoad > 0 ? 'BUSY' : 'IDLE',
            },
          }),
        ]);
      } catch (error) {
        logger.error('Heartbeat failed', { workerId, error });
      }
    }, workerConfig.worker.heartbeatIntervalMs);

    logger.info('Heartbeat service started', {
      workerId,
      interval: workerConfig.worker.heartbeatIntervalMs,
    });
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('Heartbeat service stopped');
    }
  }
}
