// types/notification.types.ts

export type NotificationType = 
  | 'validation_participation'
  | 'annulation_evenement'
  | 'modification_programme'
  | 'nouvel_evenement'
  | 'nouvelle_oeuvre'
  | 'nouveau_commentaire'
  | 'bienvenue'
  | 'validation_compte'
  | 'message_admin'
  | 'rappel_evenement'
  | 'autre';

export type NotificationPriority = 'basse' | 'normale' | 'haute' | 'urgente';

export interface Notification {
  id_notification: number;
  id_user: number;
  type_notification: NotificationType;
  titre: string;
  message: string;
  id_evenement?: number | null;
  id_programme?: number | null;
  id_oeuvre?: number | null;
  url_action?: string | null;
  email_envoye: boolean;
  sms_envoye: boolean;
  lu: boolean;
  date_lecture?: Date | string | null;
  priorite: NotificationPriority;
  expire_le?: Date | string | null;
  date_creation: Date | string;
  date_modification: Date | string;
  
  // Relations
  Utilisateur?: any;
  Evenement?: any;
  Programme?: any;
  Oeuvre?: any;
}

export interface CreateNotificationDto {
  id_user: number;
  type_notification: NotificationType;
  titre: string;
  message: string;
  id_evenement?: number;
  id_programme?: number;
  id_oeuvre?: number;
  url_action?: string;
  priorite?: NotificationPriority;
  expire_le?: Date | string;
}

export interface UpdateNotificationDto {
  titre?: string;
  message?: string;
  priorite?: NotificationPriority;
  expire_le?: Date | string;
}

export interface NotificationSummary {
  total: number;
  non_lues: number;
  haute_priorite: number;
  urgentes: number;
  par_type: Record<NotificationType, number>;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled?: boolean;
  types_email: NotificationType[];
  types_sms: NotificationType[];
  types_push?: NotificationType[];
  quiet_hours?: {
    start: string; // HH:mm
    end: string;   // HH:mm
  };
}

export interface MarkAsReadDto {
  notification_ids: number[];
}

export interface SendTestEmailDto {
  email?: string;
  type_notification: NotificationType;
  titre?: string;
  message?: string;
}

export interface NotificationFilters {
  type_notification?: NotificationType;
  lu?: boolean;
  priorite?: NotificationPriority;
  date_debut?: Date | string;
  date_fin?: Date | string;
  has_expired?: boolean;
}

export interface BroadcastNotificationDto {
  type_notification: NotificationType;
  titre: string;
  message: string;
  priorite?: NotificationPriority;
  expire_le?: Date | string;
  user_filters?: {
    type_utilisateur?: string[];
    id_wilaya?: number[];
    is_professional?: boolean;
    has_validated_email?: boolean;
  };
  send_email?: boolean;
  send_sms?: boolean;
}

// Types pour les réponses paginées
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  non_lues: number;
}

// Types pour les statistiques
export interface NotificationStats {
  total_sent: number;
  total_read: number;
  average_read_time_hours: number;
  by_type: Array<{
    type: NotificationType;
    count: number;
    read_count: number;
    read_percentage: number;
  }>;
  by_priority: Array<{
    priority: NotificationPriority;
    count: number;
    read_count: number;
  }>;
  email_stats: {
    sent: number;
    failed: number;
    success_rate: number;
  };
  sms_stats: {
    sent: number;
    failed: number;
    success_rate: number;
  };
}