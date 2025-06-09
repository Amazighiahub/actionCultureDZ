// pages/NotificationsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Filter,
  Check,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  Palette,
  Shield,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationUtils } from '@/notifications';
import type { NotificationType, NotificationPriority } from '@/types/Notification.types';

interface FilterState {
  type?: NotificationType;
  lu?: boolean;
  priorite?: NotificationPriority;
  search?: string;
}

export const NotificationsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const {
    notifications,
    summary,
    isLoading,
    error,
    total,
    page,
    pages,
    limit,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
    deleteNotification,
    deleteAllRead,
    refreshAll,
  } = useNotifications();

  // Charger les notifications avec les filtres
  useEffect(() => {
    fetchNotifications({
      page: currentPage,
      limit: 20,
      ...filters,
    });
  }, [currentPage, filters, fetchNotifications]);

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id_notification));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.length > 0) {
      await markMultipleAsRead(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length > 0 && confirm('Supprimer les notifications sélectionnées ?')) {
      for (const id of selectedIds) {
        await deleteNotification(id);
      }
      setSelectedIds([]);
    }
  };

  const typeOptions: { value: NotificationType; label: string; icon: string }[] = [
    { value: 'nouvel_evenement', label: 'Nouveaux événements', icon: '🎉' },
    { value: 'validation_participation', label: 'Validations', icon: '✅' },
    { value: 'nouveau_commentaire', label: 'Commentaires', icon: '💬' },
    { value: 'nouvelle_oeuvre', label: 'Nouvelles œuvres', icon: '🎨' },
    { value: 'message_admin', label: 'Messages admin', icon: '📢' },
    { value: 'rappel_evenement', label: 'Rappels', icon: '⏰' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold dark:text-white">Notifications</h1>
            </div>
            <button
              onClick={refreshAll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                isLoading ? 'animate-spin' : ''
              }`} />
            </button>
          </div>

          {/* Statistiques */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.non_lues}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Non lues</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {summary.haute_priorite}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Haute priorité</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {summary.urgentes}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Urgentes</div>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'actions et filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Actions en masse */}
            <div className="flex items-center gap-2 flex-1">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedIds.length} sélectionnée(s)
                  </span>
                  <button
                    onClick={handleMarkSelectedAsRead}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Marquer comme lu
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Supprimer
                  </button>
                </>
              )}
              {selectedIds.length === 0 && notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Tout marquer comme lu
                  </button>
                  <button
                    onClick={deleteAllRead}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer toutes les lues
                  </button>
                </>
              )}
            </div>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>

          {/* Panneau de filtres */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtre par type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as NotificationType || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Tous les types</option>
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Statut
                </label>
                <select
                  value={filters.lu === undefined ? '' : filters.lu.toString()}
                  onChange={(e) => setFilters({ ...filters, lu: e.target.value === '' ? undefined : e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Tous</option>
                  <option value="false">Non lues</option>
                  <option value="true">Lues</option>
                </select>
              </div>

              {/* Filtre par priorité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priorité
                </label>
                <select
                  value={filters.priorite || ''}
                  onChange={(e) => setFilters({ ...filters, priorite: e.target.value as NotificationPriority || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Toutes</option>
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Liste des notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
              <p className="text-red-500">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">Aucune notification trouvée</p>
            </div>
          ) : (
            <>
              {/* Sélectionner tout */}
              <div className="p-4 border-b dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === notifications.length && notifications.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Sélectionner tout
                  </span>
                </label>
              </div>

              {/* Notifications */}
              <div className="divide-y dark:divide-gray-700">
                {notifications.map((notification) => {
                  const config = notificationUtils.getNotificationConfig(notification.type_notification);
                  const isSelected = selectedIds.includes(notification.id_notification);

                  return (
                    <div
                      key={notification.id_notification}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !notification.lu ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      } ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelect(notification.id_notification)}
                          className="w-4 h-4 mt-1 text-blue-600 rounded"
                        />

                        {/* Icône */}
                        <div className="text-2xl">{config.icon}</div>

                        {/* Contenu */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className={`font-medium ${
                                !notification.lu 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.titre}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-500">
                                  {notificationUtils.formatTimeAgo(notification.date_creation)}
                                </span>
                                {notification.priorite !== 'normale' && (
                                  <span className={`font-medium ${
                                    notificationUtils.getPriorityClass(notification.priorite)
                                  }`}>
                                    {notification.priorite.charAt(0).toUpperCase() + notification.priorite.slice(1)}
                                  </span>
                                )}
                                <span className="text-gray-500 dark:text-gray-500">
                                  {notification.type_notification.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              {!notification.lu && (
                                <button
                                  onClick={() => markAsRead(notification.id_notification)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title="Marquer comme lu"
                                >
                                  <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id_notification)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          </div>

                          {/* Bouton d'action */}
                          {config.actionText && notification.url_action && (
                            <a
                              href={notification.url_action}
                              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                            >
                              {config.actionText}
                              <span aria-hidden="true">→</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="p-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} sur {pages} • {total} notifications
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(page + 1)}
                    disabled={page === pages}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;