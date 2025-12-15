// hooks/useAuth.ts - VERSION CORRIGÉE
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import type { 
  LoginCredentials, 
  RegisterVisitorData, 
  RegisterProfessionalData 
} from '@/services/auth.service';
import type { UseAuthReturn, AuthResult } from '../types/models/auth.types';

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
   * ✅ CORRIGÉ: Connexion - retourne maintenant AuthResult
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      setLoginLoading(true);
      
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        // Le token est stocké par authService.login via setAuthData
        await refreshPermissions();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Récupérer l'utilisateur fraîchement chargé
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
        
        return { success: true };
      }
      
      // ✅ Retourner le message d'erreur du backend
      return { 
        success: false, 
        error: response.error || 'Email ou mot de passe incorrect'
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la connexion'
      };
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
      await refreshPermissions();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      await refreshPermissions();
      navigate('/auth');
    }
  }, [navigate, refreshPermissions]);

  /**
   * ✅ CORRIGÉ: Inscription visiteur - retourne maintenant AuthResult
   */
  const registerVisitor = useCallback(async (data: RegisterVisitorData): Promise<AuthResult> => {
    try {
      setRegisterLoading(true);
      
      const response = await authService.registerVisitor(data);
      
      if (response.success && response.data) {
        await refreshPermissions();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Vérifier si vérification email nécessaire
        const needsEmailVerification = (response.data as any).needsEmailVerification;
        
        if (needsEmailVerification) {
          // Rediriger vers page de confirmation email
          navigate('/verification-email-envoyee', {
            state: {
              email: data.email,
              message: 'Un email de vérification a été envoyé à votre adresse.'
            }
          });
        } else {
          // Mode dev ou email déjà vérifié - rediriger vers accueil
          navigate('/');
        }
        
        return { success: true };
      }
      
      // ✅ Retourner le message d'erreur du backend
      return { 
        success: false, 
        error: response.error || 'Une erreur est survenue lors de l\'inscription'
      };
    } catch (error: any) {
      console.error('Register visitor error:', error);
      return { 
        success: false, 
        error: error.message || 'Une erreur est survenue lors de l\'inscription'
      };
    } finally {
      setRegisterLoading(false);
    }
  }, [navigate, refreshPermissions]);

  /**
   * ✅ CORRIGÉ: Inscription professionnel - retourne maintenant AuthResult
   */
  const registerProfessional = useCallback(async (data: RegisterProfessionalData): Promise<AuthResult> => {
    try {
      setRegisterLoading(true);
      
      const response = await authService.registerProfessional(data);
      
      if (response.success && response.data) {
        await refreshPermissions();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Vérifier si vérification email nécessaire
        const needsEmailVerification = (response.data as any).needsEmailVerification;
        const needsAdminValidation = (response.data as any).needsAdminValidation;
        
        if (needsEmailVerification) {
          // Rediriger vers page de confirmation email
          navigate('/verification-email-envoyee', {
            state: {
              email: data.email,
              message: 'Un email de vérification a été envoyé. Après vérification, votre compte sera soumis à validation par un administrateur.',
              isProfessional: true
            }
          });
        } else if (needsAdminValidation) {
          // Mode dev - email vérifié mais en attente validation admin
          navigate('/dashboard-pro', {
            state: {
              message: 'Votre compte professionnel a été créé et est en attente de validation par un administrateur.'
            }
          });
        } else {
          // Compte actif (rare pour un pro)
          navigate('/dashboard-pro');
        }
        
        return { success: true };
      }
      
      // ✅ Retourner le message d'erreur du backend
      return { 
        success: false, 
        error: response.error || 'Une erreur est survenue lors de l\'inscription'
      };
    } catch (error: any) {
      console.error('Register professional error:', error);
      return { 
        success: false, 
        error: error.message || 'Une erreur est survenue lors de l\'inscription'
      };
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
    
    // Actions - ✅ retournent maintenant AuthResult
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