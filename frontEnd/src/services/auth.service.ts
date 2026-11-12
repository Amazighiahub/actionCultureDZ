// services/auth.service.ts
import { rattacherAppareil, retirerAppareilALaDeconnexion } from '@/utils/applicationMobile';
import { API_ENDPOINTS, ApiResponse, AuthTokenData, LoginCredentials, AUTH_CONFIG } from '@/config/api';
import { httpClient, doRefreshToken } from './httpClient';

// Types d'inscription : définis une seule fois, dans types/models/auth.types
import type { RegisterVisitorData, RegisterProfessionalData } from '@/types/models/auth.types';
export type { RegisterVisitorData, RegisterProfessionalData };

// Interface mise à jour pour correspondre au backend
export interface CurrentUser {
  id_user: number;
  email: string;
  nom: string;
  prenom: string;
  id_type_user: number;
  statut: string;
  statut_validation?: string;
  photo_url?: string;
  wilaya_residence?: number;
  date_creation?: string;
  derniere_connexion?: string;
  Roles?: Array<{
    id_role: number;
    nom_role: string;
  }>;
}

class AuthService {
  // ✅ SÉCURITÉ: Les tokens sont gérés UNIQUEMENT via cookies httpOnly
  // Le user est stocké en mémoire (pas localStorage) pour éviter l'exposition XSS.
  // Sur rechargement de page, loadUser() recharge depuis l'API via le cookie httpOnly.
  //
  // La deduplication des refresh concurrents est gérée par `doRefreshToken()`
  // dans httpClient.ts (module-level singleton) — partagée avec l'intercepteur
  // 401 du httpClient.

  private userCache: CurrentUser | null = null;

