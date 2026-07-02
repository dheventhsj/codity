import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Job Claimer Service
 * 
 * Design Decision: Atomic job claiming using SELECT ... FOR UPDATE SKIP LOCKED.
 * This PostgreSQL feature allows multiple workers to concurrently claim jobs
 * without conflicts:
 * 
 * 1. FOR UPDATE locks the selected rows
 * 2. SKIP LOCKED causes other transactions to skip already-locked rows
 * 3. Combined, this gives us exactly-once claiming without application-level locks
 * 
 * The query selects jobs that are:
 * - In QUEUED status (ready to run)
 * - In an ACTIVE queue (not paused/draining)
 * - Past their scheduled time (if scheduled)
 * - Not locked by another worker
 * 
 * Priority ordering ensures high-priority jobs are claimed first.
 */
export class JobClaimerService {
  constructor(private readonly prisma: PrismaClient) {}

  async claimJobs(
    workerId: string,
    projectId: string,
    batchSize: number
  ): Promise<string[]> {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 min lock TTL

    try {
      // Atomic claim using raw SQL with FOR UPDATE SKIP LOCKED
      const claimedJobs = await this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE jobs
        SET 
          status = 'CLAIMED',
          claimed_by = ${workerId},
          locked_until = ${lockUntil},
          updated_at = ${now}
        WHERE id IN (
          SELECT j.id
          FROM jobs j
          INNER JOIN queues q ON j.queue_id = q.id
          WHERE j.status IN ('QUEUED', 'RETRYING')
            AND q.project_id = ${projectId}
            AND q.status = 'ACTIVE'
            AND (j.scheduled_for IS NULL OR j.scheduled_for <= ${now})
            AND (j.locked_until IS NULL OR j.locked_until < ${now})
          ORDER BY j.priority DESC, j.created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE OF j SKIP LOCKED
        )
        RETURNING id
      `;

      const jobIds = claimedJobs.map((j) => j.id);

      if (jobIds.length > 0) {
        logger.info(`Claimed ${jobIds.length} jobs`, { workerId, jobIds });
      }

      return jobIds;
    } catch (error) {
      logger.error('Failed to claim jobs', { error, workerId });
      return [];
    }
  }
}
