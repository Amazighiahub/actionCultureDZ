// services/notification.service.ts - Service des notifications corrigé

import { apiService, ApiResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationSummary,
  NotificationPreferences,
  NotificationListResponse,
  NotificationFilters,
  MarkAsReadDto,
  SendTestEmailDto,
  BroadcastNotificationDto,
  NotificationStats
} from '../types/Notification.types';

export interface NotificationParams {
  page?: number;
  limit?: number;
  lu?: boolean;
  type_notification?: NotificationType;
  priorite?: NotificationPriority;
  sort?: string;
  order?: 'asc' | 'desc';
}

export class NotificationService {
  /**
   * Récupère la liste des notifications de l'utilisateur
   */
  static async getNotifications(
    params?: NotificationParams & NotificationFilters
  ): Promise<ApiResponse<Notification[]>> {
    return apiService.get<Notification[]>(
      API_ENDPOINTS.notifications.list,
      params
    );
  }

  /**
   * Récupère le résumé des notifications (nombre non lues, etc.)
   */
  static async getSummary(): Promise<ApiResponse<NotificationSummary>> {
    return apiService.get<NotificationSummary>(
      API_ENDPOINTS.notifications.summary
    );
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(
    notificationId: number
  ): Promise<ApiResponse<Notification>> {
    return apiService.put<Notification>(
      API_ENDPOINTS.notifications.markAsRead(notificationId)
    );
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(): Promise<ApiResponse<{ updated: number }>> {
    return apiService.put<{ updated: number }>(
      API_ENDPOINTS.notifications.markAllAsRead
    );
  }

  /**
   * Marque plusieurs notifications comme lues
   */
  static async markMultipleAsRead(
    dto: MarkAsReadDto
  ): Promise<ApiResponse<{ updated: number }>> {
    return apiService.put<{ updated: number }>(
      API_ENDPOINTS.notifications.markMultipleAsRead,
      dto
    );
  }

  /**
   * Supprime une notification
   */
  static async deleteNotification(
    notificationId: number
  ): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.notifications.delete(notificationId)
    );
  }

  /**
   * Supprime toutes les notifications lues
   */
  static async deleteAllRead(): Promise<ApiResponse<{ deleted: number }>> {
    return apiService.delete<{ deleted: number }>(
      API_ENDPOINTS.notifications.deleteRead
    );
  }

  /**
   * Récupère les préférences de notification
   */
  static async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.get<NotificationPreferences>(
      API_ENDPOINTS.notifications.preferences
    );
  }

  /**
   * Met à jour les préférences de notification
   */
  static async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.put<NotificationPreferences>(
      API_ENDPOINTS.notifications.updatePreferences,
      preferences
    );
  }

  /**
   * Envoie un email de test
   */
  static async sendTestEmail(
    dto: SendTestEmailDto
  ): Promise<ApiResponse<{ sent: boolean; message: string }>> {
    return apiService.post<{ sent: boolean; message: string }>(
      API_ENDPOINTS.notifications.testEmail,
      dto
    );
  }

  /**
   * ADMIN: Diffuse une notification à plusieurs utilisateurs
   */
  static async broadcastNotification(
    dto: BroadcastNotificationDto
  ): Promise<ApiResponse<{ sent: number; failed: number }>> {
    return apiService.post<{ sent: number; failed: number }>(
      API_ENDPOINTS.dashboard.broadcastNotification,
      dto
    );
  }

  /**
   * ADMIN: Récupère les statistiques des notifications
   */
  static async getStatistics(
    params?: { 
      date_debut?: string; 
      date_fin?: string;
      type_notification?: string;
    }
  ): Promise<ApiResponse<NotificationStats>> {
    return apiService.get<NotificationStats>(
      API_ENDPOINTS.dashboard.notifications,
      params
    );
  }

  /**
   * Méthode utilitaire pour créer une notification (utilisée par d'autres services)
   */
  static async createNotification(
    dto: CreateNotificationDto
  ): Promise<ApiResponse<Notification>> {
    // Note: Cette méthode n'est pas exposée dans les routes publiques
    // Elle est généralement appelée automatiquement par le backend
    // lors d'actions spécifiques (inscription à un événement, etc.)
    throw new Error('La création directe de notifications n\'est pas autorisée');
  }

  /**
   * Récupère les notifications non lues (helper method)
   */
  static async getUnreadNotifications(
    params?: NotificationParams
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ ...params, lu: false });
  }

  /**
   * Récupère les notifications par type
   */
  static async getNotificationsByType(
    type: NotificationType,
    params?: NotificationParams
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ 
      ...params, 
      type_notification: type
    });
  }

  /**
   * Récupère les notifications haute priorité
   */
  static async getHighPriorityNotifications(
    params?: NotificationParams
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ 
      ...params, 
      priorite: 'haute' as NotificationPriority
    });
  }

  /**
   * Récupère les notifications urgentes
   */
  static async getUrgentNotifications(
    params?: NotificationParams
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ 
      ...params, 
      priorite: 'urgente' as NotificationPriority
    });
  }

  /**
   * Vérifie si l'utilisateur a des notifications non lues
   */
  static async hasUnreadNotifications(): Promise<boolean> {
    try {
      const response = await this.getSummary();
      return (response.data?.non_lues ?? 0) > 0;
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications:', error);
      return false;
    }
  }

  /**
   * Formate une notification pour l'affichage
   */
  static formatNotification(notification: Notification): {
    icon: string;
    color: string;
    actionText?: string;
  } {
    const configs: Record<string, { icon: string; color: string; actionText?: string }> = {
      validation_participation: { 
        icon: '✅', 
        color: 'success',
        actionText: 'Voir l\'événement'
      },
      annulation_evenement: { 
        icon: '❌', 
        color: 'error',
        actionText: 'Voir les détails'
      },
      modification_programme: { 
        icon: '📅', 
        color: 'warning',
        actionText: 'Voir le programme'
      },
      nouvel_evenement: { 
        icon: '🎉', 
        color: 'info',
        actionText: 'Découvrir'
      },
      nouvelle_oeuvre: { 
        icon: '🎨', 
        color: 'info',
        actionText: 'Voir l\'œuvre'
      },
      nouveau_commentaire: { 
        icon: '💬', 
        color: 'info',
        actionText: 'Lire'
      },
      bienvenue: { 
        icon: '👋', 
        color: 'primary' 
      },
      validation_compte: { 
        icon: '✅', 
        color: 'success',
        actionText: 'Compléter mon profil'
      },
      message_admin: { 
        icon: '📢', 
        color: 'warning',
        actionText: 'Lire le message'
      },
      rappel_evenement: { 
        icon: '⏰', 
        color: 'warning',
        actionText: 'Voir l\'événement'
      },
      autre: { 
        icon: '📌', 
        color: 'default' 
      }
    };

    return configs[notification.type_notification] || configs.autre;
  }
}

// Export par défaut
export default NotificationService;