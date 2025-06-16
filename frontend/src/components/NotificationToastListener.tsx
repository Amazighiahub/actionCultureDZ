// components/NotificationToastListener.tsx - Composant pour afficher les toasts de nouvelles notifications
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner'; // Utilisation de Sonner pour les toasts
import { Bell, Calendar, Check, X, AlertCircle } from 'lucide-react';
import type { Notification, NotificationType } from '@/types/models/notification.types';

// Icônes pour chaque type de notification
const notificationIcons: Record<NotificationType, JSX.Element> = {
  'validation_participation': <Check className="w-4 h-4" />,
  'annulation_evenement': <X className="w-4 h-4" />,
  'modification_programme': <Calendar className="w-4 h-4" />,
  'nouvel_evenement': <Bell className="w-4 h-4" />,
  'nouvelle_oeuvre': <span>🎨</span>,
  'nouveau_commentaire': <span>💬</span>,
  'bienvenue': <span>👋</span>,
  'validation_compte': <Check className="w-4 h-4" />,
  'message_admin': <AlertCircle className="w-4 h-4" />,
  'rappel_evenement': <Bell className="w-4 h-4" />,
  'autre': <Bell className="w-4 h-4" />
};

// Couleurs pour chaque priorité
const priorityColors = {
  urgente: '#dc2626', // red-600
  haute: '#ea580c',   // orange-600
  normale: '#2563eb', // blue-600
  basse: '#6b7280'    // gray-500
};

export function NotificationToastListener() {
  const { notifications } = useNotifications();
  const previousCountRef = useRef(0);
  const notificationIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Au premier rendu, initialiser avec les IDs existants
    if (previousCountRef.current === 0 && notifications.length > 0) {
      notifications.forEach(n => notificationIdsRef.current.add(n.id_notification));
      previousCountRef.current = notifications.length;
      return;
    }

    // Détecter les nouvelles notifications
    if (notifications.length > previousCountRef.current) {
      // Trouver les nouvelles notifications
      const newNotifications = notifications.filter(
        n => !notificationIdsRef.current.has(n.id_notification)
      );

      // Afficher un toast pour chaque nouvelle notification
      newNotifications.forEach(notification => {
        showNotificationToast(notification);
        notificationIdsRef.current.add(notification.id_notification);
      });
    }

    previousCountRef.current = notifications.length;
  }, [notifications]);

  const showNotificationToast = (notification: Notification) => {
    const icon = notificationIcons[notification.type_notification];
    const color = priorityColors[notification.priorite || 'normale'];

    // Configuration du toast selon la priorité
    const toastOptions = {
      duration: notification.priorite === 'urgente' ? 10000 : 5000,
      dismissible: true,
      icon,
      style: {
        borderLeft: `4px solid ${color}`
      },
      action: notification.url_action ? {
        label: 'Voir',
        onClick: () => {
          window.location.href = notification.url_action!;
        }
      } : undefined
    };

    // Afficher le toast selon la priorité
    switch (notification.priorite) {
      case 'urgente':
        toast.error(notification.titre, {
          ...toastOptions,
          description: notification.message
        });
        break;
      case 'haute':
        toast.warning(notification.titre, {
          ...toastOptions,
          description: notification.message
        });
        break;
      default:
        toast(notification.titre, {
          ...toastOptions,
          description: notification.message
        });
    }

    // Jouer un son pour les notifications urgentes
    if (notification.priorite === 'urgente') {
      playNotificationSound();
    }
  };

  const playNotificationSound = () => {
    // Créer un son simple avec l'API Web Audio
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Impossible de jouer le son:', error);
    }
  };

  return null; // Ce composant n'affiche rien directement
}

// Hook pour afficher manuellement un toast de notification
export function useNotificationToast() {
  const showSuccess = (title: string, message?: string) => {
    toast.success(title, {
      description: message,
      duration: 4000,
      icon: <Check className="w-4 h-4" />
    });
  };

  const showError = (title: string, message?: string) => {
    toast.error(title, {
      description: message,
      duration: 5000,
      icon: <X className="w-4 h-4" />
    });
  };

  const showInfo = (title: string, message?: string) => {
    toast(title, {
      description: message,
      duration: 4000,
      icon: <Bell className="w-4 h-4" />
    });
  };

  return {
    showSuccess,
    showError,
    showInfo
  };
}