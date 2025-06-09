// contexts/NotificationContext.tsx

// contexts/NotificationContext.tsx

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useNotificationPolling } from '@/hooks/useNotifications';
import { useAuthForNotifications } from '@/hooks/useAuthForNotifications';
import NotificationService from '@/services/notification.service';
import type { Notification } from '@/types/Notification.types';

interface NotificationContextType {
  unreadCount: number;
  lastCheck: Date;
  showNotification: (notification: Partial<Notification>) => void;
  checkForNewNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  pollingInterval?: number; // en millisecondes
  enableSound?: boolean;
  enableDesktopNotifications?: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  pollingInterval = 30000, // 30 secondes par défaut
  enableSound = true,
  enableDesktopNotifications = true,
}) => {
  const { token, user } = useAuthForNotifications();
  const { unreadCount, lastCheck } = useNotificationPolling(pollingInterval);

  // Demander la permission pour les notifications desktop
  useEffect(() => {
    if (enableDesktopNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableDesktopNotifications]);

  // Son de notification
  const playNotificationSound = useCallback(() => {
    if (enableSound) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.error('Erreur lors de la lecture du son:', err));
    }
  }, [enableSound]);

  // Afficher une notification desktop
  const showDesktopNotification = useCallback((notification: Partial<Notification>) => {
    if (
      enableDesktopNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden // Seulement si l'onglet n'est pas actif
    ) {
      const n = new Notification(notification.titre || 'Nouvelle notification', {
        body: notification.message || '',
        icon: '/favicon.ico',
        badge: '/badge.png',
        tag: notification.id_notification?.toString() || 'notification',
        requireInteraction: notification.priorite === 'urgente',
      });

      n.onclick = () => {
        window.focus();
        if (notification.url_action) {
          window.location.href = notification.url_action;
        }
        n.close();
      };
    }
  }, [enableDesktopNotifications]);

  // Afficher une notification (toast + desktop + son)
  const showNotification = useCallback((notification: Partial<Notification>) => {
    // Afficher un toast (vous pouvez utiliser votre système de toast préféré)
    console.log('Nouvelle notification:', notification);
    
    // Jouer le son
    playNotificationSound();
    
    // Afficher la notification desktop
    showDesktopNotification(notification);
  }, [playNotificationSound, showDesktopNotification]);

  // Vérifier les nouvelles notifications
  const checkForNewNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await NotificationService.getNotifications(token, {
        limit: 5,
        lu: false,
        sort: 'date_creation',
        order: 'desc',
      });

      if (response.success && response.data) {
        // Comparer avec les notifications précédentes pour détecter les nouvelles
        const newNotifications = response.data.notifications.filter(n => {
          const createdAt = new Date(n.date_creation);
          return createdAt > lastCheck;
        });

        // Afficher les nouvelles notifications
        newNotifications.forEach(notification => {
          showNotification(notification);
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications:', error);
    }
  }, [token, lastCheck, showNotification]);

  // Vérifier les nouvelles notifications à chaque changement du count
  useEffect(() => {
    if (unreadCount > 0) {
      checkForNewNotifications();
    }
  }, [unreadCount, checkForNewNotifications]);

  // Écouter les événements de visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        // La page est redevenue visible, vérifier les notifications
        checkForNewNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, checkForNewNotifications]);

  const value: NotificationContextType = {
    unreadCount,
    lastCheck,
    showNotification,
    checkForNewNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

// Hook pour déclencher manuellement une notification
export const useTriggerNotification = () => {
  const { showNotification } = useNotificationContext();
  
  return {
    success: (titre: string, message: string, url?: string) => {
      showNotification({
        titre,
        message,
        url_action: url,
        type_notification: 'message_admin',
        priorite: 'normale',
      });
    },
    error: (titre: string, message: string) => {
      showNotification({
        titre,
        message,
        type_notification: 'message_admin',
        priorite: 'haute',
      });
    },
    info: (titre: string, message: string, url?: string) => {
      showNotification({
        titre,
        message,
        url_action: url,
        type_notification: 'message_admin',
        priorite: 'normale',
      });
    },
    urgent: (titre: string, message: string, url?: string) => {
      showNotification({
        titre,
        message,
        url_action: url,
        type_notification: 'message_admin',
        priorite: 'urgente',
      });
    },
  };
};

// Composant Badge pour afficher le nombre de notifications non lues
interface NotificationBadgeProps {
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className = '' }) => {
  const { unreadCount } = useNotificationContext();

  if (unreadCount === 0) return null;

  return (
    <span className={`
      inline-flex items-center justify-center 
      bg-red-500 text-white text-xs font-bold 
      rounded-full h-5 w-5 animate-pulse
      ${className}
    `}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default NotificationProvider;