import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: string; email: string; name: string };
  token: string;
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
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

    const token = this.generateToken(user.id, user.email);

    logger.info('User registered', { userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);

    logger.info('User logged in', { userId: user.id });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign({ id: userId, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}
