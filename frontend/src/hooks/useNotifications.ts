// hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuthForNotifications } from '@/hooks/useAuthForNotifications';
import NotificationService from '@/services/notification.service';
import {
  Notification,
  NotificationSummary,
  NotificationPreferences,
  NotificationFilters,
  NotificationType,
  MarkAsReadDto,
} from '@/types/Notification.types';
import { PaginationParams } from '@/config/api';

interface UseNotificationsReturn {
  // État
  notifications: Notification[];
  summary: NotificationSummary | null;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  total: number;
  page: number;
  pages: number;
  limit: number;
  
  // Actions
  fetchNotifications: (params?: PaginationParams & NotificationFilters) => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markMultipleAsRead: (ids: number[]) => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Helpers
  hasUnread: boolean;
  unreadCount: number;
  urgentCount: number;
  getNotificationsByType: (type: NotificationType) => Notification[];
}

export const useNotifications = (): UseNotificationsReturn => {
  const { token } = useAuthForNotifications();
  
  // État principal
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État de pagination
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(10);

  /**
   * Récupère la liste des notifications
   */
  const fetchNotifications = useCallback(async (
    params?: PaginationParams & NotificationFilters
  ) => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await NotificationService.getNotifications(token, params);
      
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotal(response.data.total);
        setPage(response.data.page);
        setPages(response.data.pages);
        setLimit(response.data.limit);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des notifications');
      console.error('Erreur fetchNotifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  /**
   * Récupère le résumé des notifications
   */
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await NotificationService.getSummary(token);
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Erreur fetchSummary:', err);
    }
  }, [token]);

  /**
   * Récupère les préférences
   */
  const fetchPreferences = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await NotificationService.getPreferences(token);
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err: any) {
      console.error('Erreur fetchPreferences:', err);
    }
  }, [token]);

  /**
   * Marque une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    if (!token) return;
    
    try {
      await NotificationService.markAsRead(token, notificationId);
      
      // Mise à jour locale
      setNotifications(prev =>
        prev.map(n => 
          n.id_notification === notificationId 
            ? { ...n, lu: true, date_lecture: new Date().toISOString() }
            : n
        )
      );
      
      // Mise à jour du résumé
      await fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage comme lu');
      throw err;
    }
  }, [token, fetchSummary]);

  /**
   * Marque toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      await NotificationService.markAllAsRead(token);
      
      // Mise à jour locale
      setNotifications(prev =>
        prev.map(n => ({ 
          ...n, 
          lu: true, 
          date_lecture: new Date().toISOString() 
        }))
      );
      
      // Mise à jour du résumé
      await fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage comme lues');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchSummary]);

  /**
   * Marque plusieurs notifications comme lues
   */
  const markMultipleAsRead = useCallback(async (ids: number[]) => {
    if (!token || ids.length === 0) return;
    
    try {
      const dto: MarkAsReadDto = { notification_ids: ids };
      await NotificationService.markMultipleAsRead(token, dto);
      
      // Mise à jour locale
      setNotifications(prev =>
        prev.map(n => 
          ids.includes(n.id_notification)
            ? { ...n, lu: true, date_lecture: new Date().toISOString() }
            : n
        )
      );
      
      // Mise à jour du résumé
      await fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage comme lues');
      throw err;
    }
  }, [token, fetchSummary]);

  /**
   * Supprime une notification
   */
  const deleteNotification = useCallback(async (notificationId: number) => {
    if (!token) return;
    
    try {
      await NotificationService.deleteNotification(token, notificationId);
      
      // Mise à jour locale
      setNotifications(prev => 
        prev.filter(n => n.id_notification !== notificationId)
      );
      
      // Mise à jour du résumé
      await fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
      throw err;
    }
  }, [token, fetchSummary]);

  /**
   * Supprime toutes les notifications lues
   */
  const deleteAllRead = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      await NotificationService.deleteAllRead(token);
      
      // Mise à jour locale
      setNotifications(prev => prev.filter(n => !n.lu));
      
      // Mise à jour du résumé
      await fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchSummary]);

  /**
   * Met à jour les préférences
   */
  const updatePreferences = useCallback(async (
    prefs: Partial<NotificationPreferences>
  ) => {
    if (!token) return;
    
    try {
      const response = await NotificationService.updatePreferences(token, prefs);
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour des préférences');
      throw err;
    }
  }, [token]);

  /**
   * Rafraîchit toutes les données
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchNotifications(),
      fetchSummary(),
      fetchPreferences(),
    ]);
  }, [fetchNotifications, fetchSummary, fetchPreferences]);

  /**
   * Filtre les notifications par type
   */
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type_notification === type);
  }, [notifications]);

  // Chargement initial
  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token]);

  // Helpers calculés
  const hasUnread = (summary?.non_lues ?? 0) > 0;
  const unreadCount = summary?.non_lues ?? 0;
  const urgentCount = summary?.urgentes ?? 0;

  return {
    // État
    notifications,
    summary,
    preferences,
    isLoading,
    error,
    
    // Pagination
    total,
    page,
    pages,
    limit,
    
    // Actions
    fetchNotifications,
    fetchSummary,
    fetchPreferences,
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
    deleteNotification,
    deleteAllRead,
    updatePreferences,
    refreshAll,
    
    // Helpers
    hasUnread,
    unreadCount,
    urgentCount,
    getNotificationsByType,
  };
};

/**
 * Hook pour le polling des notifications
 */
export const useNotificationPolling = (
  intervalMs: number = 30000 // 30 secondes par défaut
) => {
  const { token } = useAuthForNotifications();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const checkNotifications = async () => {
      try {
        const hasUnread = await NotificationService.hasUnreadNotifications(token);
        const response = await NotificationService.getSummary(token);
        
        if (response.success && response.data) {
          setUnreadCount(response.data.non_lues);
          setLastCheck(new Date());
        }
      } catch (error) {
        console.error('Erreur polling notifications:', error);
      }
    };

    // Vérification initiale
    checkNotifications();

    // Mise en place du polling
    const interval = setInterval(checkNotifications, intervalMs);

    return () => clearInterval(interval);
  }, [token, intervalMs]);

  return {
    unreadCount,
    lastCheck,
  };
};

export default useNotifications;