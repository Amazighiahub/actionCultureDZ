// services/user.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any *//* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';

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
  certifications?: any[];
  portfolio?: any[];
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

  async updateProfilePhoto(file: File): Promise<ApiResponse<{ photo_url: string }>> {
    return httpClient.uploadFile<{ photo_url: string }>(
      API_ENDPOINTS.auth.updatePhoto,
      file,
      { fieldName: 'photo' }
    );
  }

  async deleteProfilePhoto(): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.auth.deletePhoto);
  }

  // Mot de passe et vérification
  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.changePassword, data);
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return httpClient.post<{ message: string }>(API_ENDPOINTS.auth.forgotPassword, { email });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.resetPassword, {
      token,
      password,
      password_confirmation: password
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.auth.verifyEmail(token));
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
    return httpClient.get<any>(API_ENDPOINTS.auth.professionalStatus);
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
    return httpClient.get<any>(API_ENDPOINTS.auth.typesUtilisateurs);
  }

  // Administration
  async getAllUsers(params?: any): Promise<ApiResponse<PaginatedResponse<User>>> {
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
    return httpClient.get<any>(API_ENDPOINTS.auth.admin.globalStatistics);
  }
}

export const userService = new UserService();
export type { User, UpdateProfileData, ChangePasswordData, ProfessionalSubmissionData, UserStatistics, UserPreferences, PrivacySettings };