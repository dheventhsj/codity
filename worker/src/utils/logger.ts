import winston from 'winston';
import { workerConfig } from '../config';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: workerConfig.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'codity-worker', worker: workerConfig.worker.name },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
  ],
});
