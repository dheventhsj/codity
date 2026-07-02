import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { calculateRetryDelay, shouldRetry, RetryConfig } from '../strategies/retry.strategy';

/**
 * Job Executor Service
 * 
 * Responsible for:
 * 1. Transitioning job from CLAIMED → RUNNING
 * 2. Executing the job payload (simulated for this implementation)
 * 3. Recording execution results
 * 4. Handling success (COMPLETED) and failure (FAILED → RETRY or DLQ)
 * 
 * Design Decision: Each job execution is wrapped in a try-catch with proper
 * state transitions regardless of outcome. We always record the execution
 * attempt for audit purposes.
 * 
 * In production, the executor would dispatch to registered job handlers
 * based on job name/type. Here we simulate execution with configurable
 * success rates for demonstration.
 */
export class JobExecutorService {
  constructor(private readonly prisma: PrismaClient) {}

  async executeJob(jobId: string, workerId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Transition to RUNNING
      const job = await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
        include: {
          queue: {
            include: { retryPolicy: true },
          },
        },
      });

      // Record execution start
      const execution = await this.prisma.jobExecution.create({
        data: {
          jobId,
          workerId,
          attempt: job.attempts,
          status: 'STARTED',
        },
      });

      // Log execution start
      await this.prisma.jobLog.create({
        data: {
          jobId,
          level: 'INFO',
          message: `Job execution started (attempt ${job.attempts}/${job.maxAttempts})`,
          metadata: { workerId, attempt: job.attempts } as unknown as Prisma.InputJsonValue,
        },
      });

      // --- Simulate job execution ---
      const result = await this.simulateExecution(job.payload as Record<string, unknown>);

      // --- SUCCESS ---
      const duration = Date.now() - startTime;

      await Promise.all([
        this.prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: result as unknown as Prisma.InputJsonValue,
            claimedBy: null,
            lockedUntil: null,
          },
        }),
        this.prisma.jobExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            duration,
            result: result as unknown as Prisma.InputJsonValue,
          },
        }),
        this.prisma.jobLog.create({
          data: {
            jobId,
            level: 'INFO',
            message: `Job completed successfully in ${duration}ms`,
          },
        }),
      ]);

      logger.info('Job completed', { jobId, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.handleFailure(jobId, workerId, errorMessage, duration);
    }
  }

  private async handleFailure(
    jobId: string,
    workerId: string,
    errorMessage: string,
    duration: number
  ): Promise<void> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { queue: { include: { retryPolicy: true } } },
    });

    if (!job) return;

    const retryConfig: RetryConfig = {
      strategy: job.queue.retryPolicy?.strategy || 'EXPONENTIAL',
      baseDelay: job.queue.retryPolicy?.baseDelay || 1000,
      maxDelay: job.queue.retryPolicy?.maxDelay || 300000,
      maxRetries: job.queue.retryPolicy?.maxRetries || job.maxAttempts,
    };

    // Update execution record
    await this.prisma.jobExecution.updateMany({
      where: { jobId, workerId, status: 'STARTED' },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        duration,
        error: errorMessage,
      },
    });

    if (shouldRetry(job.attempts, retryConfig.maxRetries)) {
      // Schedule retry with calculated delay
      const delay = calculateRetryDelay(retryConfig, job.attempts);
      const scheduledFor = new Date(Date.now() + delay);

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'RETRYING',
          error: errorMessage,
          failedAt: new Date(),
          claimedBy: null,
          lockedUntil: null,
          scheduledFor,
        },
      });

      await this.prisma.jobLog.create({
        data: {
          jobId,
          level: 'WARN',
          message: `Job failed, scheduling retry ${job.attempts}/${retryConfig.maxRetries} in ${delay}ms`,
          metadata: { error: errorMessage, nextRetry: scheduledFor.toISOString() } as unknown as Prisma.InputJsonValue,
        },
      });

      logger.warn('Job failed, will retry', {
        jobId,
        attempt: job.attempts,
        maxRetries: retryConfig.maxRetries,
        nextRetryIn: delay,
      });
    } else {
      // Move to Dead Letter Queue
      await this.moveToDeadLetterQueue(jobId, job.attempts, errorMessage);
    }
  }

  private async moveToDeadLetterQueue(
    jobId: string,
    attempts: number,
    errorMessage: string
  ): Promise<void> {
    await Promise.all([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'DEAD',
          error: errorMessage,
          failedAt: new Date(),
          claimedBy: null,
          lockedUntil: null,
        },
      }),
      this.prisma.deadLetterQueue.create({
        data: {
          jobId,
          reason: 'Max retries exhausted',
          attempts,
          lastError: errorMessage,
        },
      }),
      this.prisma.jobLog.create({
        data: {
          jobId,
          level: 'ERROR',
          message: `Job moved to Dead Letter Queue after ${attempts} attempts`,
          metadata: { error: errorMessage } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    logger.error('Job moved to DLQ', { jobId, attempts, error: errorMessage });
  }

  /**
   * Simulates job execution. In a real system, this would dispatch
   * to registered handlers based on job name/type.
   */
  private async simulateExecution(
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const duration = Math.random() * 3000 + 500; // 0.5-3.5s
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Simulate 20% failure rate for demonstration
    if (Math.random() < 0.2) {
      throw new Error('Simulated job failure');
    }

    return {
      processed: true,
      processedAt: new Date().toISOString(),
      input: payload,
      duration: Math.round(duration),
    };
  }
}
