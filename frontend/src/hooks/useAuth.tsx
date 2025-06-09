import { useState, useEffect, useCallback } from 'react';
import { authService, LoginData, AuthResponse } from '../services/auth.service';
import { apiService, ApiException } from '../services/api.service';
import { User } from '../types/User.types';
import { RegisterData } from '../types/auth.types';
import { API_ENDPOINTS } from '../config/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),
    isLoading: false,
    error: null
  });

  const login = useCallback(async (data: LoginData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.register(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await authService.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const checkAuth = useCallback(async () => {
    if (!apiService.getToken()) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Récupérer le profil utilisateur depuis l'API
      const response = await apiService.get<User>(API_ENDPOINTS.users.profile);
      
      if (response.success && response.data) {
        // Mettre à jour le localStorage avec les données fraîches
        localStorage.setItem('user_data', JSON.stringify(response.data));
        
        setState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('Impossible de récupérer le profil');
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      
      // En cas d'erreur 401, le token est invalide
      if (error.status === 401) {
        apiService.clearToken();
      }
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev;
      
      const updatedUser = { ...prev.user, ...userData };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      return {
        ...prev,
        user: updatedUser
      };
    });
  }, []);

  // Vérifier l'authentification au montage
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    updateUser,
    isAdmin: authService.isAdmin(),
    isProfessional: authService.isProfessional()
  };
};