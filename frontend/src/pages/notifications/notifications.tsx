// pages/notifications/notification.tsx - Page complète de gestion des notifications
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  Check, 
  X, 
  Trash2, 
  Filter, 
  CheckCheck,
  BellOff,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  formatNotificationDate, 
  groupNotificationsByDate,
  type Notification,
  type NotificationType 
} from '@/types/models/notification.types';

// Type pour les notifications groupées
type GroupedNotifications = Record<string, Notification[]>;

// Composant pour une notification individuelle
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ notification, onMarkAsRead, onDelete }) => {
  const getIcon = (type: NotificationType): JSX.Element => {
    const icons: Record<NotificationType, JSX.Element> = {
      'validation_participation': <Check className="w-5 h-5 text-green-600" />,
      'annulation_evenement': <X className="w-5 h-5 text-red-600" />,
      'modification_programme': <Calendar className="w-5 h-5 text-blue-600" />,
      'nouvel_evenement': <Bell className="w-5 h-5 text-purple-600" />,
      'nouvelle_oeuvre': <span className="text-xl">🎨</span>,
      'nouveau_commentaire': <span className="text-xl">💬</span>,
      'bienvenue': <span className="text-xl">👋</span>,
      'validation_compte': <Check className="w-5 h-5 text-green-600" />,
      'message_admin': <AlertCircle className="w-5 h-5 text-orange-600" />,
      'rappel_evenement': <Bell className="w-5 h-5 text-blue-600" />,
      'autre': <Bell className="w-5 h-5 text-gray-600" />
    };
    return icons[type] || icons.autre;
  };

  const getPriorityStyles = (priority?: string): string => {
    switch (priority) {
      case 'urgente': return 'border-l-4 border-red-500';
      case 'haute': return 'border-l-4 border-orange-500';
      case 'normale': return 'border-l-4 border-blue-500';
      default: return 'border-l-4 border-gray-300';
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-4 mb-3 transition-all ${
        !notification.lu ? 'bg-blue-50' : ''
      } ${getPriorityStyles(notification.priorite)}`}
    >
      <div className="flex items-start gap-4">
        {/* Icône */}
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification.type_notification)}
        </div>

        {/* Contenu */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{notification.titre}</h3>
          <p className="text-gray-600 mt-1">{notification.message}</p>
          
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-gray-400">
              {formatNotificationDate(notification.date_creation)}
            </span>
            
            {notification.url_action && (
              <a 
                href={notification.url_action}
                className="text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => !notification.lu && onMarkAsRead(notification.id_notification)}
              >
                Voir plus →
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!notification.lu && (
            <button
              onClick={() => onMarkAsRead(notification.id_notification)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Marquer comme lu"
            >
              <Check className="w-4 h-4 text-gray-600" />
            </button>
          )}
          
          <button
            onClick={() => onDelete(notification.id_notification)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Page principale des notifications
export default function NotificationsPage() {
  const {
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
    requestNotificationPermission
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [page, setPage] = useState(1);

  // Vérifier les permissions au chargement
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      setShowPermissionBanner(true);
    }
  }, []);

  // Charger plus de notifications
  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadNotifications({ page: nextPage, limit: 20 });
  };

  // Filtrer les notifications
  const filteredNotifications = React.useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.lu);
    return notifications.filter(n => n.type_notification === filter);
  }, [notifications, filter]);

  // Grouper par date avec typage explicite
  const groupedNotifications = React.useMemo((): GroupedNotifications => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  // Gérer la demande de permission
  const handlePermissionRequest = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowPermissionBanner(false);
    }
  };

  // Types de notifications pour le filtre
  const notificationTypes: { value: NotificationType | 'all' | 'unread'; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'unread', label: 'Non lues' },
    { value: 'validation_participation', label: 'Participations' },
    { value: 'annulation_evenement', label: 'Annulations' },
    { value: 'modification_programme', label: 'Modifications' },
    { value: 'nouvel_evenement', label: 'Nouveaux événements' },
    { value: 'rappel_evenement', label: 'Rappels' }
  ];

  // Fonction helper pour obtenir les entrées du groupement
  const getGroupedEntries = (): Array<[string, Notification[]]> => {
    return Object.entries(groupedNotifications);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            
            <div className="flex items-center gap-4">
              {/* Statut WebSocket */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-600">
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              
              {/* Bouton paramètres */}
              <a
                href="/notifications/preferences"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de permission */}
      {showPermissionBanner && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellOff className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Activez les notifications pour être alerté en temps réel
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePermissionRequest}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700"
                >
                  Activer
                </button>
                <button
                  onClick={() => setShowPermissionBanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Résumé */}
            {summary && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4">Résumé</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium">{summary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Non lues</span>
                    <span className="font-medium text-blue-600">{summary.nonLues}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filtres */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtrer
              </h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions rapides */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => markAllAsRead()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer comme lu
              </button>
              
              <button
                onClick={() => deleteAllRead()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer les lues
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {isLoading && notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des notifications...</p>
              </div>
            ) : Object.keys(groupedNotifications).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune notification</p>
              </div>
            ) : (
              <>
                {/* Notifications groupées par date */}
                {getGroupedEntries().map(([dateGroup, notifs]) => (
                  <div key={dateGroup} className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {dateGroup}
                    </h3>
                    {notifs.map((notification: Notification) => (
                      <NotificationItem
                        key={notification.id_notification}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                ))}

                {/* Bouton charger plus */}
                {notifications.length >= 20 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      {isLoading ? 'Chargement...' : 'Charger plus'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}