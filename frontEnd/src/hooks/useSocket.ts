// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService, SocketEvents } from '@/services/socketService';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  connectionError: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  on: <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => void;
  off: <K extends keyof SocketEvents>(event: K, handler?: SocketEvents[K]) => void;
  emit: <K extends keyof SocketEvents>(event: K, data?: Parameters<SocketEvents[K]>[0]) => void;
  emitWithAck: <K extends keyof SocketEvents, R = unknown>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0],
    timeout?: number
  ) => Promise<R>;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(socketService.isConnected);
  const [connectionError, setConnectionError] = useState<Error | null>(socketService.connectionError);
  
  // Refs pour stocker les callbacks
  const cleanupFns = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Setup des callbacks de connexion
    if (onConnect) {
      const cleanup = socketService.onConnect(() => {
        setIsConnected(true);
        setConnectionError(null);
        onConnect();
      });
      cleanupFns.current.push(cleanup);
    } else {
      const cleanup = socketService.onConnect(() => {
        setIsConnected(true);
        setConnectionError(null);
      });
      cleanupFns.current.push(cleanup);
    }

    // Setup des callbacks de déconnexion
    if (onDisconnect) {
      const cleanup = socketService.onDisconnect((reason) => {
        setIsConnected(false);
        onDisconnect(reason);
      });
      cleanupFns.current.push(cleanup);
    } else {
      const cleanup = socketService.onDisconnect(() => {
        setIsConnected(false);
      });
      cleanupFns.current.push(cleanup);
    }

    // Setup des callbacks d'erreur
    if (onError) {
      const cleanup = socketService.onError((error) => {
        setConnectionError(error);
        onError(error);
      });
      cleanupFns.current.push(cleanup);
    } else {
      const cleanup = socketService.onError((error) => {
        setConnectionError(error);
      });
      cleanupFns.current.push(cleanup);
    }

    // Auto-connexion si demandée
    if (autoConnect && !socketService.isConnected) {
      socketService.connect().catch(console.error);
    }

    // Cleanup
    return () => {
      cleanupFns.current.forEach(cleanup => cleanup());
      cleanupFns.current = [];
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  // Méthodes exposées
  const connect = useCallback(() => socketService.connect(), []);
  const disconnect = useCallback(() => socketService.disconnect(), []);
  
  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler: SocketEvents[K]
  ) => {
    socketService.on(event, handler);
  }, []);
  
  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler?: SocketEvents[K]
  ) => {
    socketService.off(event, handler);
  }, []);
  
  const emit = useCallback(<K extends keyof SocketEvents>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0]
  ) => {
    socketService.emit(event, data);
  }, []);
  
  const emitWithAck = useCallback(<K extends keyof SocketEvents, R = unknown>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0],
    timeout?: number
  ): Promise<R> => {
    return socketService.emitWithAck<K, R>(event, data, timeout);
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    on,
    off,
    emit,
    emitWithAck
  };
}