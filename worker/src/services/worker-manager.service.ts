import { PrismaClient } from '@prisma/client';
import { workerConfig } from '../config';
import { logger } from '../utils/logger';
import { JobClaimerService } from './job-claimer.service';
import { JobExecutorService } from './job-executor.service';
import { HeartbeatService } from './heartbeat.service';
import { StaleDetectorService } from './stale-detector.service';
import os from 'os';

/**
 * Worker Manager - Orchestrates the complete worker lifecycle
 * 
 * Architecture:
 * 1. Registration: Worker registers itself in the database on startup
 * 2. Polling Loop: Periodically checks for available jobs
 * 3. Concurrent Execution: Runs up to N jobs concurrently
 * 4. Heartbeat: Proves liveness to the system
 * 5. Stale Detection: Recovers jobs from crashed workers
 * 6. Graceful Shutdown: Drains in-flight jobs before stopping
 * 
 * The worker manager maintains a semaphore-like counter of active jobs.
 * When currentLoad < concurrency, it claims more jobs.
 * When shutting down, it stops claiming and waits for in-flight jobs.
 */
export class WorkerManager {
  private workerId: string = '';
  private isRunning = false;
  private isShuttingDown = false;
  private currentLoad = 0;
  private pollHandle: NodeJS.Timeout | null = null;
  private activeJobs: Set<string> = new Set();

  private readonly claimer: JobClaimerService;
  private readonly executor: JobExecutorService;
  private readonly heartbeat: HeartbeatService;
  private readonly staleDetector: StaleDetectorService;

  constructor(private readonly prisma: PrismaClient) {
    this.claimer = new JobClaimerService(prisma);
    this.executor = new JobExecutorService(prisma);
    this.heartbeat = new HeartbeatService(prisma);
    this.staleDetector = new StaleDetectorService(prisma);
  }

  async start(): Promise<void> {
    logger.info('Starting worker manager...', {
      name: workerConfig.worker.name,
      concurrency: workerConfig.worker.concurrency,
      pollInterval: workerConfig.worker.pollIntervalMs,
    });

    // Register worker in database
    const worker = await this.prisma.worker.create({
      data: {
        projectId: workerConfig.worker.projectId,
        name: workerConfig.worker.name,
        hostname: os.hostname(),
        pid: process.pid,
        concurrency: workerConfig.worker.concurrency,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
      },
    });

    this.workerId = worker.id;
    this.isRunning = true;

    // Start subsystems
    this.heartbeat.start(this.workerId, () => this.currentLoad);
    this.staleDetector.start();

    // Start polling loop
    this.pollHandle = setInterval(
      () => this.poll(),
      workerConfig.worker.pollIntervalMs
    );

    // Do an immediate poll
    await this.poll();

    logger.info('Worker manager started', { workerId: this.workerId });
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Initiating graceful shutdown...', {
      activeJobs: this.activeJobs.size,
    });

    // Stop polling for new jobs
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }

    // Stop heartbeat and stale detector
    this.heartbeat.stop();
    this.staleDetector.stop();

    // Wait for in-flight jobs to complete (with timeout)
    const shutdownTimeout = 30000;
    const startTime = Date.now();

    while (this.activeJobs.size > 0 && Date.now() - startTime < shutdownTimeout) {
      logger.info(`Waiting for ${this.activeJobs.size} jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.activeJobs.size > 0) {
      logger.warn(`Forced shutdown with ${this.activeJobs.size} jobs still active`);
      // Release uncompleted jobs back to queue
      await this.prisma.job.updateMany({
        where: {
          id: { in: Array.from(this.activeJobs) },
          status: { in: ['CLAIMED', 'RUNNING'] },
        },
        data: { status: 'QUEUED', claimedBy: null, lockedUntil: null },
      });
    }

    // Deregister worker
    await this.prisma.worker.update({
      where: { id: this.workerId },
      data: { status: 'OFFLINE', stoppedAt: new Date() },
    });

    this.isRunning = false;
    logger.info('Worker manager stopped gracefully');
  }

  private async poll(): Promise<void> {
    if (!this.isRunning || this.isShuttingDown) return;

    const availableSlots = workerConfig.worker.concurrency - this.currentLoad;
    if (availableSlots <= 0) return;

    const jobIds = await this.claimer.claimJobs(
      this.workerId,
      workerConfig.worker.projectId,
      availableSlots
    );

    for (const jobId of jobIds) {
      this.executeJob(jobId);
    }
  }

  private executeJob(jobId: string): void {
    this.activeJobs.add(jobId);
    this.currentLoad++;

    this.executor
      .executeJob(jobId, this.workerId)
      .then(() => {
        this.updateWorkerStats(true);
      })
      .catch((error) => {
        logger.error('Unhandled execution error', { jobId, error });
        this.updateWorkerStats(false);
      })
      .finally(() => {
        this.activeJobs.delete(jobId);
        this.currentLoad--;
      });
  }

  private async updateWorkerStats(success: boolean): Promise<void> {
    try {
      await this.prisma.worker.update({
        where: { id: this.workerId },
        data: {
          totalProcessed: { increment: 1 },
          ...(success ? {} : { totalFailed: { increment: 1 } }),
        },
      });
    } catch {
      // Non-critical, don't crash for stats update failure
    }
  }
}
