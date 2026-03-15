// types/notification.types.ts - Types unifiés pour les notifications
/* eslint-disable @typescript-eslint/no-explicit-any */

// ================================================
// TYPES DE BASE
// ================================================

// Types de notifications disponibles
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

// Priorités des notifications
export type NotificationPriority = 'basse' | 'normale' | 'haute' | 'urgente';

// ================================================
// INTERFACE PRINCIPALE NOTIFICATION
// ================================================

// Interface unifiée pour les notifications (compatible avec le backend)
export interface Notification {
  // Identifiants
  id_notification: number;
  id_user: number;
  
  // Contenu
  type_notification: NotificationType;
  titre: string;
  message: string;
  priorite?: NotificationPriority;
  
  // Relations optionnelles
  id_evenement?: number;
  id_programme?: number;
  id_oeuvre?: number;
  
  // Métadonnées
  lu: boolean;
  date_creation: string;
  date_lecture?: string;
  url_action?: string;
  email_envoye?: boolean;
  
  // Données additionnelles
  data?: any;
}

// Interface alternative pour l'API (si votre backend retourne des noms différents)
export interface NotificationAPI {
  id: number;
  user_id: number;
  type: string;
  titre: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  entity_type?: string;
  entity_id?: number;
  action_url?: string;
  data?: any;
}

// ================================================
// MAPPERS DE CONVERSION
// ================================================

// Convertir de l'API vers le format unifié
export function mapAPIToNotification(apiNotif: NotificationAPI): Notification {
  return {
    id_notification: apiNotif.id,
    id_user: apiNotif.user_id,
    type_notification: apiNotif.type as NotificationType,
    titre: apiNotif.titre,
    message: apiNotif.message,
    lu: !apiNotif.is_read,
    date_creation: apiNotif.created_at,
    date_lecture: apiNotif.read_at,
    url_action: apiNotif.action_url,
    data: apiNotif.data,
    
    // Mapper les entités si nécessaire
    ...(apiNotif.entity_type === 'evenement' && apiNotif.entity_id && {
      id_evenement: apiNotif.entity_id
    }),
    ...(apiNotif.entity_type === 'oeuvre' && apiNotif.entity_id && {
      id_oeuvre: apiNotif.entity_id
    }),
    ...(apiNotif.entity_type === 'programme' && apiNotif.entity_id && {
      id_programme: apiNotif.entity_id
    })
  };
}

// Convertir du format unifié vers l'API
export function mapNotificationToAPI(notif: Notification): Partial<NotificationAPI> {
  return {
    id: notif.id_notification,
    user_id: notif.id_user,
    type: notif.type_notification,
    titre: notif.titre,
    message: notif.message,
    is_read: !notif.lu,
    created_at: notif.date_creation,
    read_at: notif.date_lecture,
    action_url: notif.url_action,
    data: notif.data,
    
    // Déterminer le type d'entité
    ...(notif.id_evenement && {
      entity_type: 'evenement',
      entity_id: notif.id_evenement
    }),
    ...(notif.id_oeuvre && {
      entity_type: 'oeuvre',
      entity_id: notif.id_oeuvre
    }),
    ...(notif.id_programme && {
      entity_type: 'programme',
      entity_id: notif.id_programme
    })
  };
}

// ================================================
// TYPES POUR LE RÉSUMÉ
// ================================================

export interface NotificationSummary {
  total: number;
  nonLues: number;
 
  parType: Record<string, number>;
 

  dernieres: Array<{
    id_notification: number;
    titre: string;
    type_notification: NotificationType | string;
    date_creation: string;
  }>;
}

// Interface alternative pour l'API
export interface NotificationSummaryAPI {
  total_unread: number;
  total_notifications: number;
  notifications_by_type: Record<string, number>;
  recent_unread: NotificationAPI[];
}

// Mapper le résumé de l'API
export function mapAPISummaryToSummary(apiSummary: NotificationSummaryAPI): NotificationSummary {
  return {
    total: apiSummary.total_notifications,
    nonLues: apiSummary.total_unread,
    parType: apiSummary.notifications_by_type,
    dernieres: apiSummary.recent_unread.map(n => ({
      id_notification: n.id,
      titre: n.titre,
      type_notification: n.type,
      date_creation: n.created_at
    }))
  };
}

// ================================================
// TYPES POUR LES PRÉFÉRENCES
// ================================================

export interface NotificationPreferences {
  global: {
    actives: boolean;
    email: boolean;
    sms: boolean;
  };
  types: {
    nouveauxEvenements: boolean;
    modificationsProgramme: boolean;
    rappels: boolean;
  };
}

