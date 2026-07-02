import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export function validateConfig(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
