import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { OrganizationService } from './organization.service';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  private readonly orgService: OrganizationService;

  constructor(private readonly prisma: PrismaClient) {
    this.orgService = new OrganizationService(prisma);
  }

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
      },
    });

    const org = await this.orgService.createForUser(
      user.id,
      input.organizationName ?? `${input.name}'s Organization`
    );

    const token = this.generateToken(user.id, user.email);

    logger.info('User registered', { userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: org,
      token,
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isValidPassword = await bcrypt.compare(input.password, user.password);
    if (!isValidPassword) throw new UnauthorizedError('Invalid email or password');

    const token = this.generateToken(user.id, user.email);
    const organizations = await this.orgService.findAllForUser(user.id);

    logger.info('User logged in', { userId: user.id });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organizations,
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign({ id: userId, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}
