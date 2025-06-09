// hooks/useAuthForNotifications.ts
// Adaptateur pour connecter votre système d'auth avec les notifications

import { useAuth } from './useAuth';
import AuthService from '@/services/auth.service';

/**
 * Hook adaptateur qui fournit le token et l'utilisateur
 * pour le système de notifications
 */
export const useAuthForNotifications = () => {
  // Utiliser votre hook useAuth existant
  const { user, isAuthenticated } = useAuth();
  
  // Récupérer le token directement depuis AuthService.getToken()
  const token = AuthService.getToken();
  
  return {
    token: isAuthenticated ? token : null,
    user: user,
    isAuthenticated: isAuthenticated
  };
};

// Export comme alias pour simplifier les imports
export { useAuthForNotifications as useNotificationAuth };