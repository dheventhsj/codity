'use client';

import { io, Socket } from 'socket.io-client';
import { getApiBase } from './api';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(getApiBase(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function subscribeToProject(
  token: string,
  projectId: string,
  handlers: {
    onJobUpdate?: (data: unknown) => void;
    onWorkerUpdate?: (data: unknown) => void;
    onMetricsUpdate?: (data: unknown) => void;
  }
) {
  const s = getSocket(token);
  s.emit('subscribe:project', projectId);

  if (handlers.onJobUpdate) s.on('job:updated', handlers.onJobUpdate);
  if (handlers.onWorkerUpdate) s.on('worker:updated', handlers.onWorkerUpdate);
  if (handlers.onMetricsUpdate) s.on('metrics:updated', handlers.onMetricsUpdate);

  return () => {
    s.emit('unsubscribe:project', projectId);
    s.off('job:updated');
    s.off('worker:updated');
    s.off('metrics:updated');
  };
}
