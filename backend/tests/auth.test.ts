import { AuthService } from '../src/services/auth.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw ConflictError if user already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: '$2a$12$invalidhash',
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
