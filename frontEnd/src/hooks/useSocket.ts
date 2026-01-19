// hooks/useSocket.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  emitWithAck: <K extends keyof SocketEvents, R = any>(
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
  
  const emitWithAck = useCallback(<K extends keyof SocketEvents, R = any>(
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

// Hook spécialisé pour les événements admin
export function useAdminSocket() {
  const socket = useSocket();
  const [activities, setActivities] = useState<any[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<number[]>([]);

  useEffect(() => {
    // Écouter les activités admin
    const handleActivity = (data: any) => {
      setActivities(prev => [data, ...prev].slice(0, 100)); // Garder les 100 dernières
    };

    const handleAdminPresence = (data: { adminIds: number[] }) => {
      setOnlineAdmins(data.adminIds);
    };

    socket.on('admin:activity', handleActivity);
    socket.on('admin:presence_update' as any, handleAdminPresence);

    return () => {
      socket.off('admin:activity', handleActivity);
      socket.off('admin:presence_update' as any);
    };
  }, [socket]);

  return {
    ...socket,
    activities,
    onlineAdmins
  };
}

// Hook pour un événement spécifique
export function useSocketEvent<K extends keyof SocketEvents>(
  event: K,
  handler: SocketEvents[K],
  deps: React.DependencyList = []
) {
  const socket = useSocket();

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, ...deps]);
}

// Hook pour la présence utilisateur
export function useUserPresence(userId?: number) {
  const socket = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    const handlePresenceUpdate = (data: any) => {
      if (data.userId === userId) {
        setIsOnline(data.status === 'online');
        if (data.status === 'offline' && data.lastSeen) {
          setLastSeen(new Date(data.lastSeen));
        }
      }
    };

    socket.on('user:online', handlePresenceUpdate);
    
    // Demander le statut initial
    socket.emit('user:presence_update' as any, { requestUserId: userId });

    return () => {
      socket.off('user:online', handlePresenceUpdate);
    };
  }, [socket, userId]);

  return { isOnline, lastSeen };
}

// Hook pour le chat
export function useChat(roomId: string) {
  const socket = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const typingTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Joindre la room
    socket.emit('chat:room_update' as any, { 
      roomId, 
      action: 'user_joined' 
    });

    // Gérer les messages
    const handleMessage = (data: any) => {
      if (data.message.roomId === roomId) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    // Gérer le typing
    const handleTyping = (data: any) => {
      if (data.context === roomId) {
        if (data.isTyping) {
          setTypingUsers(prev => new Set(prev).add(data.userId));
          
          // Clear previous timeout
          if (typingTimeouts.current.has(data.userId)) {
            clearTimeout(typingTimeouts.current.get(data.userId)!);
          }
          
          // Set new timeout to remove typing after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
            typingTimeouts.current.delete(data.userId);
          }, 3000);
          
          typingTimeouts.current.set(data.userId, timeout);
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
          
          if (typingTimeouts.current.has(data.userId)) {
            clearTimeout(typingTimeouts.current.get(data.userId)!);
            typingTimeouts.current.delete(data.userId);
          }
        }
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('user:typing', handleTyping);

    return () => {
      // Quitter la room
      socket.emit('chat:room_update' as any, { 
        roomId, 
        action: 'user_left' 
      });
      
      socket.off('chat:message', handleMessage);
      socket.off('user:typing', handleTyping);
      
      // Clear all typing timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, [socket, roomId]);

  const sendMessage = useCallback((content: string) => {
    socket.emit('chat:message', {
      message: {
        id: `temp-${Date.now()}`,
        content,
        roomId,
        timestamp: new Date().toISOString(),
        sender: {
          id: 0, // Sera remplacé côté serveur
          nom: 'Utilisateur', // Temporaire
          prenom: 'Temporaire' // Temporaire
          // avatar sera ajouté côté serveur si disponible
        }
      }
    });
  }, [socket, roomId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    socket.emit('user:typing', {
      userId: 0, // Sera rempli côté serveur
      isTyping,
      context: roomId
    });
  }, [socket, roomId]);

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    sendTyping
  };
}