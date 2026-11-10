// hooks/useAuth.ts - VERSION CORRIGÉE
import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import type { 
  LoginCredentials, 
  RegisterVisitorData, 
  RegisterProfessionalData 
} from '@/services/auth.service';
import type { UseAuthReturn, AuthResult } from '../types/models/auth.types';
import { getSafeRedirectPath } from '@/utils/safeUrl';
import { queryClient } from '@/lib/queryClient';
import { messageErreurServeur } from '@/utils/erreurServeur';
import i18next from 'i18next';

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const location = useLocation();
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

          const depuis = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
          const stateFrom = depuis?.pathname ? `${depuis.pathname}${depuis.search || ''}` : undefined;
          const redirectFromQuery = new URLSearchParams(location.search).get('redirect');
          // Chemins internes uniquement (pas de redirection ouverte vers un autre site)
          const redirectTarget = getSafeRedirectPath(redirectFromQuery) ?? getSafeRedirectPath(stateFrom);

          if (redirectTarget) {
            navigate(redirectTarget, { replace: true });
          } else {
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
        }
        
        return { success: true };
      }
      
      // ✅ Retourner le message d'erreur du backend
      return { 
        success: false, 
        error: messageErreurServeur(response, i18next.t('auth.errors.invalidCredentials', 'Email ou mot de passe incorrect'))
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: messageErreurServeur(error, i18next.t('auth.errors.loginError', 'Erreur lors de la connexion'))
      };
    } finally {
      setLoginLoading(false);
    }
  }, [location.search, location.state, navigate, refreshPermissions]);

  /**
   * Déconnexion
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // déconnexion locale même si l'appel réseau échoue
    } finally {
      // Vider le cache des requêtes : rien de l'utilisateur précédent ne doit
      // réapparaître pour le suivant (poste partagé)
      await queryClient.cancelQueries();
      queryClient.clear();
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
        const authData = response.data as { needsEmailVerification?: boolean };
        const needsEmailVerification = authData.needsEmailVerification;

        if (needsEmailVerification) {
          // Rediriger vers page de confirmation email
          navigate('/verification-email-envoyee', {
            // Pas de texte ici : la page traduit son message (avant, ce texte français s'affichait aussi en arabe)
            state: { email: data.email }
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
        error: messageErreurServeur(response, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'))
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: messageErreurServeur(error, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'))
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
        const authData = response.data as { needsEmailVerification?: boolean; needsAdminValidation?: boolean };
        const needsEmailVerification = authData.needsEmailVerification;
        const needsAdminValidation = authData.needsAdminValidation;
        
        if (needsEmailVerification) {
          // Rediriger vers page de confirmation email
          navigate('/verification-email-envoyee', {
            state: {
              email: data.email,
              message: i18next.t('auth.emailVerificationPro', 'Un e-mail de vérification vous a été envoyé. Après cette vérification, votre compte professionnel sera validé par l’équipe.'),
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
        error: messageErreurServeur(response, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'))
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: messageErreurServeur(error, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'))
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