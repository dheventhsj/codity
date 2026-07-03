import { JobService } from '../src/services/job.service';
import { ProjectService } from '../src/services/project.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  queue: {
    findUnique: jest.fn(),
  },
  job: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  deadLetterQueue: {
    deleteMany: jest.fn(),
  },
} as unknown as PrismaClient;

jest.mock('../src/repositories/job.repository', () => ({
  JobRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: jest.fn(),
  })),
}));

describe('JobService', () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = new JobService(mockPrisma);
    jest.spyOn(ProjectService.prototype, 'assertProjectAccess').mockResolvedValue({
      id: 'project-1',
    } as never);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an immediate job', async () => {
      (mockPrisma.queue.findUnique as jest.Mock).mockResolvedValue({
        id: 'queue-1',
        status: 'ACTIVE',
        name: 'test-queue',
        project: { id: 'project-1' },
      });
      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.job.create as jest.Mock).mockResolvedValue({
        id: 'job-1',
        name: 'send-email',
        type: 'IMMEDIATE',
        status: 'QUEUED',
      });

      const result = await jobService.create('user-1', {
        queueId: 'queue-1',
        name: 'send-email',
      });

      expect(result.status).toBe('QUEUED');
    });
  });

  describe('retry', () => {
    it('should retry a failed job', async () => {
      (mockPrisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-1',
        status: 'FAILED',
        queue: { projectId: 'project-1' },
      });
      (mockPrisma.job.update as jest.Mock).mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
      });
      (mockPrisma.deadLetterQueue.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await jobService.retry('user-1', 'job-1');
      expect(result.status).toBe('QUEUED');
    });
  });
});
