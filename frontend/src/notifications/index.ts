// notifications/index.ts - Point d'entrée pour le module notifications

// Export des types
export * from '@/types/Notification.types';

// Export du service
export { default as NotificationService } from '@/services/notification.service';

// Export des hooks
export { 
  useNotifications,
  useNotificationPolling,
  default as useNotificationsHook 
} from '@/hooks/useNotifications';

// Export des utilitaires
export const notificationUtils = {
  /**
   * Formate le temps écoulé depuis une notification
   */
  formatTimeAgo: (dateString: string | Date): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'À l\'instant';
    } else if (diff < 3600000) {
      return `Il y a ${Math.floor(diff / 60000)} min`;
    } else if (diff < 86400000) {
      return `Il y a ${Math.floor(diff / 3600000)}h`;
    } else if (diff < 2592000000) {
      return `Il y a ${Math.floor(diff / 86400000)}j`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  },

  /**
   * Obtient la configuration visuelle d'une notification
   */
  getNotificationConfig: (type: string): { icon: string; color: string; actionText?: string } => {
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

    return configs[type] || configs.autre;
  },

  /**
   * Obtient la couleur selon la priorité
   */
  getPriorityColor: (priority: string): string => {
    const colors: Record<string, string> = {
      basse: 'gray',
      normale: 'blue',
      haute: 'orange',
      urgente: 'red'
    };
    return colors[priority] || 'gray';
  },

  /**
   * Obtient la classe CSS selon la priorité
   */
  getPriorityClass: (priority: string): string => {
    const classes: Record<string, string> = {
      basse: 'text-gray-500',
      normale: 'text-blue-600',
      haute: 'text-orange-600',
      urgente: 'text-red-600'
    };
    return classes[priority] || 'text-gray-600';
  }
};