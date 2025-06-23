// hooks/useNotifications.ts - Hook React pour gérer les notifications
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notification.service';
import type {
  Notification,
  NotificationSummary,
  NotificationPreferences,
  LoadNotificationsOptions,
  UpdatePreferencesData
} from '../types/models/notification.types';

// Types pour les événements de notification
type NotificationEventMap = {
  'notification:new': Notification;
  'notification:updated': { id: number; lu: boolean };
  'notifications:allRead': void;
};

interface UseNotificationsReturn {
  // État
  notifications: Notification[];
  summary: NotificationSummary | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Méthodes
  loadNotifications: (options?: LoadNotificationsOptions) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  updatePreferences: (preferences: UpdatePreferencesData) => Promise<void>;
  refreshSummary: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  // État local
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Ref pour éviter les re-rendus inutiles
  const isMountedRef = useRef(true);

  // Fonction utilitaire pour les appels sécurisés
  const safeCall = useCallback(async (fn: () => Promise<void>) => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      await fn();
    } catch (err: any) {
      if (isMountedRef.current) {
        const errorMessage = err.message || 'Une erreur est survenue';
        setError(errorMessage);
        console.error('Erreur notification:', err);
      }
    }
  }, []);

  // Charger les notifications
  const loadNotifications = useCallback(async (options: LoadNotificationsOptions = {}) => {
    await safeCall(async () => {
      setIsLoading(true);
      try {
        const response = await notificationService.getNotifications(options);
        if (isMountedRef.current) {
          setNotifications(response.notifications);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    });
  }, [safeCall]);

  // Rafraîchir le résumé
  const refreshSummary = useCallback(async () => {
    await safeCall(async () => {
      const newSummary = await notificationService.getSummary();
      if (isMountedRef.current) {
        setSummary(newSummary);
      }
    });
  }, [safeCall]);

  // Marquer comme lu
  const markAsRead = useCallback(async (notificationId: number) => {
    await safeCall(async () => {
      await notificationService.markAsRead(notificationId);
      
      // Mettre à jour l'état local immédiatement
      if (isMountedRef.current) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id_notification === notificationId 
              ? { ...notif, lu: true } 
              : notif
          )
        );
        
        // Mettre à jour le résumé
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nonLues: Math.max(0, prev.nonLues - 1)
          };
        });
      }
    });
  }, [safeCall]);

  // Marquer tout comme lu
  const markAllAsRead = useCallback(async () => {
    await safeCall(async () => {
      const result = await notificationService.markAllAsRead();
      
      // Mettre à jour l'état local
      if (isMountedRef.current) {
        setNotifications(prev => prev.map(notif => ({ ...notif, lu: true })));
        
        // Mettre à jour le résumé
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nonLues: 0
          };
        });
      }
      
      console.log(`${result.updated} notifications marquées comme lues`);
    });
  }, [safeCall]);

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    await safeCall(async () => {
      await notificationService.deleteNotification(notificationId);
      
      // Mettre à jour l'état local
      if (isMountedRef.current) {
        setNotifications(prev => prev.filter(n => n.id_notification !== notificationId));
        
        // Rafraîchir le résumé
        await refreshSummary();
      }
    });
  }, [safeCall, refreshSummary]);

  // Supprimer toutes les lues
  const deleteAllRead = useCallback(async () => {
    await safeCall(async () => {
      const result = await notificationService.deleteAllRead();
      
      // Mettre à jour l'état local
      if (isMountedRef.current) {
        setNotifications(prev => prev.filter(n => !n.lu));
      }
      
      console.log(`${result.deleted} notifications supprimées`);
    });
  }, [safeCall]);

  // Mettre à jour les préférences
  const updatePreferences = useCallback(async (preferences: UpdatePreferencesData) => {
    await safeCall(async () => {
      await notificationService.updatePreferences(preferences);
    });
  }, [safeCall]);

  // Demander la permission pour les notifications navigateur
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      return await notificationService.requestBrowserPermission();
    } catch (error) {
      console.error('Erreur permission notifications:', error);
      return false;
    }
  }, []);

  // Configuration WebSocket avec une approche alternative
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Se connecter au WebSocket
    socketService.connect(token);

    // Créer un wrapper pour écouter les événements de manière type-safe
    const addEventListener = <K extends keyof NotificationEventMap>(
      event: K,
      handler: (data: NotificationEventMap[K]) => void
    ) => {
      // Si socketService.on accepte seulement certains types, on peut essayer différentes approches
      try {
        // Approche 1: Cast vers un type plus général
        (socketService as any).on(event, handler);
      } catch (error) {
        console.warn(`Impossible d'écouter l'événement ${event}:`, error);
      }
    };

    // Gérer l'état de connexion via polling
    const connectionCheckInterval = setInterval(() => {
      const connected = socketService.isConnected || false;
      setIsConnected(connected);
      
      if (connected && !isConnected) {
        console.log('✅ WebSocket connecté pour les notifications');
      } else if (!connected && isConnected) {
        console.log('❌ WebSocket déconnecté');
      }
    }, 1000);

    // Handlers pour les événements de notification
    const handlers = {
      'notification:new': (notification: Notification) => {
        console.log('🔔 Nouvelle notification reçue:', notification);
        
        setNotifications(prev => [notification, ...prev]);
        
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            total: prev.total + 1,
            nonLues: prev.nonLues + 1
          };
        });
        
        notificationService.showBrowserNotification(notification);
      },
      
      'notification:updated': (data: { id: number; lu: boolean }) => {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id_notification === data.id
              ? { ...notif, lu: data.lu }
              : notif
          )
        );
        
        if (data.lu) {
          setSummary(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              nonLues: Math.max(0, prev.nonLues - 1)
            };
          });
        }
      },
      
      'notifications:allRead': () => {
        setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nonLues: 0
          };
        });
      }
    };

    // Enregistrer les événements
    Object.entries(handlers).forEach(([event, handler]) => {
      addEventListener(event as keyof NotificationEventMap, handler as any);
    });

    // Charger les données initiales
    const initData = async () => {
      try {
        await Promise.all([
          loadNotifications({ limit: 20 }),
          refreshSummary()
        ]);
      } catch (error) {
        console.error('Erreur initialisation notifications:', error);
      }
    };

    initData();

    // Nettoyage
    return () => {
      clearInterval(connectionCheckInterval);
      
      // Essayer de se désinscrire des événements
      if ('off' in socketService) {
        Object.keys(handlers).forEach(event => {
          try {
            (socketService as any).off(event);
          } catch (error) {
            console.warn(`Erreur lors de la désinscription de ${event}:`, error);
          }
        });
      }
      
      socketService.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rafraîchir le résumé périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      if (!error && isConnected) {
        refreshSummary();
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [refreshSummary, error, isConnected]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    notifications,
    summary,
    isLoading,
    error,
    isConnected,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    updatePreferences,
    refreshSummary,
    requestNotificationPermission
  };
}