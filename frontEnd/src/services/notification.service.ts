// services/notificationService.unified.ts - Service unifié pour les notifications
import { API_ENDPOINTS } from '@/config/api';
import { httpClient } from './httpClient';
import { Notification, NotificationAPI, NotificationSummary, NotificationSummaryAPI, NotificationPreferences, NotificationListResponse, LoadNotificationsOptions, UpdatePreferencesData, mapAPIToNotification, mapAPISummaryToSummary } from '../types/models/notification.types';
import { messageErreurServeur } from '@/utils/erreurServeur';
import i18next from 'i18next';
// Copiez-collez ceci à la FIN de notification.service.ts
// Remplacez la section export type { ... } existante

export type { 
  Notification,
  NotificationSummary,
  NotificationPreferences,
  NotificationListResponse,
  WebSocketStatus,
  TestEmailType,
  UpdatePreferencesData,
  BroadcastNotificationData
} from '../types/models/notification.types';
class UnifiedNotificationService {
  // ================================================
  // MÉTHODES PRINCIPALES
  // ================================================

  /**
   * Récupérer la liste des notifications
   */
  /**
 * Récupérer la liste des notifications
 */
async getNotifications(
  options: LoadNotificationsOptions = {}
): Promise<NotificationListResponse> {
  try {
    const params: Record<string, string | number | boolean> = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    if (options.nonLues !== undefined) params.nonLues = options.nonLues;
    if (options.type) params.type = options.type;

    const response = await httpClient.get<NotificationListResponse>(API_ENDPOINTS.notifications.list, params);

    if (!response.success) {
      return {
        notifications: [],
        pagination: { total: 0, page: options.page || 1, pages: 0, limit: options.limit || 20 },
        stats: { nonLues: 0, total: 0 }
      };
    }

    const data = response.data;
    return {
      notifications: (data?.notifications || data?.items || []).map((n: NotificationAPI) => mapAPIToNotification(n)),
      pagination: data?.pagination || { total: 0, page: options.page || 1, pages: 0, limit: options.limit || 20 },
      stats: data?.stats || { nonLues: 0, total: 0 }
    };
  } catch (error: unknown) {
    return {
      notifications: [],
      pagination: { total: 0, page: options.page || 1, pages: 0, limit: options.limit || 20 },
      stats: { nonLues: 0, total: 0 }
    };
  }
}
  /**
   * Récupérer le résumé des notifications
   */
  async getSummary(): Promise<NotificationSummary> {
    try {
      const response = await httpClient.get<NotificationSummaryAPI | NotificationSummary>(API_ENDPOINTS.notifications.summary);

      if (!response.success) {
        return { total: 0, nonLues: 0, parType: {}, dernieres: [] };
      }

      const data = response.data;

      if (data && data.nonLues !== undefined) {
        return data;
      }

      if (data && data.total_unread !== undefined) {
        return mapAPISummaryToSummary(data);
      }

      return { total: 0, nonLues: 0, parType: {}, dernieres: [] };
    } catch (error) {
      return {
        total: 0,
        nonLues: 0,
        parType: {},
        dernieres: []
      };
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: number): Promise<void> {
    try {
      const response = await httpClient.put<void>(
        API_ENDPOINTS.notifications.markAsRead(notificationId)
      );

      if (!response.success) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }

      // ✅ Correction : Utiliser l'événement correct ou commenter si non nécessaire
      // Note: Vérifiez les événements disponibles dans vos types socketService
      // Exemples d'événements possibles :
      // - 'notification:markAsRead'
      // - 'notificationRead'
      // - 'markNotificationAsRead'
      
      // Pour l'instant, on commente car l'événement n'existe pas
      /*
      if (socketService.isConnected) {
        if (typeof socketService.emit === 'function') {
          socketService.emit('notification:read', { notificationId });
        }
      }
      */
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(): Promise<{ updated: number }> {
    try {
      const response = await httpClient.put<{ updated_count?: number; updated?: number }>(
        API_ENDPOINTS.notifications.markAllAsRead
      );

      if (!response.success) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }

      // ✅ Correction : Commenter l'émission socket non définie
      /*
      if (socketService.isConnected) {
        if (typeof socketService.emit === 'function') {
          socketService.emit('notification:read-all');
        }
      }
      */

      return {
        updated: response.data?.updated || response.data?.updated_count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: number): Promise<void> {
    try {
      const response = await httpClient.delete<void>(
        API_ENDPOINTS.notifications.delete(notificationId)
      );

      if (!response.success) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer toutes les notifications lues
   */
  async deleteAllRead(): Promise<{ deleted: number }> {
    try {
      const response = await httpClient.delete<{ deleted_count?: number; deleted?: number }>(
        API_ENDPOINTS.notifications.deleteRead
      );

      if (!response.success) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }

      return {
        deleted: response.data?.deleted || response.data?.deleted_count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer les préférences de notification
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await httpClient.get<NotificationPreferences>(
        API_ENDPOINTS.notifications.preferences
      );

      if (!response.success || !response.data) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }

      // Format du serveur ; valeurs absentes : oui, sauf la newsletter (accord préalable)
      const d = response.data as Partial<NotificationPreferences>;
      return {
        global: {
          email: d.global?.email ?? true,
          push: d.global?.push ?? true,
          newsletter: d.global?.newsletter === true
        },
        types: {
          evenements: d.types?.evenements ?? true,
          commentaires: d.types?.commentaires ?? true,
          favoris: d.types?.favoris ?? true
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour les préférences
   */
  async updatePreferences(
    preferences: UpdatePreferencesData
  ): Promise<NotificationPreferences> {
    try {
      const response = await httpClient.put<NotificationPreferences>(
        API_ENDPOINTS.notifications.updatePreferences,
        preferences
      );

      if (!response.success) {
        throw new Error(messageErreurServeur(response, i18next.t('common.errorOccurred', 'Une erreur est survenue')));
      }

      // Le serveur renvoie les préférences enregistrées (sinon, on les relit)
      return response.data ? response.data : this.getPreferences();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Afficher une notification navigateur
   */
  showBrowserNotification(notification: Notification): void {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(notification.titre, {
        body: notification.message,
        icon: '/icon-192x192.png',
        tag: `notification-${notification.id_notification}`,
        requireInteraction: notification.priorite === 'urgente'
      });
    }
  }
}

// Export de l'instance singleton
export const notificationService = new UnifiedNotificationService();

// Export du type pour l'injection de dépendances
export type { UnifiedNotificationService };