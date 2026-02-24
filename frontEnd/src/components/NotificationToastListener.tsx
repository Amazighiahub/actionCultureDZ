// components/NotificationToastListener.tsx
/* eslint-disable @typescript-eslint/no-explicit-any *//* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { socketService } from '@/services/socketService';

// Export séparé du hook personnalisé pour éviter les problèmes de Fast Refresh
export function useNotificationToast() {
  const { toast } = useToast();

  useEffect(() => {
    const handleNewNotification = (notification: any) => {
      toast({
        title: notification.titre,
        description: notification.message,
        duration: 5000,
      });
    };

    // S'abonner uniquement aux notifications via WebSocket
    socketService.on('notification:new', handleNewNotification);

    return () => {
      socketService.off('notification:new', handleNewNotification);
    };
  }, [toast]);
}

// Composant principal exporté par défaut
const NotificationToastListener = () => {
  useNotificationToast();
  return null;
};

export default NotificationToastListener;