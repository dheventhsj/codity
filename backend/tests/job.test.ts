import { JobService } from '../src/services/job.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  queue: {
    findUnique: jest.fn(),
  },
  job: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  deadLetterQueue: {
    deleteMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('JobService', () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = new JobService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an immediate job', async () => {
      (mockPrisma.queue.findUnique as jest.Mock).mockResolvedValue({
        id: 'queue-1',
        status: 'ACTIVE',
        project: { userId: 'user-1' },
      });

      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      (mockPrisma.job.create as jest.Mock).mockResolvedValue({
        id: 'job-1',
        name: 'send-email',
        type: 'IMMEDIATE',
        status: 'QUEUED',
        queueId: 'queue-1',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
      });

      const result = await jobService.create('user-1', {
        queueId: 'queue-1',
        name: 'send-email',
        payload: { to: 'user@example.com' },
      });

      expect(result.name).toBe('send-email');
      expect(result.status).toBe('QUEUED');
      expect(result.type).toBe('IMMEDIATE');
    });

    it('should reject jobs for non-existent queue', async () => {
      (mockPrisma.queue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        jobService.create('user-1', {
          queueId: 'nonexistent',
          name: 'test-job',
        })
      ).rejects.toThrow("Queue with id 'nonexistent' not found");
    });

    it('should reject jobs for draining queue', async () => {
      (mockPrisma.queue.findUnique as jest.Mock).mockResolvedValue({
        id: 'queue-1',
        status: 'DRAINING',
        project: { userId: 'user-1' },
      });

      await expect(
        jobService.create('user-1', {
          queueId: 'queue-1',
          name: 'test-job',
        })
      ).rejects.toThrow('Queue is draining and not accepting new jobs');
    });

    it('should return existing job for duplicate idempotency key', async () => {
      (mockPrisma.queue.findUnique as jest.Mock).mockResolvedValue({
        id: 'queue-1',
        status: 'ACTIVE',
        project: { userId: 'user-1' },
      });

      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-job',
        name: 'send-email',
        idempotencyKey: 'unique-key-1',
      });

      const result = await jobService.create('user-1', {
        queueId: 'queue-1',
        name: 'send-email',
        idempotencyKey: 'unique-key-1',
      });

      expect(result.id).toBe('existing-job');
      expect(mockPrisma.job.create).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('should retry a failed job', async () => {
      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-1',
        status: 'FAILED',
        queue: { project: { userId: 'user-1' } },
      });

      (mockPrisma.job.update as jest.Mock).mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
        attempts: 0,
      });

      (mockPrisma.deadLetterQueue.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await jobService.retry('user-1', 'job-1');
      expect(result.status).toBe('QUEUED');
    });

    it('should reject retry for non-failed job', async () => {
      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        queue: { project: { userId: 'user-1' } },
      });

      await expect(
        jobService.retry('user-1', 'job-1')
      ).rejects.toThrow('Only failed or dead jobs can be retried');
    });
  });
});
