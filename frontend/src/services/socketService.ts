// services/socketService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';
import { authService } from './auth.service';

// Types pour les événements Socket
interface BaseSocketData {
  timestamp?: string;
  userId?: number;
}

// Événements de notification
interface NotificationEvents {
  'notification:new': (data: {
    id: number;
    type: string;
    titre: string;
    message: string;
    url_action?: string;
    priorite?: string;
  } & BaseSocketData) => void;
  
  'notification:mark_read': (data: {
    notificationId: number;
    success: boolean;
  }) => void;
  
  'notification:mark_all_read': (data: {
    success: boolean;
    count: number;
  }) => void;
}

// Événements admin
interface AdminEvents {
  'admin:activity': (data: {
    type: 'user_action' | 'content_action' | 'moderation' | 'system';
    action: string;
    user: {
      id: number;
      nom: string;
      prenom: string;
      avatar?: string;
    };
    target?: {
      type: string;
      id: number;
      name: string;
    };
    metadata?: any;
  } & BaseSocketData) => void;
  
  'admin:new_user': (data: {
    user: {
      id: number;
      nom: string;
      prenom: string;
      email: string;
      type_user: string;
      avatar?: string;
    };
  } & BaseSocketData) => void;
  
  'admin:content_created': (data: {
    user: {
      id: number;
      nom: string;
      prenom: string;
      avatar?: string;
    };
    content: {
      type: string;
      id: number;
      name: string;
    };
  } & BaseSocketData) => void;
  
  'admin:moderation_alert': (data: {
    type: 'signalement' | 'spam' | 'contenu_inapproprie';
    severity: 'low' | 'medium' | 'high' | 'critical';
    entity: {
      type: string;
      id: number;
      title: string;
    };
    reporter?: {
      id: number;
      nom: string;
    };
  } & BaseSocketData) => void;
  
  'admin:system_alert': (data: {
    type: 'performance' | 'security' | 'error' | 'maintenance';
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    details?: any;
  } & BaseSocketData) => void;

  'admin:presence_update': (data: {
    adminIds: number[];
  }) => void;
}

// Événements utilisateur
interface UserEvents {
  'user:online': (data: {
    userId: number;
    status: 'online' | 'away' | 'offline';
    lastSeen?: string;
  }) => void;
  
  'user:typing': (data: {
    userId: number;
    isTyping: boolean;
    context?: string;
  }) => void;
  
  'user:presence_update': (data: {
    onlineUsers: number[];
    totalOnline: number;
  }) => void;

  'user:get_presence': (data: {
    requestUserId: number;
  }) => void;
}

// Événements de contenu
interface ContentEvents {
  'content:new_oeuvre': (data: {
    oeuvre: {
      id: number;
      titre: string;
      type: string;
      auteur: {
        id: number;
        nom: string;
        prenom: string;
      };
    };
  } & BaseSocketData) => void;
  
  'content:new_comment': (data: {
    comment: {
      id: number;
      contenu: string;
      auteur: {
        id: number;
        nom: string;
        prenom: string;
      };
    };
    target: {
      type: 'oeuvre' | 'evenement' | 'site';
      id: number;
      title: string;
    };
  } & BaseSocketData) => void;
  
  'content:update': (data: {
    type: 'oeuvre' | 'evenement' | 'site';
    id: number;
    changes: any;
  } & BaseSocketData) => void;
}

// Événements d'événements (événements culturels)
interface EventEvents {
  'event:new': (data: {
    event: {
      id: number;
      titre: string;
      date_debut: string;
      lieu: string;
      organisateur: {
        id: number;
        nom: string;
      };
    };
  } & BaseSocketData) => void;
  
  'event:update': (data: {
    eventId: number;
    changes: any;
    notification?: string;
  } & BaseSocketData) => void;
  
  'event:cancelled': (data: {
    eventId: number;
    reason?: string;
    notification: string;
  } & BaseSocketData) => void;
  
  'event:reminder': (data: {
    event: {
      id: number;
      titre: string;
      date_debut: string;
      lieu: string;
    };
    timeUntilEvent: number;
  }) => void;
}

// Événements de chat/messagerie
interface ChatEvents {
  'chat:message': (data: {
    message: {
      id: string;
      content: string;
      sender: {
        id: number;
        nom: string;
        prenom: string;
        avatar?: string;
      };
      roomId: string;
      timestamp: string;
    };
  }) => void;
  
  'chat:room_update': (data: {
    roomId: string;
    action: 'user_joined' | 'user_left' | 'room_created' | 'room_deleted';
    user?: {
      id: number;
      nom: string;
    };
  }) => void;

  'chat:join_room': (data: {
    roomId: string;
    userId: number;
  }) => void;

  'chat:leave_room': (data: {
    roomId: string;
    userId: number;
  }) => void;
}

// Événements système
interface SystemEvents {
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
  'reconnect': (attemptNumber: number) => void;
  'reconnect_attempt': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
  'reconnect_failed': () => void;
  'error': (error: any) => void;
  'ping': () => void;
  'pong': (latency: number) => void;
}

// Type combiné de tous les événements
export type SocketEvents = NotificationEvents & 
  AdminEvents & 
  UserEvents & 
  ContentEvents & 
  EventEvents & 
  ChatEvents & 
  SystemEvents;

// Configuration du socket
interface SocketConfig {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: string[];
}

