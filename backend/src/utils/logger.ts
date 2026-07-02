import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'codity-api' },
  transports: [
    new winston.transports.Console({
      format:
        config.nodeEnv === 'development'
          ? combine(colorize(), simple())
          : combine(timestamp(), json()),
    }),
  ],
});
