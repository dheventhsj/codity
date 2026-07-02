import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { workerConfig } from '../config';

/**
 * Stale Worker Detector
 * 
 * Runs periodically to find workers that have stopped sending heartbeats.
 * When a worker is detected as stale:
 * 1. Mark it as STALE (warning state)
 * 2. After another threshold, mark as OFFLINE
 * 3. Release all jobs claimed by offline workers back to QUEUED
 * 
 * This prevents job starvation when workers crash without graceful shutdown.
 */
export class StaleDetectorService {
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  start(): void {
    this.intervalHandle = setInterval(
      () => this.detectStaleWorkers(),
      workerConfig.worker.staleThresholdMs
    );

    logger.info('Stale detector started');
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async detectStaleWorkers(): Promise<void> {
    const staleThreshold = new Date(
      Date.now() - workerConfig.worker.staleThresholdMs
    );
    const offlineThreshold = new Date(
      Date.now() - workerConfig.worker.staleThresholdMs * 3
    );

    try {
      // Mark stale workers
      const staleResult = await this.prisma.worker.updateMany({
        where: {
          status: { in: ['ONLINE', 'BUSY', 'IDLE'] },
          lastHeartbeat: { lt: staleThreshold },
        },
        data: { status: 'STALE' },
      });

      if (staleResult.count > 0) {
        logger.warn(`Marked ${staleResult.count} workers as STALE`);
      }

      // Mark offline workers and release their jobs
      const offlineWorkers = await this.prisma.worker.findMany({
        where: {
          status: 'STALE',
          lastHeartbeat: { lt: offlineThreshold },
        },
      });

      for (const worker of offlineWorkers) {
        await this.prisma.$transaction([
          this.prisma.worker.update({
            where: { id: worker.id },
            data: { status: 'OFFLINE', stoppedAt: new Date() },
          }),
          this.prisma.job.updateMany({
            where: {
              claimedBy: worker.id,
              status: { in: ['CLAIMED', 'RUNNING'] },
            },
            data: {
              status: 'QUEUED',
              claimedBy: null,
              lockedUntil: null,
            },
          }),
        ]);

        logger.error(`Worker ${worker.name} marked OFFLINE, jobs released`, {
          workerId: worker.id,
        });
      }
    } catch (error) {
      logger.error('Stale detection failed', { error });
    }
  }
}
