// services/auth.service.ts - Service d'authentification corrigé

import { apiService, ApiException, ApiResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { User } from '../types/User.types';
import { LoginResponse, RegisterData } from '../types/auth.types';

export interface LoginData {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in?: number;
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_ENDPOINTS.users.login,
        data
      );
      
      if (response.success && response.data) {
        apiService.setToken(response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        return response.data;
      }
      
      throw new Error('Réponse invalide du serveur');
    } catch (error: any) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new Error(error.message || 'Erreur lors de la connexion');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validation côté client
      this.validateRegisterData(data);
      
      const response = await apiService.post<AuthResponse>(
        API_ENDPOINTS.users.register,
        data
      );
      
      if (response.success && response.data) {
        apiService.setToken(response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        return response.data;
      }
      
      throw new Error('Réponse invalide du serveur');
    } catch (error: any) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new Error(error.message || 'Erreur lors de l\'inscription');
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.users.logout);
    } catch {
      // Continue même si le logout échoue
    } finally {
      apiService.clearToken();
      window.location.href = '/connexion';
    }
  }

  async uploadProfilePhoto(file: File): Promise<string> {
    try {
      const response = await apiService.upload<{ url: string }>(
        API_ENDPOINTS.upload.imagePublic,
        file
      );
      
      if (response.success && response.data?.url) {
        return response.data.url;
      }
      
      throw new Error('URL de l\'image non retournée');
    } catch (error: any) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new Error('Erreur lors de l\'upload de la photo');
    }
  }

  async getUserTypes(): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await apiService.get<Array<{ value: string; label: string }>>(
        API_ENDPOINTS.users.typesUtilisateurs
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Impossible de récupérer les types d\'utilisateurs');
    } catch {
      // Retourner les valeurs par défaut en cas d'erreur
      return [
        { value: 'visiteur', label: 'Visiteur' },
        { value: 'artiste', label: 'Artiste' },
        { value: 'artisan', label: 'Artisan' },
        { value: 'ecrivain', label: 'Écrivain' },
        { value: 'musicien', label: 'Musicien' },
        { value: 'photographe', label: 'Photographe' },
        { value: 'autre', label: 'Autre' }
      ];
    }
  }

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user_data');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!apiService.getToken() && !!this.getCurrentUser();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.some(role => role.nomRole === 'Administrateur') || false;
  }

  isProfessional(): boolean {
    const user = this.getCurrentUser();
    return user?.professionnelValide === true && 
           user?.roles?.some(role => role.nomRole === 'Professionnel') || false;
  }

  private validateRegisterData(data: RegisterData): void {
    const errors: string[] = [];
    
    if (!data.nom || data.nom.length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!data.prenom || data.prenom.length < 2) {
      errors.push('Le prénom doit contenir au moins 2 caractères');
    }
    
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Email invalide');
    }
    
    if (!data.password || data.password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    
    if (!data.accepteConditions) {
      errors.push('Vous devez accepter les conditions d\'utilisation');
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const authService = new AuthService();