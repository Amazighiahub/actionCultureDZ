// services/httpClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, AUTH_CONFIG, ApiResponse, PaginatedResponse, FilterParams, buildUrl, UploadProgress } from '@/config/api';
interface ApiUploadOptions<T = any> {
  fieldName?: string;
  additionalData?: Record<string, any>;
  headers?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  validation?: {
    maxSize?: number;
    allowedTypes?: string[];
  };
}
// Types pour la réponse d'erreur
interface ErrorResponse {
  success: false;
  error?: string;
  message?: string;
  details?: any;
  [key: string]: any;
}

// Types pour les requêtes
interface QueuedRequest<T = any> {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

// Extension de AxiosRequestConfig pour le retry
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Erreur personnalisée avec métadonnées supplémentaires
class HttpError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// File d'attente pour les requêtes
class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 100; // Délai minimum entre requêtes (ms)

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }
      
      const item = this.queue.shift();
      if (item) {
        try {
          const result = await item.request();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
        this.lastRequestTime = Date.now();
      }
    }
    
    this.processing = false;
  }
}

class HttpClient {
  private axiosInstance: AxiosInstance;
  private requestQueue: RequestQueue;
  private retryDelays = new Map<string, number>();
  private csrfToken: string | null = null;

  constructor() {
    this.requestQueue = new RequestQueue();
    
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000, // 30 secondes
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Ajouter le token d'authentification
        const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
        if (token) {
          config.headers[AUTH_CONFIG.header] = `${AUTH_CONFIG.headerPrefix} ${token}`;
        }

        // Ajouter le token CSRF si disponible
        if (this.csrfToken) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Log pour debug (à retirer en production)
        console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor avec gestion du rate limiting
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Extraire le token CSRF si présent
        const csrfToken = response.headers['x-csrf-token'];
        if (csrfToken) {
          this.csrfToken = csrfToken;
          console.log('✅ Token CSRF récupéré');
        }

        // Réinitialiser le délai de retry pour cette URL
        const url = response.config.url || '';
        this.retryDelays.delete(url);
        
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig;
        
        if (!originalRequest) {
          return Promise.reject(error);
        }
        
        // Gestion du rate limiting (429)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : this.getBackoffDelay(originalRequest.url || '');
          
          console.warn(`⏳ Rate limit atteint. Nouvelle tentative dans ${delay/1000}s...`);
          
          // Afficher un toast informatif
          this.showToast({
            title: "Limite de requêtes atteinte",
            description: `Veuillez patienter ${Math.ceil(delay/1000)} secondes...`,
            variant: "warning" as any, // Type assertion pour éviter les erreurs de type
          });
          
          // Attendre et réessayer
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Incrémenter le compteur de retry
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          // Maximum 3 tentatives
          if (originalRequest._retryCount >= 3) {
            return Promise.reject(this.transformError(error));
          }
          
          return this.axiosInstance(originalRequest);
        }
        
        // Gestion du 401 (non autorisé)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Vérifier si c'est une erreur de token expiré
          let errorMessage = '';
          if (error.response.data && typeof error.response.data === 'object') {
            const data = error.response.data as Record<string, any>;
            errorMessage = data.message || '';
          }
          
