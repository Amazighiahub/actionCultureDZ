// components/NotificationBell.tsx - Composant de cloche de notifications
import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, Settings, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../services/notification.service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';import { useTranslation } from "react-i18next";

interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  position?: 'left' | 'right';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  showBadge = true,
  position = 'right'
}) => {
  const {
    notifications,
    summary,
    isLoading,
    isConnected,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshSummary
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique ailleurs
  const { t } = useTranslation();useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Charger les notifications quand on ouvre
  useEffect(() => {
    if (isOpen) {
      loadNotifications({ nonLues: filter === 'unread' });
    }
  }, [isOpen, filter, loadNotifications]);

  // Rafraîchir le résumé périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSummary();
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [refreshSummary]);

  // Filtrer les notifications
  const displayedNotifications = filter === 'unread' ?
  notifications.filter((n) => !n.lu) :
  notifications;

  // Obtenir l'icône selon le type
  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'validation_participation': '✅',
      'annulation_evenement': '❌',
      'modification_programme': '📝',
      'nouvel_evenement': '🎉',
      'nouvelle_oeuvre': '🎨',
      'nouveau_commentaire': '💬',
      'bienvenue': '👋',
      'validation_compte': '✓',
      'message_admin': '⚠️',
      'rappel_evenement': '⏰',
      'autre': 'ℹ️'
    };
    return icons[type] || '📢';
  };

  // Obtenir la couleur selon la priorité
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgente':return 'text-red-600 bg-red-50';
      case 'haute':return 'text-orange-600 bg-orange-50';
      case 'normale':return 'text-blue-600 bg-blue-50';
      case 'basse':return 'text-gray-600 bg-gray-50';
      default:return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={t("common_notificationbell.notifications")}>

        {isConnected ?
        <Bell className="w-6 h-6 text-gray-700" /> :

        <BellOff className="w-6 h-6 text-gray-400" />
        }
        
        {/* Badge de notification */}
        {showBadge && summary && summary.nonLues > 0 &&
        <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {summary.nonLues > 99 ? '99+' : summary.nonLues}
          </span>
        }
      </button>

      {/* Dropdown */}
      {isOpen &&
      <div className={`absolute top-full mt-2 ${position === 'left' ? 'left-0' : 'right-0'} w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("common_notificationbell.notifications")}</h3>
              <div className="flex items-center gap-2">
                {/* Filtre */}
                <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
                className="text-sm border rounded px-2 py-1">

                  <option value="all">{t("common_notificationbell.toutes")}</option>
                  <option value="unread">{t("common_notificationbell.non_lues")}</option>
                </select>
                
                {/* Actions */}
                <button
                onClick={() => markAllAsRead()}
                className="p-1 hover:bg-gray-100 rounded"
                title={t("common_notificationbell.title_tout_marquer_comme")}>

                  <CheckCheck className="w-4 h-4" />
                </button>
                
                <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded">

                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Résumé */}
            {summary &&
          <div className="mt-2 text-sm text-gray-600">
                {summary.nonLues > 0 ?
            <span>{summary.nonLues}{t("common_notificationbell.nouvelle")}{summary.nonLues > 1 ? 's' : ''}</span> :

            <span>{t("common_notificationbell.aucune_nouvelle_notification")}</span>
            }
              </div>
          }
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ?
          <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2">{t("common_notificationbell.chargement")}</p>
              </div> :
          displayedNotifications.length === 0 ?
          <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t("common_notificationbell.aucune_notification")}</p>
              </div> :

          <ul className="divide-y divide-gray-200">
                {displayedNotifications.map((notification) =>
            <li
              key={notification.id_notification}
              className={`p-4 hover:bg-gray-50 transition-colors ${
              !notification.lu ? 'bg-blue-50' : ''}`
              }>

                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <span className={`text-2xl p-2 rounded-lg ${getPriorityColor(notification.priorite)}`}>
                        {getNotificationIcon(notification.type_notification)}
                      </span>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900">
                          {notification.titre}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.date_creation), {
                      addSuffix: true,
                      locale: fr
                    })}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.lu &&
                  <button
                    onClick={() => markAsRead(notification.id_notification)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={t("common_notificationbell.title_marquer_comme")}>

                            <Check className="w-4 h-4 text-gray-600" />
                          </button>
                  }
                        <button
                    onClick={() => deleteNotification(notification.id_notification)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={t("common_notificationbell.title_supprimer")}>

                          <Trash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Lien vers l'action */}
                    {notification.url_action &&
              <a
                href={notification.url_action}
                className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
                onClick={() => markAsRead(notification.id_notification)}>{t("common_notificationbell.voir_plus")}


              </a>
              }
                  </li>
            )}
              </ul>
          }
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <a
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setIsOpen(false)}>{t("common_notificationbell.voir_toutes_les")}


            </a>
              <a
              href="/notifications/preferences"
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              onClick={() => setIsOpen(false)}>

                <Settings className="w-4 h-4" />{t("common_notificationbell.prfrences")}

            </a>
            </div>
          </div>
        </div>
      }
    </div>);

};