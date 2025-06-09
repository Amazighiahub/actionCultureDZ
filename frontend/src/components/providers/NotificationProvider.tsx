
// src/components/providers/NotificationProvider.tsx - Provider pour les notifications
import React, { createContext, useContext } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationContainer } from '../ui/NotificationContainer';

const NotificationContext = createContext<ReturnType<typeof useNotifications> | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notifications = useNotifications();

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
      <NotificationContainer notifications={notifications.notifications} onRemove={notifications.removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationProvider');
  }
  return context;
};

