// services/httpClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: 9 `any` restants sont structurels (signatures publiques get/post/put/patch, index signatures)
// Les changer casserait tous les ~200 appelants du httpClient.
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import i18next from 'i18next';
import { delaiAvantReessai, DELAI_MAX_REESSAI_AUTO } from '@/utils/delaiRateLimit';
import { API_BASE_URL, AUTH_CONFIG, ApiResponse, PaginatedResponse, FilterParams, buildUrl, UploadProgress } from '@/config/api';
import { apiLogger } from '@/utils/logger';

interface ApiUploadOptions<T = unknown> {
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
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Refresh token: helper partage (deduplication concurrente)
// ============================================================================
// Plusieurs chemins peuvent declencher un refresh :
//  1) l'intercepteur 401 du httpClient (quand une requete metier renvoie 401)
//  2) authService.refreshToken() (appele explicitement par isAuthenticated/UX)
// Sans verrou partage, deux refresh concurrents envoient deux requetes vers
// /users/refresh-token, et puisque le refresh token backend est a usage unique
// (rotation), le second echoue avec INVALID_REFRESH_TOKEN et deconnecte l'user.
//
// On expose donc un singleton module-level : tant qu'un refresh est en vol,
// tous les appelants partagent la meme promesse.

let refreshInFlight: Promise<RefreshResult> | null = null;

interface RefreshResult {
  success: boolean;
  expiresIn?: number;
  user?: Record<string, unknown>;
  error?: string;
}

/**
 * Jeton CSRF pour le renouvellement : celui du cookie, sinon demandé au serveur.
 * Sans lui, /refresh-token répondait 403 : la session n'était jamais renouvelée et
 * l'utilisateur était déconnecté à l'expiration du jeton d'accès (60 min).
 */
async function csrfPourRenouvellement(): Promise<string | undefined> {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1];
  if (cookie) return cookie;
  try {
    const res = await axios.get(`${API_BASE_URL}/languages`, { withCredentials: true, timeout: 10000 });
    return res.headers['x-csrf-token'] || undefined;
  } catch {
    return undefined;
  }
}

export async function doRefreshToken(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      // Appel direct via axios (et non this.axiosInstance) pour contourner
      // l'intercepteur 401 et eviter une boucle infinie si /refresh-token
      // renvoie lui-meme 401 avec un message contenant "token".
      const csrf = await csrfPourRenouvellement();
      const response = await axios.post(
        `${API_BASE_URL}/users/refresh-token`,
        {},
        { withCredentials: true, headers: csrf ? { 'X-CSRF-Token': csrf } : {} }
      );

      const body = response.data as { success?: boolean; data?: { expiresIn?: number; user?: Record<string, unknown> }; error?: string };

      if (body?.success && body.data) {
        // Sync localStorage (pas de token, juste metadonnees UX)
        if (body.data.expiresIn) {
          const expiresAt = new Date(Date.now() + body.data.expiresIn * 1000).toISOString();
          localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, expiresAt);
        }
        apiLogger.debug('Token rafraichi avec succes');
        return { success: true, expiresIn: body.data.expiresIn, user: body.data.user };
      }

      return { success: false, error: body?.error || 'Token refresh failed' };
    } catch (err) {
      apiLogger.error('Erreur lors du rafraichissement du token:', err);
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Types pour les requêtes
interface QueuedRequest<T = unknown> {
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
  _csrfRetry?: boolean;
  /** Vérification de session au démarrage : un 401 ne déclenche ni message ni redirection */
  _silentAuth?: boolean;
  _retryCount?: number;
}

// Erreur personnalisée avec métadonnées supplémentaires
class HttpError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status?: number, code?: string, details?: Record<string, unknown>) {
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
  
  // Compteurs pour ajustement dynamique
  private rateLimitHits = 0;
  private successfulRequests = 0;

