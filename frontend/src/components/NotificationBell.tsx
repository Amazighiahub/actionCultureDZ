// components/NotificationBell.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, X, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationUtils } from '@/notifications';
import type { Notification } from '@/types/Notification.types';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    summary,
    preferences,
    isLoading,
    error,
    unreadCount,
    urgentCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
  } = useNotifications();

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rafraîchir les notifications quand on ouvre le dropdown
  useEffect(() => {
    if (showDropdown) {
      fetchNotifications({ limit: 20 });
    }
  }, [showDropdown, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.lu) {
      await markAsRead(notification.id_notification);
    }
    
    if (notification.url_action) {
      // Navigation vers l'URL d'action
      window.location.href = notification.url_action;
    }
  };

  const handlePreferenceChange = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value });
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {urgentCount > 0 && (
          <span className="absolute -bottom-1 -right-1 bg-orange-500 w-2 h-2 rounded-full animate-pulse" />
        )}
      </button>

      {/* Dropdown des notifications */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* En-tête */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && !isLoading && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tout marquer comme lu
                </button>
              )}
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                aria-label="Préférences"
              >
                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Préférences (si affichées) */}
          {showPreferences && preferences && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <h4 className="font-medium mb-3 dark:text-white">Préférences de notification</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e) => handlePreferenceChange('email_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm dark:text-gray-300">Notifications par email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.sms_enabled}
                    onChange={(e) => handlePreferenceChange('sms_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm dark:text-gray-300">Notifications par SMS</span>
                </label>
                {preferences.push_enabled !== undefined && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.push_enabled}
                      onChange={(e) => handlePreferenceChange('push_enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm dark:text-gray-300">Notifications push</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = notificationUtils.getNotificationConfig(notification.type_notification);
                return (
                  <div
                    key={notification.id_notification}
                    className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                      !notification.lu ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className="text-2xl mt-1">{config.icon}</div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={`font-medium ${
                              !notification.lu 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.titre}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
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
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.lu && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id_notification);
                                }}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Marquer comme lu"
                              >
                                <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id_notification);
                              }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        {config.actionText && notification.url_action && (
                          <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium inline-flex items-center gap-1">
                            {config.actionText}
                            <span aria-hidden="true">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied de page */}
          {notifications.length > 0 && (
            <div className="p-3 text-center border-t dark:border-gray-700">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Voir toutes les notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;