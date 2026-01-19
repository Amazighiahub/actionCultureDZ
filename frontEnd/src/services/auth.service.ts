// services/auth.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, AuthTokenData, LoginCredentials, RefreshTokenRequest, AUTH_CONFIG } from '@/config/api';
import { httpClient } from './httpClient';
import { uploadService as UploadService } from "./upload.service";
import { mediaService as MediaService } from "./media.service";

export interface RegisterVisitorData {
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  date_naissance: string;
  email: string;
  mot_de_passe: string;
  confirmation_mot_de_passe: string;
  wilaya_residence: number;
  telephone?: string;
  accepte_conditions: boolean;
  accepte_newsletter?: boolean;
}

export interface RegisterProfessionalData extends RegisterVisitorData {
  photo_url?: string;
  biographie: string;
  id_type_user: number;
}

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
  // ✅ SÉCURITÉ: Les tokens sont maintenant gérés via cookies httpOnly
  // Le localStorage est conservé uniquement pour la compatibilité pendant la transition

  // Token management - Lecture depuis localStorage (fallback uniquement)
  private getToken(): string | null {
    // Note: Le vrai token est dans un cookie httpOnly (non accessible en JS)
    // Ce fallback permet la transition progressive
    return localStorage.getItem(AUTH_CONFIG.tokenKey);
  }

  private setToken(token: string): void {
    // ✅ SÉCURITÉ: Stocker aussi en localStorage pour compatibilité
    // Le cookie httpOnly est défini côté serveur automatiquement
    localStorage.setItem(AUTH_CONFIG.tokenKey, token);

    // Calculer et stocker la date d'expiration (15 minutes)
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.expiration).toISOString();
    localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
  }

  private removeToken(): void {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
    localStorage.removeItem(AUTH_CONFIG.tokenExpiryKey);
    // Note: Les cookies httpOnly sont supprimés via l'appel à /logout
  }

  private setAuthData(data: AuthTokenData): void {
    // Stocker le token en localStorage (compatibilité)
    if (data.token) {
      this.setToken(data.token);
    }

    // Stocker le refresh token (compatibilité - le vrai est dans un cookie httpOnly)
    if (data.refreshToken) {
      localStorage.setItem(AUTH_CONFIG.refreshTokenKey, data.refreshToken);
    }

    // Calculer l'expiration si expiresIn est fourni (en secondes)
    if ((data as any).expiresIn) {
      const expiresAt = new Date(Date.now() + (data as any).expiresIn * 1000).toISOString();
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
    } else if (data.expiresAt) {
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, data.expiresAt);
    }
  }

  async login(credentials: LoginCredentials) {
    const response = await httpClient.post<AuthTokenData>(API_ENDPOINTS.auth.login, credentials);
    if (response.success && response.data) {
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
    const response = await httpClient.post<AuthTokenData>(endpoint);

    if (response.success && response.data) {
        this.setAuthData(response.data);
    }
    return response;
  }

  /**
   * ✅ SÉCURITÉ: Rafraîchit le token d'accès via cookie httpOnly
   * Le refresh token est envoyé automatiquement via le cookie
   * Fallback sur localStorage pour compatibilité
   */
  async refreshToken(): Promise<ApiResponse<AuthTokenData>> {
    // Le refresh token est envoyé automatiquement via cookie httpOnly
    // Le fallback localStorage est utilisé si le cookie n'est pas disponible
    const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);

    // Appel à l'API - le cookie httpOnly sera envoyé automatiquement
    const response = await httpClient.post<AuthTokenData>(
      '/users/refresh-token',
      refreshToken ? { refreshToken } : {} // Fallback si cookie non disponible
    );

    if (response.success && response.data) {
      this.setAuthData(response.data);
      console.log('✅ Token rafraîchi avec succès');
    } else {
      console.warn('⚠️ Échec du rafraîchissement du token');
      // Si le refresh échoue, nettoyer les tokens
      if (response.error?.includes('expiré') || response.error?.includes('expired')) {
        this.removeToken();
        this.clearUserCache();
      }
    }
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    return httpClient.get<CurrentUser>(API_ENDPOINTS.auth.me);
  }

  async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
    // Vérification locale du token car l'endpoint n'existe pas
    const token = this.getToken();
    const expiresAt = localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);
    
    if (!token) {
      return { success: true, data: { valid: false } };
    }
    
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const isValid = expiry > new Date();
      return { success: true, data: { valid: isValid } };
    }
    
    // Si pas de date d'expiration, on considère le token comme valide
    return { success: true, data: { valid: true } };
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
    
    console.log('Données envoyées à l\'API:', registerData);
    
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
  
  console.log('Données professionnel envoyées à l\'API:', registerData);
  console.log('📸 Photo URL présente ?', !!registerData.photo_url);
  console.log('📸 Photo URL:', registerData.photo_url);
  console.log('📸 Longueur URL:', registerData.photo_url?.length);
  
  const response = await httpClient.post<AuthTokenData>(API_ENDPOINTS.auth.register, registerData);
  
  console.log('📥 Réponse inscription:', response);
  
  if (response.success && response.data) {
    console.log('✅ Inscription réussie, données reçues:', response.data);
    this.setAuthData(response.data);
    
    // Si l'API retourne aussi l'utilisateur
    if ((response.data as any).user) {
      console.log('👤 Utilisateur reçu:', (response.data as any).user);
      localStorage.setItem('user', JSON.stringify((response.data as any).user));
    }
  }
  
  return response;
}
  /**
   * ✅ Vérifie si l'utilisateur est authentifié
   * Note: Avec les cookies httpOnly, on vérifie l'expiration stockée
   * Le vrai token est validé côté serveur à chaque requête
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const expiresAt = localStorage.getItem(AUTH_CONFIG.tokenExpiryKey);

    // Si pas de token en localStorage, l'utilisateur pourrait quand même
    // être authentifié via cookie httpOnly (vérifier via /profile)
    if (!token) {
      // Vérifier si on a un user en cache (indique une session active)
      const cachedUser = this.getCurrentUserFromCache();
      return !!cachedUser;
    }

    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const isValid = expiry > new Date();

      // Si expiré, tenter un refresh automatique (en background)
      if (!isValid) {
        this.refreshToken().catch(() => {
          console.log('🔄 Refresh automatique échoué, session expirée');
        });
        // Retourner true pour éviter une déconnexion immédiate
        // Le refresh en cours déterminera le vrai état
        return true;
      }
      return isValid;
    }

    return true;
  }

  getAuthToken(): string | null {
    return this.getToken();
  }

  /**
   * Transforme les erreurs de validation de l'API
   * pour correspondre aux noms de champs français
   */
  transformValidationErrors(errors: any[]): any[] {
    if (!Array.isArray(errors)) return errors;
    
    const fieldMapping: Record<string, string> = {
      'password': 'mot_de_passe',
      'password_confirmation': 'confirmation_mot_de_passe'
    };
    
    return errors.map(error => {
      if (error.field && fieldMapping[error.field]) {
        return {
          ...error,
          field: fieldMapping[error.field]
        };
      }
      return error;
    });
  }

  async updateProfile(data: Partial<CurrentUser>): Promise<ApiResponse<CurrentUser>> {
  try {
    console.log('📝 Mise à jour du profil:', data);
    const response = await httpClient.put<CurrentUser>(API_ENDPOINTS.auth.updateProfile, data);
    
    if (response.success && response.data) {
      // Mettre à jour le localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response;
  } catch (error) {
    console.error('❌ Erreur updateProfile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil'
    };
  }
}

async updateProfilePhoto(photoFile: File): Promise<ApiResponse<any>> {
  try {
    console.log('📸 Upload photo profil après inscription');
    console.log('📁 Fichier:', {
      name: photoFile.name,
      size: `${(photoFile.size / 1024 / 1024).toFixed(2)} MB`,
      type: photoFile.type
    });
    
    // Option 1 : Utiliser mediaService.uploadProfilePhoto qui existe déjà
    const { mediaService } = MediaService;
    const uploadResult = await mediaService.uploadProfilePhoto(photoFile);
    
    console.log('📥 Réponse upload photo profil:', uploadResult);
    
    if (uploadResult.success && uploadResult.data) {
      // La méthode uploadProfilePhoto met déjà à jour le profil via l'API
      // Elle retourne aussi l'URL de la photo
      
      // Mettre à jour l'utilisateur en localStorage
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          user.photo_url = uploadResult.data.url || uploadResult.data.filename;
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Photo URL mise à jour dans localStorage:', user.photo_url);
        } catch (e) {
          console.error('❌ Erreur parsing user:', e);
        }
      }
    }
    
    return uploadResult;
  } catch (error) {
    console.error('❌ Erreur upload photo profil:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'upload de la photo'
    };
  }
}