// Interface étendue pour l'API
export interface NotificationPreferencesAPI {
  email_enabled: boolean;
  push_enabled: boolean;
  types: {
    evenements: {
      inscription: boolean;
      modification: boolean;
      rappel: boolean;
      annulation: boolean;
    };
    oeuvres: {
      validation: boolean;
      commentaire: boolean;
      favori: boolean;
    };
    general: {
      newsletter: boolean;
      promotions: boolean;
      systeme: boolean;
    };
  };
  quiet_hours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// ================================================
// TYPES POUR LES REQUÊTES
// ================================================

export interface MarkMultipleReadRequest {
  notificationIds: number[];
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  stats: {
    nonLues: number;
    total: number;
  };
}

export interface LoadNotificationsOptions {
  page?: number;
  limit?: number;
  nonLues?: boolean;
  type?: string;
}

export interface UpdatePreferencesData {
  global?: Partial<NotificationPreferences['global']>;
  types?: Partial<NotificationPreferences['types']>;
}

export interface BroadcastNotificationData {
  titre: string;
  message: string;
  type: NotificationType | string;
  target_users?: 'all' | 'professionals' | 'visitors' | number[];
  data?: any;
}

// ================================================
// TYPES WEBSOCKET
// ================================================

export interface WebSocketStatus {
  connected: boolean;
  socketId?: string;
  transport?: string;
  error?: string;
}

export type TestEmailType = 'test' | 'bienvenue' | 'notification';

// ================================================
// UTILITAIRES
// ================================================

// Traductions pour les labels de groupement par date
const DATE_GROUP_LABELS: Record<string, { today: string; yesterday: string; thisWeek: string; older: string }> = {
  'fr': { today: "Aujourd'hui", yesterday: 'Hier', thisWeek: 'Cette semaine', older: 'Plus ancien' },
  'ar': { today: 'اليوم', yesterday: 'أمس', thisWeek: 'هذا الأسبوع', older: 'أقدم' },
  'en': { today: 'Today', yesterday: 'Yesterday', thisWeek: 'This week', older: 'Older' },
  'tz-ltn': { today: 'Assa', yesterday: 'Iḍelli', thisWeek: 'Imalas-a', older: 'Aqbur' },
  'tz-tfng': { today: 'ⴰⵙⵙⴰ', yesterday: 'ⵉⴹⵍⵍⵉ', thisWeek: 'ⵉⵎⴰⵍⴰⵙ-ⴰ', older: 'ⴰⵇⴱⵓⵔ' },
};

// Traductions pour les temps relatifs des notifications
const NOTIF_RELATIVE_TIME: Record<string, {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
}> = {
  'fr': {
    justNow: "À l'instant",
    minutesAgo: (n) => `Il y a ${n} minute${n > 1 ? 's' : ''}`,
    hoursAgo: (n) => `Il y a ${n} heure${n > 1 ? 's' : ''}`,
    daysAgo: (n) => `Il y a ${n} jour${n > 1 ? 's' : ''}`,
  },
  'ar': {
    justNow: 'الآن',
    minutesAgo: (n) => `منذ ${n} دقيقة`,
    hoursAgo: (n) => `منذ ${n} ساعة`,
    daysAgo: (n) => `منذ ${n} يوم`,
  },
  'en': {
    justNow: 'Just now',
    minutesAgo: (n) => `${n} minute${n > 1 ? 's' : ''} ago`,
    hoursAgo: (n) => `${n} hour${n > 1 ? 's' : ''} ago`,
    daysAgo: (n) => `${n} day${n > 1 ? 's' : ''} ago`,
  },
  'tz-ltn': {
    justNow: 'Tura kan',
    minutesAgo: (n) => `${n} n tesdatin aya`,
    hoursAgo: (n) => `${n} n tsaɛtin aya`,
    daysAgo: (n) => `${n} n wussan aya`,
  },
  'tz-tfng': {
    justNow: 'ⵜⵓⵔⴰ ⴽⴰⵏ',
    minutesAgo: (n) => `${n} ⵏ ⵜⵙⴷⴰⵜⵉⵏ ⴰⵢⴰ`,
    hoursAgo: (n) => `${n} ⵏ ⵜⵙⴰⵄⵜⵉⵏ ⴰⵢⴰ`,
    daysAgo: (n) => `${n} ⵏ ⵡⵓⵙⵙⴰⵏ ⴰⵢⴰ`,
  },
};

// Mapping des codes de langue vers des locales BCP 47 valides
const NOTIFICATION_LOCALE_MAP: Record<string, string> = {
  'ar': 'ar-DZ', 'fr': 'fr-DZ', 'en': 'en-US',
  'tz-ltn': 'fr-DZ', 'tz-tfng': 'ar-DZ',
};

// Vérifier si une notification est récente (moins de 24h)
export function isRecentNotification(notification: Notification): boolean {
  const created = new Date(notification.date_creation);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

// Grouper les notifications par date
export function groupNotificationsByDate(notifications: Notification[], language = 'fr'): Record<string, Notification[]> {
  const labels = DATE_GROUP_LABELS[language] || DATE_GROUP_LABELS['fr'];
  const groups: Record<string, Notification[]> = {
    [labels.today]: [],
    [labels.yesterday]: [],
    [labels.thisWeek]: [],
    [labels.older]: []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  notifications.forEach(notif => {
    const date = new Date(notif.date_creation);

    if (date >= today) {
      groups[labels.today].push(notif);
    } else if (date >= yesterday) {
      groups[labels.yesterday].push(notif);
    } else if (date >= weekAgo) {
      groups[labels.thisWeek].push(notif);
    } else {
      groups[labels.older].push(notif);
    }
  });

  // Supprimer les groupes vides
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

// Formater la date de notification
export function formatNotificationDate(dateStr: string, language = 'fr'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const t = NOTIF_RELATIVE_TIME[language] || NOTIF_RELATIVE_TIME['fr'];

  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return t.minutesAgo(diffMins);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  if (diffDays < 7) return t.daysAgo(diffDays);

  const locale = NOTIFICATION_LOCALE_MAP[language] || 'fr-DZ';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}