          if (errorMessage.includes('token') || errorMessage.includes('expired')) {
            try {
              await this.refreshToken();
              return this.axiosInstance(originalRequest);
            } catch (refreshError) {
              // Token refresh a échoué, rediriger vers login
              this.handleAuthError();
              return Promise.reject(refreshError);
            }
          } else {
            // Autre erreur 401, rediriger vers login
            this.handleAuthError();
          }
        }
        
        // Gestion du 403 (interdit)
        if (error.response?.status === 403) {
          let errorMessage = "Vous n'avez pas les permissions nécessaires pour cette action";
          
          if (error.response.data && typeof error.response.data === 'object') {
            const data = error.response.data as Record<string, any>;
            errorMessage = data.message || errorMessage;
          }
          
          this.showToast({
            title: "Accès refusé",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        // Gestion des erreurs 5xx (serveur)
        if (error.response?.status && error.response.status >= 500) {
          this.showToast({
            title: "Erreur serveur",
            description: "Une erreur est survenue. Veuillez réessayer plus tard.",
            variant: "destructive",
          });
        }
        
        // Gestion des timeout
        if (error.code === 'ECONNABORTED') {
          this.showToast({
            title: "Timeout",
            description: "La requête a pris trop de temps. Veuillez réessayer.",
            variant: "destructive",
          });
        }
        
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private getBackoffDelay(url: string): number {
    const currentDelay = this.retryDelays.get(url) || 1000;
    const nextDelay = Math.min(currentDelay * 2, 30000); // Max 30 secondes
    this.retryDelays.set(url, nextDelay);
    return currentDelay;
  }

  private transformError(error: AxiosError): HttpError {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter 
        ? `Limite d'actions atteinte. Réessayez dans ${retryAfter} secondes.`
        : 'Limite d\'actions sensibles atteinte';
      return new HttpError(message, 429, 'RATE_LIMITED');
    }
    
    // Gérer le type unknown de response.data
    let message = error.message;
    let details: any = undefined;
    
    if (error.response?.data) {
      const responseData = error.response.data;
      
      // Vérifier le type de responseData
      if (typeof responseData === 'object' && responseData !== null) {
        const data = responseData as Record<string, any>;
        message = data.error || data.message || message;
        details = data.details;
      } else if (typeof responseData === 'string') {
        message = responseData;
      }
    }
    
    return new HttpError(
      message,
      error.response?.status,
      error.code,
      details
    );
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/refresh-token`,
        { refreshToken },
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.data) {
        localStorage.setItem(AUTH_CONFIG.tokenKey, response.data.data.token);
        if (response.data.data.refreshToken) {
          localStorage.setItem(AUTH_CONFIG.refreshTokenKey, response.data.data.refreshToken);
        }
        console.log('✅ Token rafraîchi avec succès');
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement du token:', error);
      throw error;
    }
  }

  private handleAuthError() {
    // Nettoyer les tokens
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
    
    // Rediriger vers la page de connexion
    const currentPath = window.location.pathname;
    if (currentPath !== '/auth') {
      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  private showToast(options: { title: string; description?: string; variant?: 'default' | 'destructive' | 'warning' | string }) {
    // Utiliser la fonction globale si disponible
    if (typeof window !== 'undefined' && 'showToast' in window && typeof (window as any).showToast === 'function') {
      (window as any).showToast(options);
    } else {
      // Fallback console log
      const level = options.variant === 'destructive' ? 'error' : options.variant === 'warning' ? 'warn' : 'log';
      console[level](`[Toast] ${options.title}: ${options.description || ''}`);
    }
  }

  // Méthodes HTTP avec queue
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, { params });
      console.log(response);
      return response.data;
    });
  }
async getBlob(url: string): Promise<Blob> {
  const response = await this.axiosInstance.get(url, {
    responseType: 'blob'
  });
  return response.data;
}
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data);
      return response.data;
    });
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data);
      return response.data;
    });
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data);
      return response.data;
    });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url);
      return response.data;
    });
  }

  // Méthode pour les requêtes paginées
  async getPaginated<T>(url: string, params?: FilterParams): Promise<ApiResponse<PaginatedResponse<T>>> {
    const fullUrl = buildUrl(url, params as any);
    return this.get<PaginatedResponse<T>>(fullUrl);
  }

  // Méthode pour l'upload de fichiers
  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response.data;
    });
  }

  // Méthode pour télécharger des fichiers
  async download(url: string, filename: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'blob',
      });
      
      // Créer un lien pour télécharger le fichier
      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du téléchargement'
      };
    }
  }

  // Méthode pour obtenir le token CSRF
  async getCsrfToken(): Promise<string | null> {
    try {
      const response = await this.get('/csrf-token');
      if (response.success && response.data) {
        this.csrfToken = (response.data as any).token;
        return this.csrfToken;
      }
    } catch (error) {
      console.error('Erreur récupération CSRF token:', error);
    }
    return null;
  }

/**
 * Upload d'un fichier avec options avancées
 */
async uploadFile<T>(
  url: string, 
  file: File, 
  options?: ApiUploadOptions<any>
): Promise<ApiResponse<T>> {
  const formData = new FormData();
  
  // Ajouter le fichier avec le nom de champ spécifié
  const fieldName = options?.fieldName || 'file';
  formData.append(fieldName, file);
  
  // Ajouter les données additionnelles
  if (options?.additionalData) {
    Object.entries(options.additionalData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
  }
  
  // Headers supplémentaires
  const headers = {
    ...options?.headers
  };
  
  return this.requestQueue.add(async () => {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
      headers,
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      },
    });
    return response.data;
  });
}
async postFormData<T = any>(
  endpoint: string,
  formData: FormData,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return this.requestQueue.add(async () => {
    console.log('📤 POST FormData:', endpoint);
    
    const response = await this.axiosInstance.post<ApiResponse<T>>(
      endpoint,
      formData,
      {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
            
            if (config?.onUploadProgress) {
              config.onUploadProgress(progressEvent);
            }
          }
        },
        timeout: 300000, // 5 minutes
      }
    );

    return response.data;
  });
}
}

// Instance singleton
export const httpClient = new HttpClient();

// Export des types pour utilisation externe
export type { ApiResponse, PaginatedResponse, HttpError };