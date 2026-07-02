import { PrismaClient, RetryStrategy } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export interface CreateRetryPolicyInput {
  name: string;
  strategy?: RetryStrategy;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export interface RetryPolicyResponse {
  id: string;
  name: string;
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  createdAt: Date;
}

export class RetryPolicyService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateRetryPolicyInput): Promise<RetryPolicyResponse> {
    return this.prisma.retryPolicy.create({
      data: {
        name: input.name,
        strategy: input.strategy ?? 'EXPONENTIAL',
        maxRetries: input.maxRetries ?? 3,
        baseDelay: input.baseDelay ?? 1000,
        maxDelay: input.maxDelay ?? 300000,
      },
    });
  }

  async findAll(): Promise<RetryPolicyResponse[]> {
    return this.prisma.retryPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<RetryPolicyResponse> {
    const policy = await this.prisma.retryPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundError('RetryPolicy', id);
    }

    return policy;
  }
}
