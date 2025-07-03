// hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import type { 
  LoginCredentials, 
  RegisterVisitorData, 
  RegisterProfessionalData 
} from '@/services/auth.service';
import type { UseAuthReturn } from '../types/models/auth.types';

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isProfessional,
    isVisitor,
    needsValidation,
    statusMessage,
    refreshPermissions
  } = usePermissionsContext();

  // État local pour les actions
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  /**
   * Connexion
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setLoginLoading(true);
      
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        // Le token est déjà stocké par authService.login via setAuthData
        
        // IMPORTANT: Rafraîchir immédiatement les permissions
        // Cela va mettre à jour l'état user dans le contexte
        await refreshPermissions();
        
        // Attendre un tick pour que le contexte se mette à jour
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Maintenant récupérer l'utilisateur fraîchement chargé
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          const currentUser = userResponse.data;
          
          // Redirection selon le rôle de l'utilisateur
          if (currentUser.Roles?.some(r => r.nom_role === 'Administrateur')) {
            navigate('/admin/dashboard');
          } else if (currentUser.id_type_user !== 1) {
            // Professionnel
            navigate('/dashboard-pro');
          } else {
            // Visiteur
            navigate('/');
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoginLoading(false);
    }
  }, [navigate, refreshPermissions]);

  /**
   * Déconnexion
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      // IMPORTANT: Rafraîchir immédiatement pour vider l'état
      await refreshPermissions();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      // Même en cas d'erreur, on rafraîchit et redirige
      await refreshPermissions();
      navigate('/auth');
    }
  }, [navigate, refreshPermissions]);

  /**
   * Inscription visiteur
   */
  const registerVisitor = useCallback(async (data: RegisterVisitorData): Promise<boolean> => {
    try {
      setRegisterLoading(true);
      
      const response = await authService.registerVisitor(data);
      
      if (response.success && response.data) {
        // Le token est déjà stocké par authService via setAuthData
        await refreshPermissions();
        
        // Attendre que le contexte se mette à jour
        await new Promise(resolve => setTimeout(resolve, 100));
        
        navigate('/');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Register visitor error:', error);
      return false;
    } finally {
      setRegisterLoading(false);
    }
  }, [navigate, refreshPermissions]);

  /**
   * Inscription professionnel
   */
  const registerProfessional = useCallback(async (data: RegisterProfessionalData): Promise<boolean> => {
    try {
      setRegisterLoading(true);
      
      const response = await authService.registerProfessional(data);
      
      if (response.success && response.data) {
        // Le token est déjà stocké par authService via setAuthData
        await refreshPermissions();
        
        // Attendre que le contexte se mette à jour
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Rediriger avec message de validation
        navigate('/dashboard', {
          state: {
            message: 'Votre compte professionnel a été créé et est en attente de validation.'
          }
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Register professional error:', error);
      return false;
    } finally {
      setRegisterLoading(false);
    }
  }, [navigate, refreshPermissions]);

  return {
    // État utilisateur
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isProfessional,
    isVisitor,
    needsValidation,
    statusMessage,
    
    // Actions
    login,
    logout,
    registerVisitor,
    registerProfessional,
    refreshUser: refreshPermissions,
    
    // État des actions
    loginLoading,
    registerLoading
  };
}