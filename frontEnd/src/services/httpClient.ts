// services/httpClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, AUTH_CONFIG, ApiResponse, PaginatedResponse, FilterParams, buildUrl, UploadProgress } from '@/config/api';
import { apiLogger, cacheLogger } from '@/utils/logger';

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
  url?: string;
  method?: string;
  timestamp?: number;
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

// File d'attente améliorée pour les requêtes
class ImprovedRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 100; // Délai minimum entre requêtes (ms)
  
  // Historique des requêtes pour le rate limiting adaptatif
  private requestHistory: { timestamp: number; url: string }[] = [];
  
  // Cache simple en mémoire
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  // Compteurs pour ajustement dynamique
  private rateLimitHits = 0;
  private successfulRequests = 0;

  async add<T>(request: () => Promise<T>, url?: string, method: string = 'GET'): Promise<T> {
    // Vérifier le cache pour les GET
    if (method === 'GET' && url) {
      const cached = this.getFromCache(url);
      if (cached) {
        cacheLogger.debug(`Cache hit: ${url}`);
        return cached as T;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ 
        request, 
        resolve, 
        reject,
        url,
        method,
        timestamp: Date.now()
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Ajustement dynamique du délai
      const adaptiveDelay = this.calculateAdaptiveDelay();
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < adaptiveDelay) {
        await new Promise(resolve => setTimeout(resolve, adaptiveDelay - timeSinceLastRequest));
      }
      
      const item = this.queue.shift();
      if (item) {
        try {
          const result = await item.request();
          
          // Mettre en cache si GET
          if (item.method === 'GET' && item.url) {
            this.addToCache(item.url, result);
          }
          
          // Enregistrer le succès
          this.successfulRequests++;
          this.recordRequest(item.url || 'unknown');
          
          item.resolve(result);
        } catch (error: any) {
          // Détecter le rate limit
          if (error.response?.status === 429) {
            this.rateLimitHits++;
            this.adjustDelayAfterRateLimit();
          }
          item.reject(error);
        }
        this.lastRequestTime = Date.now();
      }
    }
    
    this.processing = false;
  }

  // Calculer le délai adaptatif
  private calculateAdaptiveDelay(): number {
    // Nettoyer l'historique (garder dernière minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > oneMinuteAgo);
    
    const requestsLastMinute = this.requestHistory.length;
    
    // Si on a eu des rate limits récemment, augmenter le délai
    if (this.rateLimitHits > 0) {
      return Math.min(this.minDelay * Math.pow(2, this.rateLimitHits), 5000);
    }
    
    // Si on approche de 30 requêtes/minute, ralentir
    if (requestsLastMinute > 25) {
      return 2000; // 2 secondes
    } else if (requestsLastMinute > 20) {
      return 1000; // 1 seconde
    } else if (requestsLastMinute > 15) {
      return 500; // 500ms
    }
    
    return this.minDelay;
  }
  
  // Ajuster après un rate limit
  private adjustDelayAfterRateLimit() {
    this.minDelay = Math.min(this.minDelay * 2, 5000);
    apiLogger.warn(`Rate limit détecté! Nouveau délai: ${this.minDelay}ms`);

    // Réinitialiser après 5 minutes sans rate limit
    setTimeout(() => {
      if (this.rateLimitHits === 0) {
        this.minDelay = 100;
        apiLogger.debug('Délai réinitialisé à 100ms');
      }
      this.rateLimitHits = Math.max(0, this.rateLimitHits - 1);
    }, 5 * 60 * 1000);
  }
  
  // Gestion du cache
  private getFromCache(url: string): any | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.cache.delete(url);
      return null;
    }
    
    return entry.data;
  }
  
  private addToCache(url: string, data: any) {
    this.cache.set(url, { data, timestamp: Date.now() });
    
    // Limiter la taille du cache
    if (this.cache.size > 50) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }
  
  private recordRequest(url: string) {
    this.requestHistory.push({ timestamp: Date.now(), url });
  }
  
  // Méthodes publiques
  clearCache() {
    this.cache.clear();
  }
  
  getStats() {
    return {
      queueSize: this.queue.length,
      cacheSize: this.cache.size,
      requestsLastMinute: this.requestHistory.length,
      rateLimitHits: this.rateLimitHits,
      currentDelay: this.calculateAdaptiveDelay()
    };
  }

  // Setter pour le délai minimum
  setMinDelay(delay: number) {
    this.minDelay = delay;
  }

  getMinDelay(): number {
    return this.minDelay;
  }
}

class HttpClient {
  private axiosInstance: AxiosInstance;
  private requestQueue: ImprovedRequestQueue;
  private retryDelays = new Map<string, number>();
  private csrfToken: string | null = null;

  constructor() {
    this.requestQueue = new ImprovedRequestQueue();
    
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
        // Header de langue
        config.headers['X-Language'] = localStorage.getItem('i18nextLng') || 'fr';

        // ✅ SÉCURITÉ: Le token est envoyé via cookie httpOnly (withCredentials: true)
        // Pas besoin d'ajouter le header Authorization manuellement

        // Ajouter le token CSRF si disponible
        if (this.csrfToken) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Log pour debug (dev uniquement)
        apiLogger.debug(`${config.method?.toUpperCase()} ${config.url}`);

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
          apiLogger.debug('Token CSRF récupéré');
        }

