import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export type RealtimeEvent =
  | 'job:updated'
  | 'job:created'
  | 'worker:updated'
  | 'queue:updated'
  | 'metrics:updated'
  | 'notification:new';

export class RealtimeService {
  private io: Server | null = null;

  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      path: '/socket.io',
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token as string;
      if (!token) return next(new Error('Authentication required'));

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
        socket.data.user = decoded;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info('Socket connected', { userId: socket.data.user?.id, socketId: socket.id });

      socket.on('subscribe:project', (projectId: string) => {
        socket.join(`project:${projectId}`);
      });

      socket.on('unsubscribe:project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
      });

      socket.on('disconnect', () => {
        logger.debug('Socket disconnected', { socketId: socket.id });
      });
    });

    logger.info('Socket.IO initialized');
    return this.io;
  }

  emitToProject(projectId: string, event: RealtimeEvent, data: unknown) {
    this.io?.to(`project:${projectId}`).emit(event, data);
  }

  emitJobUpdate(projectId: string, job: unknown) {
    this.emitToProject(projectId, 'job:updated', job);
  }

  emitWorkerUpdate(projectId: string, worker: unknown) {
    this.emitToProject(projectId, 'worker:updated', worker);
  }

  emitMetricsUpdate(projectId: string, metrics: unknown) {
    this.emitToProject(projectId, 'metrics:updated', metrics);
  }
}

export const realtimeService = new RealtimeService();
