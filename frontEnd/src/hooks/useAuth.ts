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
import { detailsDesChamps, messageErreurServeur } from '@/utils/erreurServeur';
import { oublierSaisiesConservees } from '@/hooks/useSaisieConservee';
import i18next from 'i18next';

/**
 * Connexion ou inscription refusée : message, code et statut du serveur, détail des champs. Le formulaire
 * s'appuie sur le statut et le code (401 = identifiants incorrects, CONFLICT = e-mail déjà utilisé), et non
 * sur des mots du message, qui est traduit par le serveur (audit V11 FRM-5, FRM-9, FRM-18).
 */
function echecAuth(source: unknown, defaut: string): AuthResult {
  const s = source as { code?: unknown; status?: unknown } | null;
  return {
    success: false,
    error: messageErreurServeur(source, defaut),
    code: typeof s?.code === 'string' ? s.code : undefined,
    status: typeof s?.status === 'number' ? s.status : undefined,
    champs: detailsDesChamps(source),
  };
}

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
      
      return echecAuth(response, i18next.t('auth.errors.invalidCredentials', 'Email ou mot de passe incorrect'));
    } catch (error: unknown) {
      return {
        ...echecAuth(error, i18next.t('auth.errors.loginError', 'Erreur lors de la connexion'))
      };
    } finally {
      setLoginLoading(false);
    }
  }, [location.search, location.state, navigate, refreshPermissions]);

  /**
   * Déconnexion. « retour » : page où revenir après la reconnexion (déconnexion pour inactivité :
   * avant, l'administrateur arrivait sur /auth sans être ramené à sa page, audit V11 FRM-23)
   */
  const logout = useCallback(async (options?: { retour?: string }): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // déconnexion locale même si l'appel réseau échoue
    } finally {
      // Vider le cache des requêtes : rien de l'utilisateur précédent ne doit
      // réapparaître pour le suivant (poste partagé). Brouillons gardés à l'expiration de session aussi
      // (pas dans clearSession : elle s'exécute sur /auth juste après l'expiration, avant la reconnexion).
      oublierSaisiesConservees();
      await queryClient.cancelQueries();
      queryClient.clear();
      await refreshPermissions();
      const retour = options?.retour ? getSafeRedirectPath(options.retour) : null;
      navigate(retour && retour !== '/' ? `/auth?redirect=${encodeURIComponent(retour)}` : '/auth');
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
      
      return echecAuth(response, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'));
    } catch (error: unknown) {
      return echecAuth(error, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'));
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
            // La page traduit elle-même et ajoute la note sur la validation par l'équipe (avant : dite deux fois)
            state: { email: data.email, isProfessional: true }
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
      
      return echecAuth(response, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'));
    } catch (error: unknown) {
      return echecAuth(error, i18next.t('auth.errors.registerError', 'Erreur lors de l’inscription'));
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