// Alternative si vous voulez utiliser directement uploadService
async updateProfilePhotoAlternative(photoFile: File): Promise<ApiResponse<any>> {
  try {
    console.log('📸 Upload photo profil via uploadService');
    
    // Importer uploadService directement
    const { uploadService } = UploadService;
    
    // Upload de l'image
    const uploadResult = await uploadService.uploadImage(photoFile, {
      isPublic: false,
      generateThumbnail: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9
    });
    
    if (uploadResult.success && uploadResult.data) {
      // Mettre à jour le profil avec l'URL de la photo
      const updateResult = await this.updateProfile({
        photo_url: uploadResult.data.url
      });
      
      if (updateResult.success) {
        console.log('✅ Profil mis à jour avec la photo');
        return uploadResult;
      } else {
        console.error('❌ Erreur mise à jour profil:', updateResult.error);
        return updateResult;
      }
    }
    
    return uploadResult;
  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur upload photo'
    };
  }
}

/**
   * Récupère l'ID de l'utilisateur actuel depuis le localStorage
   * @returns L'ID de l'utilisateur ou null
   */
  getCurrentUserId(): number | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id_user || null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
    }
    return null;
  }

  /**
   * Récupère l'utilisateur actuel depuis le localStorage (sans appel API)
   * @returns L'utilisateur ou null
   */
  getCurrentUserFromCache(): CurrentUser | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr) as CurrentUser;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur du cache:', error);
    }
    return null;
  }

  /**
   * Récupère et met en cache l'utilisateur actuel
   * @param forceRefresh Force le rechargement depuis l'API
   * @returns L'utilisateur actuel
   */
  async getCurrentUserAndCache(forceRefresh = false): Promise<CurrentUser | null> {
    // Si on a déjà l'utilisateur en cache et qu'on ne force pas le refresh
    if (!forceRefresh) {
      const cachedUser = this.getCurrentUserFromCache();
      if (cachedUser) {
        return cachedUser;
      }
    }

    // Sinon, on récupère depuis l'API
    const response = await this.getCurrentUser();
    if (response.success && response.data) {
      // Mettre en cache
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }

    return null;
  }

  /**
   * Met à jour l'utilisateur en cache
   * @param user Les données utilisateur à mettre en cache
   */
  updateUserCache(user: Partial<CurrentUser>): void {
    const currentUser = this.getCurrentUserFromCache();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }

  /**
   * Efface le cache utilisateur
   */
  clearUserCache(): void {
    localStorage.removeItem('user');
  }

// Et modifiez votre méthode logout() existante (ligne ~95) pour ajouter clearUserCache():
  async logout(): Promise<ApiResponse<void>> {
    const response = await httpClient.post<void>(API_ENDPOINTS.auth.logout);
    this.removeToken();
    this.clearUserCache(); // <-- Ajoutez cette ligne
    return response;
  }

}

export const authService = new AuthService();
export type { LoginCredentials };