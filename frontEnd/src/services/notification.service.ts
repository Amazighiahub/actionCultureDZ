// services/notificationService.unified.ts - Service unifié pour les notifications
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginationParams, getApiUrl, getAuthHeaders } from '@/config/api';
import { httpClient } from './httpClient';
// ✅ Correction 1 : Import nommé au lieu de default
import { socketService } from './socketService';
import {
  Notification,
  NotificationAPI,
  NotificationSummary,
  NotificationSummaryAPI,
  NotificationPreferences,
  NotificationPreferencesAPI,
  NotificationListResponse,
  LoadNotificationsOptions,
  UpdatePreferencesData,
  BroadcastNotificationData,
  WebSocketStatus,
  TestEmailType,
  mapAPIToNotification,
  mapAPISummaryToSummary,
  formatNotificationDate
} from '../types/models/notification.types';
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
    const params: any = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    if (options.nonLues !== undefined) params.nonLues = options.nonLues;
    if (options.type) params.type = options.type;

    const response = await httpClient.get<any>(API_ENDPOINTS.notifications.list, params);

    if (!response.success) {
      return {
        notifications: [],
        pagination: { total: 0, page: options.page || 1, pages: 0, limit: options.limit || 20 },
        stats: { nonLues: 0, total: 0 }
      };
    }

    const data = response.data;
    return {
      notifications: (data?.notifications || data?.items || []).map((n: any) => mapAPIToNotification(n)),
      pagination: data?.pagination || { total: 0, page: options.page || 1, pages: 0, limit: options.limit || 20 },
      stats: data?.stats || { nonLues: 0, total: 0 }
    };
  } catch (error: any) {
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
      const response = await httpClient.get<any>(API_ENDPOINTS.notifications.summary);

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
        throw new Error(response.error || 'Erreur lors du marquage');
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
        throw new Error(response.error || 'Erreur lors du marquage');
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
   * Marquer plusieurs notifications comme lues
   */
  async markMultipleAsRead(notificationIds: number[]): Promise<{ updated: number }> {
    try {
      const response = await httpClient.put<{ updated_count?: number; updated?: number }>(
        API_ENDPOINTS.notifications.markMultipleAsRead,
        { notificationIds }
      );

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du marquage');
      }

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
        throw new Error(response.error || 'Erreur lors de la suppression');
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
        throw new Error(response.error || 'Erreur lors de la suppression');
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
      const response = await httpClient.get<NotificationPreferences | NotificationPreferencesAPI>(
        API_ENDPOINTS.notifications.preferences
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur lors de la récupération');
      }

      // Si c'est déjà au bon format
      if ('global' in response.data && response.data.global.actives !== undefined) {
        return response.data as NotificationPreferences;
      }

      // Sinon on convertit depuis le format API
      const apiPrefs = response.data as NotificationPreferencesAPI;
      return {
        global: {
          actives: true, // Par défaut si non disponible
          email: apiPrefs.email_enabled,
          sms: false // Par défaut si non disponible
        },
        types: {
          nouveauxEvenements: apiPrefs.types.evenements.inscription,
          modificationsProgramme: apiPrefs.types.evenements.modification,
          rappels: apiPrefs.types.evenements.rappel
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

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur lors de la mise à jour');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Envoyer un email de test
   */
  async sendTestEmail(type?: TestEmailType): Promise<{ sent: boolean; result: any }> {
    try {
      const response = await httpClient.post<{ sent: boolean; result: any }>(
        API_ENDPOINTS.notifications.testEmail,
        { type }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur lors de l\'envoi');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérifier le statut WebSocket
   */
  async getWebSocketStatus(): Promise<WebSocketStatus> {
    try {
      const response = await httpClient.get<{ success: boolean; websocket: WebSocketStatus }>(
        API_ENDPOINTS.notifications.wsStatus
      );

      if (!response.success || !response.data) {
        return {
          connected: false,
          error: 'Service WebSocket non disponible'
        };
      }

      return response.data.websocket;
    } catch (error) {
      return {
        connected: false,
        error: error.message || 'Erreur inconnue'
      };
    }
  }

  /**
   * Envoyer une notification broadcast (admin)
   */
  async broadcastNotification(
    data: BroadcastNotificationData
  ): Promise<{ sent_count: number }> {
    try {
      const response = await httpClient.post<{ sent_count: number }>(
        API_ENDPOINTS.dashboard.broadcastNotification,
        data
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur lors de l\'envoi');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ================================================
  // MÉTHODES UTILITAIRES
  // ================================================

  /**
   * Obtenir uniquement les notifications non lues
   */
  async getUnreadNotifications(limit: number = 20): Promise<NotificationListResponse> {
    return this.getNotifications({
      nonLues: true,
      limit,
      page: 1
    });
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount(): Promise<number> {
    try {
      const summary = await this.getSummary();
      return summary.nonLues || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Demander la permission pour les notifications navigateur
   */
  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (window.Notification.permission === 'granted') {
      return true;
    }

    if (window.Notification.permission !== 'denied') {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
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

  /**
   * Formater la date d'une notification
   */
  formatDate(dateStr: string, language = 'fr'): string {
    return formatNotificationDate(dateStr, language);
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async sendNotification(notificationData: {
    titre: string;
    message: string;
    type_notification: string;
    destinataire_id: number;
    url_action?: string;
    priorite?: string;
    canaux?: string[];
    metadata?: any;
  }): Promise<{ success: boolean; notification?: Notification }> {
    try {
      const result = await httpClient.post<any>('/notifications/send', notificationData);
      return {
        success: result.success,
        notification: result.data?.notification
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Envoyer une notification globale à tous les utilisateurs
   */
  async sendGlobalNotification(notificationData: {
    titre: string;
    message: string;
    type_notification: string;
    priorite?: string;
    canaux?: string[];
    global: boolean;
    metadata?: any;
  }): Promise<{ success: boolean; sent_count?: number }> {
    try {
      const result = await httpClient.post<any>('/notifications/broadcast', notificationData);
      return {
        success: result.success,
        sent_count: result.data?.sent_count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Envoyer un email via le service de notification
   * Note: Cette méthode n'est disponible que si le backend supporte l'envoi d'emails
   */
  async sendEmail?(emailData: {
    to: number | string;
    subject: string;
    body: string;
    template?: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const result = await httpClient.post<any>('/notifications/test-email', emailData);
      return {
        success: result.success,
        messageId: result.data?.messageId
      };
    } catch (error) {
      return { success: false };
    }
  }
}

// Export de l'instance singleton
export const notificationService = new UnifiedNotificationService();

// Export du type pour l'injection de dépendances
export type { UnifiedNotificationService };