  /**
   * Nettoie les données de session locales
   * Note: Les cookies httpOnly sont supprimés côté serveur via /logout
   */
  private clearLocalAuthData(): void {
    localStorage.removeItem(AUTH_CONFIG.tokenKey); // Legacy cleanup
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey); // Legacy cleanup
    localStorage.removeItem(AUTH_CONFIG.tokenExpiryKey);
    // Ancienne copie de l'utilisateur (données personnelles) : jamais relue, effacée
    localStorage.removeItem('user');
  }

  /**
   * Stocke les métadonnées d'authentification (pas le token lui-même)
   * Le token est géré via cookie httpOnly côté serveur
   */
  private setAuthData(data: AuthTokenData): void {
    const tokenData = data as AuthTokenData & { expiresIn?: number; user?: CurrentUser };

    // Stocker la date d'expiration pour l'UX (savoir quand rafraîchir)
    if (tokenData.expiresIn) {
      const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString();
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
    } else if (data.expiresAt) {
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, data.expiresAt);
    } else {
      // Par défaut 15 minutes
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.expiration).toISOString();
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
    }

    // Token is managed via httpOnly cookies — do NOT store in localStorage

    // Stocker l'utilisateur en mémoire (pas localStorage — évite XSS)
    if (tokenData.user) {
      this.userCache = tokenData.user;
    }
  }

  async login(credentials: LoginCredentials) {
    const response = await httpClient.post<AuthTokenData>(API_ENDPOINTS.auth.login, credentials);
    if (response.success && response.data) {
      rattacherAppareil().catch(() => undefined);
      this.setAuthData(response.data);
    }
    return response;
  }

  /**
     * Appelle l'API pour vérifier un e-mail à l'aide d'un jeton.
     * Si la vérification réussit, connecte l'utilisateur.
     * @param token Le jeton de vérification provenant de l'URL.
     */
  async verifyEmail(token: string) {
    const endpoint = API_ENDPOINTS.auth.verifyEmail(token);
    const response = await httpClient.get<AuthTokenData>(endpoint);

    if (response.success && response.data) {
        this.setAuthData(response.data);
    }
    return response;
  }

  /**
   * ✅ SÉCURITÉ: Rafraîchit le token d'accès via cookie httpOnly
   * Le refresh token est envoyé automatiquement via le cookie.
   *
   * Délègue à `doRefreshToken()` (module-level dans httpClient.ts) qui
   * déduplique entre tous les appelants : l'intercepteur 401 du httpClient
   * et cet appel direct partagent la même promesse en vol, évitant les
   * INVALID_REFRESH_TOKEN dus aux refresh concurrents (rotation usage unique).
   */
  async refreshToken(): Promise<ApiResponse<AuthTokenData>> {
    try {
      const result = await doRefreshToken();
      if (result.success) {
        // setAuthData deja fait dans doRefreshToken (expiry + user).
        // On reconstruit juste une ApiResponse<AuthTokenData> pour compat caller.
        return {
          success: true,
          data: {
            expiresIn: result.expiresIn,
            user: result.user,
          } as unknown as AuthTokenData,
        };
      }
      if (result.error?.includes('expiré') || result.error?.includes('expired')) {
        this.clearLocalAuthData();
        this.clearUserCache();
      }
      return { success: false, error: result.error || 'Token refresh failed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /** @param options.silentAuth vérification au démarrage : session expirée = visiteur, sans redirection */
  async getCurrentUser(options?: { silentAuth?: boolean }): Promise<ApiResponse<CurrentUser>> {
    const response = await httpClient.get<CurrentUser>(API_ENDPOINTS.auth.me, undefined, options);
    // Après un rechargement de page, c'est ce premier appel qui reconstitue l'utilisateur en mémoire
    if (response.success && response.data) {
      this.userCache = response.data;
    }
    return response;
  }

  /**
   * Une session a été ouverte sur ce navigateur (date d'expiration posée à la connexion).
   * L'utilisateur, lui, n'est gardé qu'en mémoire : après un rechargement de page, ce repère
   * permet de redemander au serveur qui est connecté (le cookie httpOnly fait foi, et
   * l'intercepteur 401 le renouvelle s'il a expiré) au lieu de conclure à une déconnexion.
   */
  hasSessionHint(): boolean {
    return !!localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);
  }

  /** Session refusée par le serveur : oublier l'utilisateur et le repère de session */
  clearSession(): void {
    this.userCache = null;
    this.clearLocalAuthData();
  }

  // Inscription
  async registerVisitor(data: RegisterVisitorData): Promise<ApiResponse<AuthTokenData>> {
    // Transformer les noms de champs français vers les noms attendus par l'API
    const { 
      mot_de_passe, 
      confirmation_mot_de_passe,
      accepte_conditions,
      accepte_newsletter,
      ...rest 
    } = data;
    
    const registerData = {
      ...rest,
      password: mot_de_passe,
      password_confirmation: confirmation_mot_de_passe,
      accepte_conditions,
      accepte_newsletter: accepte_newsletter || false,
      type_user: 'visiteur'
    };
    
    const response = await httpClient.post<AuthTokenData>(API_ENDPOINTS.auth.register, registerData);
    if (response.success && response.data) {
      this.setAuthData(response.data);
    }
    return response;
  }

  // Dans auth.service.ts - méthode registerProfessional

async registerProfessional(data: RegisterProfessionalData): Promise<ApiResponse<AuthTokenData>> {
  // Transformer les noms de champs français vers les noms attendus par l'API
  const { 
    mot_de_passe, 
    confirmation_mot_de_passe,
    accepte_conditions,
    accepte_newsletter,
    ...rest 
  } = data;
  
  const registerData = {
    ...rest,
    password: mot_de_passe,
    password_confirmation: confirmation_mot_de_passe,
    accepte_conditions,
    accepte_newsletter: accepte_newsletter || false
  };
  
  const response = await httpClient.post<AuthTokenData>(API_ENDPOINTS.auth.register, registerData);
  
  if (response.success && response.data) {
    this.setAuthData(response.data);
    
    // Si l'API retourne aussi l'utilisateur
    const tokenData = response.data as AuthTokenData & { user?: CurrentUser };
    if (tokenData.user) {
      this.userCache = tokenData.user;
    }
  }
  
  return response;
}
  /**
   * ✅ Vérifie si l'utilisateur est authentifié
   * Basé sur le cache user et l'expiration stockée
   * Le vrai token (cookie httpOnly) est validé côté serveur à chaque requête
   */
  isAuthenticated(): boolean {
    const cachedUser = this.getCurrentUserFromCache();
    const expiresAt = localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);

    // Pas de user en cache = pas authentifié
    if (!cachedUser) {
      return false;
    }

    // Vérifier l'expiration si disponible
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const isValid = expiry > new Date();

      // Si expiré, tenter un refresh automatique (en background)
      if (!isValid) {
        this.refreshToken().catch(() => {
          this.clearUserCache();
        });
        // Retourner true pour éviter une déconnexion immédiate
        // Le refresh en cours déterminera le vrai état
        return true;
      }
      return isValid;
    }

    // User en cache sans expiration = considérer comme authentifié
    return true;
  }

  /**
   * @deprecated Token géré via cookie httpOnly, cette méthode retourne null
   */
  getAuthToken(): string | null {
    return null; // Token non accessible en JS (cookie httpOnly)
  }

  /**
   * Récupère l'utilisateur actuel depuis le cache in-memory (sans appel API)
   * @returns L'utilisateur ou null
   */
  getCurrentUserFromCache(): CurrentUser | null {
    return this.userCache;
  }

  /**
   * Efface le cache utilisateur
   */
  clearUserCache(): void {
    this.userCache = null;
  }

  /**
   * Déconnexion - efface les données locales et appelle l'API pour supprimer les cookies
   */
  async logout(): Promise<ApiResponse<void>> {
    // Avant de quitter la session : ce téléphone ne reçoit plus les notifications de ce compte
    await retirerAppareilALaDeconnexion();
    // Nettoyer le cache local avant l'appel réseau (session invalide même si réseau échoue)
    this.clearLocalAuthData();
    this.clearUserCache();
    return httpClient.post<void>(API_ENDPOINTS.auth.logout);
  }

}

export const authService = new AuthService();
export type { LoginCredentials };