  async add<T>(request: () => Promise<T>, url?: string, method: string = 'GET'): Promise<T> {
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
          
          // Enregistrer le succès
          this.successfulRequests++;
          this.recordRequest(item.url || 'unknown');
          
          item.resolve(result);
        } catch (error: unknown) {
          // Détecter le rate limit
          const axiosErr = error as { response?: { status?: number } };
          if (axiosErr.response?.status === 429) {
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
  
  private recordRequest(url: string) {
    this.requestHistory.push({ timestamp: Date.now(), url });
  }
  
  getStats() {
    return {
      queueSize: this.queue.length,
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
  private csrfPromise: Promise<void> | null = null;

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

  /** Jeton CSRF mémorisé, sinon celui du cookie posé par le serveur */
  private currentCsrf(): string | null {
    return this.csrfToken || document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || null;
  }

  /**
   * Obtient un jeton CSRF avant la première écriture. Sans lui, un visiteur arrivé directement
   * sur /auth (favori, lien d'un e-mail) voyait sa connexion refusée (403 CSRF_MISSING).
   * Toute réponse de l'API porte le jeton ; /languages est la route la plus légère.
   */
  private ensureCsrf(force = false): Promise<void> {
    if (!force && this.currentCsrf()) return Promise.resolve();
    if (!this.csrfPromise) {
      this.csrfPromise = axios.get(`${API_BASE_URL}/languages`, { withCredentials: true, timeout: 10000 })
        .then((res) => {
          const token = res.headers['x-csrf-token'];
          if (token) this.csrfToken = token;
        })
        .catch(() => { /* la requête d'écriture échouera avec un message clair */ })
        .finally(() => { this.csrfPromise = null; });
    }
    return this.csrfPromise;
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Header de langue
        config.headers['X-Language'] = localStorage.getItem('i18nextLng') || 'fr';
        config.headers['Accept'] = 'application/json';

        // ✅ SÉCURITÉ: Le token est envoyé via cookie httpOnly (withCredentials: true)
        // Pas besoin d'ajouter le header Authorization manuellement

        // Ajouter le token CSRF (header mémorisé ou cookie fallback) ; écriture sans jeton : on le demande d'abord
        const method = (config.method || 'get').toLowerCase();
        if (!['get', 'head', 'options'].includes(method)) {
          await this.ensureCsrf();
        }
        const csrf = this.currentCsrf();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
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
        const unexpectedApiResponse = this.getUnexpectedApiResponseError(response);
        if (unexpectedApiResponse) {
          this.showToast({
            title: i18next.t('toasts.serverError'),
            description: unexpectedApiResponse.message,
            variant: 'destructive',
          });

          return Promise.reject(unexpectedApiResponse);
        }

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
          const errorData = error.response.data as Record<string, unknown> | undefined;
          const actualDelay = delaiAvantReessai(error.response.headers['retry-after'], errorData)
            ?? this.getBackoffDelay(originalRequest.url || '');

          // Compte bloqué ou attente longue : pas de nouvel essai automatique (la requête restait
          // en attente et l'écran figé) ; l'utilisateur est prévenu et l'erreur est renvoyée
          if (errorData?.code === 'ACCOUNT_LOCKED' || actualDelay > DELAI_MAX_REESSAI_AUTO) {
            // Compte bloqué : le formulaire de connexion affiche déjà le message du serveur
            if (errorData?.code !== 'ACCOUNT_LOCKED') this.showToast({
              title: i18next.t('toasts.rateLimitReached'),
              description: i18next.t('toasts.rateLimitWait', 'Réessayez dans {{minutes}} minute(s).', { minutes: Math.max(1, Math.ceil(actualDelay / 60000)) }),
              variant: "warning",
            });
            return Promise.reject(this.transformError(error));
          }

          this.showToast({
            title: i18next.t('toasts.rateLimitReached'),
            description: i18next.t('toasts.rateLimitDesc', { seconds: Math.ceil(actualDelay / 1000) }),
            variant: "warning",
          });

          // Ralentir la file pour éviter d'autres 429 (borné : un délai énorme figeait toutes les requêtes)
          this.requestQueue.setMinDelay(Math.min(Math.max(1000, actualDelay / 10), 5000));
          
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
        
        // Jeton CSRF absent ou expiré (cookie de 24 h) : on le renouvelle et on rejoue une seule fois
        const csrfCode = (error.response?.data as Record<string, unknown> | undefined)?.code;
        if (error.response?.status === 403 && (csrfCode === 'CSRF_MISSING' || csrfCode === 'CSRF_MISMATCH') && !originalRequest._csrfRetry) {
          originalRequest._csrfRetry = true;
          this.csrfToken = null;
          await this.ensureCsrf(true);
          return this.axiosInstance(originalRequest);
        }

        // Gestion du 401 (non autorisé).
        // Routes d'authentification : un 401 y signifie « identifiants incorrects » — pas de renouvellement,
        // pas de « session expirée » (et pas de boucle sur l'endpoint refresh lui-même).
        // Ailleurs : on tente un renouvellement pour tout 401. Le choix ne dépend plus du texte du message,
        // traduit (en arabe ou en tifinagh, aucun mot-clé ne correspondait : déconnexion au lieu de renouvellement).
        const isAuthEndpoint = /\/users\/(login|register|refresh-token|logout)|\/email-verification\//.test(originalRequest.url || '');
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;
          try {
            // Utilise le helper partage (deduplication avec authService.refreshToken)
            const result = await doRefreshToken();
            if (!result.success) {
              throw new Error(result.error || 'Token refresh failed');
            }
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Token refresh a échoué, rediriger vers login (sauf vérification silencieuse)
            if (!originalRequest._silentAuth) this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }
        
        // Gestion du 403 (interdit)
        if (error.response?.status === 403) {
          let errorMessage = i18next.t('toasts.noPermission');
          
          if (error.response.data && typeof error.response.data === 'object') {
            const data = error.response.data as Record<string, unknown>;
            errorMessage = typeof data.message === 'string' ? data.message : errorMessage;
          }

          this.showToast({
            title: i18next.t('toasts.accessDenied'),
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        // Gestion du 404 (non trouvé)
        if (error.response?.status === 404) {
          let errorMessage = i18next.t('toasts.notFoundDesc', 'La ressource demandée est introuvable.');

          if (error.response.data && typeof error.response.data === 'object') {
            const data = error.response.data as Record<string, unknown>;
            errorMessage = typeof data.message === 'string' ? data.message : errorMessage;
          }

          this.showToast({
            title: i18next.t('toasts.notFound', 'Ressource introuvable'),
            description: errorMessage,
            variant: "destructive",
          });
        }

        // Gestion des erreurs 5xx (serveur)
        if (error.response?.status && error.response.status >= 500) {
          this.showToast({
            title: i18next.t('toasts.serverError'),
            description: i18next.t('toasts.serverErrorDesc'),
            variant: "destructive",
          });
        }
        
        // Gestion des timeout
        if (error.code === 'ECONNABORTED') {
          this.showToast({
            title: i18next.t('toasts.timeout'),
            description: i18next.t('toasts.timeoutDesc'),
            variant: "destructive",
          });
        }
        
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private getUnexpectedApiResponseError(response: AxiosResponse): HttpError | null {
    const requestUrl = response.config.url || '';
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const responseData = response.data;
    const isApiRequest = requestUrl.startsWith('/') || requestUrl.startsWith(API_BASE_URL);
    const isHtml = contentType.includes('text/html') || (typeof responseData === 'string' && responseData.trim().startsWith('<'));

    if (!isApiRequest || !isHtml) {
      return null;
    }

    return new HttpError(
      'L\'API a renvoyé une page HTML au lieu du JSON attendu. Vérifiez le proxy, le CDN ou une protection anti-bot sur /api.',
      response.status || 502,
      'INVALID_API_RESPONSE',
      {
        url: requestUrl,
        contentType,
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
      // Message du serveur (ex. « Compte temporairement bloqué… Réessayez dans 15 minute(s). »)
      const data = (error.response.data || {}) as Record<string, unknown>;
      const duServeur = [data.error, data.message].filter(v => typeof v === 'string' && v).join(' ');
      const retryAfter = error.response.headers['retry-after'];
      const message = duServeur || (retryAfter
        ? `Limite d'actions atteinte. Réessayez dans ${retryAfter} secondes.`
        : 'Limite d\'actions sensibles atteinte');
      return new HttpError(message, 429, typeof data.code === 'string' ? data.code : 'RATE_LIMITED');
    }
    
    // Gérer le type unknown de response.data
    let message = error.message;
    let details: Record<string, unknown> | undefined = undefined;

    if (error.response?.data) {
      const responseData = error.response.data;

      // Vérifier le type de responseData
      if (typeof responseData === 'object' && responseData !== null) {
        const data = responseData as Record<string, unknown>;
        message = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : message;
        details = typeof data.details === 'object' && data.details !== null ? data.details as Record<string, unknown> : undefined;
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

  private handleAuthError() {
    // Nettoyer les données locales (cookies gérés côté serveur)
    localStorage.removeItem(AUTH_CONFIG.tokenExpiryKey);
    localStorage.removeItem('user');

    // Notifier l'utilisateur et rediriger vers login
    this.showToast({
      title: i18next.t('auth.sessionExpired', 'Session expirée'),
      description: i18next.t('auth.pleaseReconnect', 'Veuillez vous reconnecter'),
      variant: 'destructive',
    });

    // Rediriger vers login seulement si pas déjà sur /auth
    if (!window.location.pathname.startsWith('/auth')) {
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    }
  }

  private showToast(options: { title: string; description?: string; variant?: 'default' | 'destructive' | 'warning' }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: options }));
    }
  }

  // Méthodes HTTP avec queue améliorée
  async get<T>(url: string, params?: any, options?: { silentAuth?: boolean }): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const config: ExtendedAxiosRequestConfig = { params, _silentAuth: options?.silentAuth };
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
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

  async delete<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      // body optionnel : certaines suppressions exigent une confirmation (ex. mot de passe)
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, body !== undefined ? { data: body } : undefined);
      return response.data;
    }, url, 'DELETE');
  }

  // Méthode pour les requêtes paginées
  async getPaginated<T>(url: string, params?: FilterParams): Promise<ApiResponse<PaginatedResponse<T>>> {
    const fullUrl = buildUrl(url, params as FilterParams);
    return this.get<PaginatedResponse<T>>(fullUrl);
  }

  // Méthode pour l'upload de fichiers
  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    return this.requestQueue.add(async () => {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes, comme postFormData
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

  // Le CSRF token est récupéré automatiquement via les headers de réponse (intercepteur)

  /**
   * Upload d'un fichier avec options avancées
   */
  async uploadFile<T>(
    url: string, 
    file: File, 
    options?: ApiUploadOptions
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
        timeout: 300000, // 5 minutes
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

  async postFormData<T = unknown>(
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
  // Cache is now handled by React Query — no in-memory duplicate needed

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