// Service Socket principal
class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig = {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private listeners: Map<string, Set<Function>> = new Map();
  private messageQueue: Array<{ event: string; data: any }> = [];
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  
  // État de connexion
  public isConnected = false;
  public connectionError: Error | null = null;
  
  // Callbacks
  private onConnectCallbacks: Set<() => void> = new Set();
  private onDisconnectCallbacks: Set<(reason: string) => void> = new Set();
  private onErrorCallbacks: Set<(error: Error) => void> = new Set();

  constructor() {
    this.setupAuthListener();
  }

  // Écouter les changements d'authentification
  private setupAuthListener() {
    // Écouter les événements d'authentification
    window.addEventListener('auth:login', () => {
      this.connect();
    });
    
    window.addEventListener('auth:logout', () => {
      this.disconnect();
    });
  }

  // Connexion au serveur
  async connect(token?: string): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return this.connectionPromise || Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Récupérer le token si non fourni
        const authToken = token || authService.getAuthToken();
        if (!authToken) {
          throw new Error('No authentication token');
        }

        // URL du serveur WebSocket
        const wsUrl = API_BASE_URL.replace('/api', '');
        
        // Créer la connexion
        this.socket = io(wsUrl, {
          ...this.config,
          auth: {
            token: authToken
          },
          query: {
            userId: authService.getCurrentUserId() || undefined
          }
        });

        // Gérer les événements de connexion
        this.socket.on('connect', () => {
          console.log('✅ Socket connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.connectionError = null;
          
          // Vider la queue des messages
          this.flushMessageQueue();
          
          // Notifier les callbacks
          this.onConnectCallbacks.forEach(cb => cb());
          
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
          this.isConnected = false;
          this.onDisconnectCallbacks.forEach(cb => cb(reason));
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.connectionError = error;
          this.isConnecting = false;
          this.onErrorCallbacks.forEach(cb => cb(error));
          reject(error);
        });

        // Réattacher tous les listeners existants
        this.reattachListeners();
        
      } catch (error) {
        this.isConnecting = false;
        this.connectionError = error as Error;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Déconnexion
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  // Écouter un événement (typage fort)
  on<K extends keyof SocketEvents>(
    event: K,
    handler: SocketEvents[K]
  ): void {
    // Ajouter à notre map interne
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Si le socket est connecté, attacher directement
    if (this.socket && this.isConnected) {
      this.socket.on(event, handler as any);
    }
  }

  // Retirer un listener
  off<K extends keyof SocketEvents>(
    event: K,
    handler?: SocketEvents[K]
  ): void {
    if (!handler) {
      // Retirer tous les handlers pour cet événement
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.removeAllListeners(event);
      }
    } else {
      // Retirer un handler spécifique
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      }
      if (this.socket) {
        this.socket.off(event, handler as any);
      }
    }
  }

  // Émettre un événement
  emit<K extends keyof SocketEvents>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0]
  ): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      // Ajouter à la queue si déconnecté
      this.messageQueue.push({ event, data });
    }
  }

  // Émettre et attendre une réponse
  async emitWithAck<K extends keyof SocketEvents, R = any>(
    event: K,
    data?: Parameters<SocketEvents[K]>[0],
    timeout = 5000
  ): Promise<R> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${event} acknowledgment`));
      }, timeout);

      this.socket!.emit(event, data, (response: R) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  // Réattacher les listeners après reconnexion
  private reattachListeners(): void {
    if (!this.socket) return;

    this.listeners.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket!.on(event, handler as any);
      });
    });
  }

  // Vider la queue des messages
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()!;
      this.emit(event as keyof SocketEvents, data);
    }
  }

  // Callbacks de connexion/déconnexion
  onConnect(callback: () => void): () => void {
    this.onConnectCallbacks.add(callback);
    return () => this.onConnectCallbacks.delete(callback);
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.onDisconnectCallbacks.add(callback);
    return () => this.onDisconnectCallbacks.delete(callback);
  }

  onError(callback: (error: Error) => void): () => void {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  // Joindre une room
  joinRoom(roomId: string): void {
    const user = authService.getCurrentUserFromCache();
    if (!user) {
      console.warn('Pas d\'utilisateur connecté pour joindre la room');
      return;
    }
    
    this.emit('chat:join_room', { 
      roomId, 
      userId: user.id_user
    });
  }

  // Quitter une room
  leaveRoom(roomId: string): void {
    const user = authService.getCurrentUserFromCache();
    if (!user) {
      console.warn('Pas d\'utilisateur connecté pour quitter la room');
      return;
    }
    
    this.emit('chat:leave_room', { 
      roomId, 
      userId: user.id_user
    });
  }

  // Obtenir la latence
  async getPing(): Promise<number> {
    const start = Date.now();
    await this.emitWithAck('ping');
    return Date.now() - start;
  }

  // Reconnecter manuellement
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  // Obtenir l'instance du socket (pour cas avancés)
  getSocket(): Socket | null {
    return this.socket;
  }

  // Méthode pour vérifier la présence d'un utilisateur
  checkUserPresence(userId: number): void {
    this.emit('user:get_presence', { requestUserId: userId });
  }

  // Méthode pour envoyer un indicateur de frappe
  sendTypingIndicator(context: string, isTyping: boolean): void {
    const user = authService.getCurrentUserFromCache();
    if (!user) return;
    
    this.emit('user:typing', {
      userId: user.id_user,
      isTyping,
      context
    });
  }
}

// Export du singleton
export const socketService = new SocketService();

// Export du type de configuration seulement
export type { SocketConfig };