        // Extraire les infos de rate limit depuis les headers
        const remaining = response.headers['x-ratelimit-remaining'];
        const limit = response.headers['x-ratelimit-limit'];
        const reset = response.headers['x-ratelimit-reset'];

        if (remaining !== undefined) {
          const percentUsed = ((parseInt(limit) - parseInt(remaining)) / parseInt(limit)) * 100;

          if (percentUsed > 80) {
            apiLogger.warn(`Attention: ${percentUsed.toFixed(0)}% de la limite utilisée (${remaining}/${limit})`);
            // Ralentir automatiquement
            this.requestQueue.setMinDelay(1000);
          }

          // Afficher dans la console en dev
          apiLogger.debug(`Rate limit: ${remaining}/${limit} requêtes restantes`);
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
        
        // Gestion améliorée du rate limiting (429)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.getBackoffDelay(originalRequest.url || '');
         
          // Extraction plus intelligente du délai
          let actualDelay = delay;
          const errorData = error.response.data as any;
         
          if (errorData?.retryAfter) {
            actualDelay = errorData.retryAfter * 1000;
          } else if (errorData?.message) {
            const match = errorData.message.match(/(\d+)\s*secondes?/i);
            if (match) {
              actualDelay = parseInt(match[1]) * 1000;
            }
          }
         
          console.warn(`⏳ Rate limit atteint. Nouvelle tentative dans ${actualDelay/1000}s...`);
         
          // Notification plus détaillée
          this.showToast({
            title: "Limite de requêtes atteinte",
            description: `Nouvelle tentative automatique dans ${Math.ceil(actualDelay/1000)} secondes. ${errorData?.message || ''}`,
            variant: "warning" as any,
          });
         
          // Ajuster la queue pour éviter d'autres 429
          this.requestQueue.setMinDelay(Math.max(1000, actualDelay / 10));
          
          // Attendre et réessayer
          await new Promise(resolve => setTimeout(resolve, actualDelay));
          
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
    // ✅ SÉCURITÉ: Le refresh token est envoyé via cookie httpOnly
    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/refresh-token`,
        {},
        { withCredentials: true }
      );

      if (response.data.success && response.data.data) {
        // Stocker uniquement la date d'expiration pour l'UX
        if (response.data.data.expiresIn) {
          const expiresAt = new Date(Date.now() + response.data.data.expiresIn * 1000).toISOString();
          localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
        }
        apiLogger.debug('Token rafraîchi avec succès');
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      apiLogger.error('Erreur lors du rafraîchissement du token:', error);
      throw error;
    }
  }

  private handleAuthError() {
    // Nettoyer les données locales (cookies gérés côté serveur)
    localStorage.removeItem(AUTH_CONFIG.tokenExpiryKey);
    localStorage.removeItem('user');

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

  // Méthodes HTTP avec queue améliorée
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, { params });
      return response.data;
    }, url, 'GET'); // Passer url et method
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
    }, url, 'POST');
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data);
      return response.data;
    }, url, 'PUT');
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data);
      return response.data;
    }, url, 'PATCH');
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url);
      return response.data;
    }, url, 'DELETE');
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
    }, url, 'POST');
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
    }, url, 'POST');
  }

  async postFormData<T = any>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      apiLogger.debug('POST FormData:', endpoint);

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
            if (progressEvent.total && config?.onUploadProgress) {
              config.onUploadProgress(progressEvent);
            }
          },
          timeout: 300000, // 5 minutes
        }
      );

      return response.data;
    }, endpoint, 'POST');
  }

  // Méthodes utilitaires publiques
  
  // Obtenir les statistiques de la queue
  getQueueStats() {
    return this.requestQueue.getStats();
  }
/**
   * Invalider le cache pour un endpoint spécifique
   */
invalidateCache(endpoint: string): void {
  const cacheKey = `cache_${endpoint}`;
  localStorage.removeItem(cacheKey);
  cacheLogger.debug('Cache invalidé:', endpoint);
}
  // Vider le cache
  clearCache() {
    this.requestQueue.clearCache();
    cacheLogger.debug('Cache vidé');
  }

  // Mode conservateur (pour éviter les 429)
  useConservativeMode() {
    this.requestQueue.setMinDelay(1000);
    apiLogger.debug('Mode conservateur activé (1 req/sec)');
  }

  // Mode normal
  useNormalMode() {
    this.requestQueue.setMinDelay(100);
    apiLogger.debug('Mode normal activé');
  }

  // Mode agressif (utiliser avec précaution)
  useAggressiveMode() {
    this.requestQueue.setMinDelay(50);
    apiLogger.warn('Mode agressif activé (attention aux rate limits!)');
  }

  // Obtenir le délai actuel
  getCurrentDelay(): number {
    return this.requestQueue.getMinDelay();
  }
}

// Instance singleton
export const httpClient = new HttpClient();

// Export des types pour utilisation externe
export type { ApiResponse, PaginatedResponse, HttpError };