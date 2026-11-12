// services/user.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';
import { prepareImageForUpload } from '@/utils/prepareImageForUpload';

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  type_user: string;
  statut: string;
  date_naissance?: string;
  sexe?: 'M' | 'F';
  telephone?: string;
  wilaya_residence?: number;
  photo_url?: string;
  biographie?: string;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileData {
  nom?: string;
  prenom?: string;
  telephone?: string;
  biographie?: string;
  wilaya_residence?: number;
}

interface ChangePasswordData {
  ancien_mot_de_passe: string;
  nouveau_mot_de_passe: string;
  confirmation_mot_de_passe: string;
}

interface ProfessionalSubmissionData {
  type_user: string;
  biographie: string;
  specialites?: number[];
  certifications?: Array<{ id: number; nom: string; date_obtention?: string }>;
  portfolio?: Array<{ url: string; type: string; titre?: string }>;
}

interface UserStatistics {
  total_oeuvres: number;
  total_evenements: number;
  total_participations: number;
  total_favoris: number;
  derniere_activite: string;
}

interface UserPreferences {
  notifications_email: boolean;
  notifications_push: boolean;
  newsletter: boolean;
  langue_preferee: string;
  theme_prefere: 'light' | 'dark' | 'auto';
}

interface PrivacySettings {
  profil_public: boolean;
  afficher_email: boolean;
  afficher_telephone: boolean;
  afficher_localisation: boolean;
}

class UserService extends BaseService<User> {
  constructor() {
    super(API_ENDPOINTS.auth.me);
  }

  // Profil
  async getProfile(): Promise<ApiResponse<User>> {
    return httpClient.get<User>(API_ENDPOINTS.auth.me);
  }

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    return httpClient.put<User>(API_ENDPOINTS.auth.updateProfile, data);
  }

  /**
   * Photo de profil : seul chemin d'envoi. Réduite avant l'envoi ; la route enregistre la photo
   * et met le profil à jour. (Avant : un envoi en POST vers /users/profile/photo, route en PATCH.)
   */
  async updateProfilePhoto(file: File): Promise<ApiResponse<{ url: string; filename?: string }>> {
    const formData = new FormData();
    formData.append('image', await prepareImageForUpload(file));
    // httpClient : jeton anti-CSRF, renouvellement de session et adresse de l'API
    return httpClient.upload<{ url: string; filename?: string }>('/upload/profile-photo', formData);
  }

  async deleteProfilePhoto(): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.auth.deletePhoto);
  }

  // Mot de passe et vérification
  /** RGPD : télécharge toutes les données du compte au format JSON */
  async exportMyData(): Promise<ApiResponse<Blob>> {
    const date = new Date().toISOString().slice(0, 10);
    return httpClient.download(API_ENDPOINTS.auth.exportData, `mes-donnees-${date}.json`);
  }

  /** RGPD : suppression définitive du compte, confirmée par le mot de passe */
  async deleteMyAccount(password: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.auth.deleteAccount, { password });
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.changePassword, data);
  }

  /** Changer d'adresse : un lien de confirmation part vers la nouvelle adresse (l'actuelle est prévenue) */
  async requestEmailChange(newEmail: string, password: string): Promise<ApiResponse<{ newEmail: string }>> {
    return httpClient.post<{ newEmail: string }>(API_ENDPOINTS.auth.requestEmailChange, { newEmail, password });
  }

  async forgotPassword(email: string, turnstileToken?: string | null): Promise<ApiResponse<{ message: string }>> {
    return httpClient.post<{ message: string }>(API_ENDPOINTS.auth.forgotPassword, {
      email,
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.resetPassword, {
      token,
      newPassword
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return httpClient.get<void>(API_ENDPOINTS.auth.verifyEmail(token));
  }

  async sendVerificationEmail(): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.sendVerificationEmail);
  }

  // Professionnel
  async submitProfessionalRequest(data: ProfessionalSubmissionData): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.submitProfessional, data);
  }

  async getProfessionalStatus(): Promise<ApiResponse<{
    statut: string;
    date_demande: string;
    commentaire?: string;
  }>> {
    return httpClient.get<{ statut: string; date_demande: string; commentaire?: string }>(API_ENDPOINTS.auth.professionalStatus);
  }

  // Préférences et confidentialité
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<ApiResponse<UserPreferences>> {
    return httpClient.put<UserPreferences>(API_ENDPOINTS.auth.updatePreferences, preferences);
  }

  async updatePrivacy(settings: Partial<PrivacySettings>): Promise<ApiResponse<PrivacySettings>> {
    return httpClient.put<PrivacySettings>(API_ENDPOINTS.auth.updatePrivacy, settings);
  }

  // Statistiques et types
  async getStatistics(): Promise<ApiResponse<UserStatistics>> {
    return httpClient.get<UserStatistics>(API_ENDPOINTS.auth.statistics);
  }

  async getTypesUtilisateurs(): Promise<ApiResponse<Array<{
    id: string;
    label: string;
    description: string;
    requires_validation: boolean;
  }>>> {
    return httpClient.get<Array<{ id: string; label: string; description: string; requires_validation: boolean }>>(API_ENDPOINTS.auth.typesUtilisateurs);
  }

  // Administration
  async getAllUsers(params?: Record<string, string | number | boolean>): Promise<ApiResponse<PaginatedResponse<User>>> {
    return httpClient.getPaginated<User>(API_ENDPOINTS.auth.admin.getAllUsers, params);
  }

  async getUserById(id: number): Promise<ApiResponse<User>> {
    return httpClient.get<User>(API_ENDPOINTS.auth.admin.getUserById(id));
  }

  async getPendingProfessionals(): Promise<ApiResponse<User[]>> {
    return httpClient.get<User[]>(API_ENDPOINTS.auth.admin.getPendingProfessionals);
  }

  async validateProfessional(id: number, validated: boolean, comment?: string): Promise<ApiResponse<User>> {
    return httpClient.post<User>(API_ENDPOINTS.auth.admin.validateProfessional(id), {
      validated,
      comment
    });
  }

  async updateUserStatus(id: number, status: string, reason?: string): Promise<ApiResponse<User>> {
    return httpClient.put<User>(API_ENDPOINTS.auth.admin.updateUserStatus(id), {
      status,
      reason
    });
  }

  async assignRole(userId: number, roleId: number): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.admin.assignRole(userId), { role_id: roleId });
  }

  async removeRole(userId: number, roleId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${API_ENDPOINTS.auth.admin.removeRole(userId)}/${roleId}`);
  }

  async getGlobalStatistics(): Promise<ApiResponse<{
    total_users: number;
    users_by_type: Record<string, number>;
    users_by_status: Record<string, number>;
    registrations_by_month: Array<{ month: string; count: number }>;
  }>> {
    return httpClient.get<{ total_users: number; users_by_type: Record<string, number>; users_by_status: Record<string, number>; registrations_by_month: Array<{ month: string; count: number }> }>(API_ENDPOINTS.auth.admin.globalStatistics);
  }
}

export const userService = new UserService();
export type { User, UpdateProfileData, ChangePasswordData, ProfessionalSubmissionData, UserStatistics, UserPreferences, PrivacySettings };