import { QueueService } from '../src/services/queue.service';
import { ProjectService } from '../src/services/project.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  queue: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  retryPolicy: {
    findUnique: jest.fn(),
  },
  job: {
    groupBy: jest.fn(),
  },
} as unknown as PrismaClient;

describe('QueueService', () => {
  let queueService: QueueService;

  beforeEach(() => {
    queueService = new QueueService(mockPrisma);
    jest.spyOn(ProjectService.prototype, 'assertProjectAccess').mockResolvedValue({
      id: 'project-1',
      organizationId: 'org-1',
    } as never);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a queue for an existing project', async () => {
      (mockPrisma.queue.create as jest.Mock).mockResolvedValue({
        id: 'queue-1',
        name: 'email-queue',
        projectId: 'project-1',
        priority: 5,
        concurrency: 10,
        status: 'ACTIVE',
        _count: { jobs: 0 },
      });

      const result = await queueService.create('user-1', {
        name: 'email-queue',
        projectId: 'project-1',
        priority: 5,
        concurrency: 10,
      });

      expect(result.name).toBe('email-queue');
      expect(result.priority).toBe(5);
    });

    it('should throw when project access denied', async () => {
      jest.spyOn(ProjectService.prototype, 'assertProjectAccess').mockRejectedValue(
        new Error("Project with id 'nonexistent-project' not found")
      );

      await expect(
        queueService.create('user-1', {
          name: 'email-queue',
          projectId: 'nonexistent-project',
        })
      ).rejects.toThrow("Project with id 'nonexistent-project' not found");
    });
  });

  describe('findAll', () => {
    it('should return paginated queues', async () => {
      (mockPrisma.queue.findMany as jest.Mock).mockResolvedValue([
        { id: 'q1', name: 'queue-1', _count: { jobs: 5 } },
      ]);
      (mockPrisma.queue.count as jest.Mock).mockResolvedValue(1);

      const result = await queueService.findAll('user-1', 'project-1', {
        page: 1,
        limit: 20,
        skip: 0,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
