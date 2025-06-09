// api.service.ts - Service API corrigé et unifié

import { API_ENDPOINTS, AUTH_CONFIG } from '../config/api';
import ENV from '../config/env';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export class ApiException extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;
  private baseURL: string;

  private constructor() {
    this.baseURL = ENV.API_URL;
    this.token = this.getStoredToken();
    
    if (ENV.IS_DEVELOPMENT) {
      console.log('🌐 API Service initialized');
      console.log('📍 Base URL:', this.baseURL);
    }
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Token management
  private getStoredToken(): string | null {
    return localStorage.getItem(AUTH_CONFIG.tokenKey);
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem(AUTH_CONFIG.tokenKey, token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem('user_data');
  }

  getToken(): string | null {
    return this.token;
  }

  // Headers
  private getHeaders(isFormData = false): HeadersInit {
    const headers: HeadersInit = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (this.token) {
      headers[AUTH_CONFIG.header] = `${AUTH_CONFIG.headerPrefix} ${this.token}`;
    }
    
    return headers;
  }

  // Response handling
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const url = response.url.replace(window.location.origin, '');
    
    if (ENV.IS_DEVELOPMENT) {
      console.log(`📥 ${response.status} ${url}`);
    }

    if (!response.ok) {
      await this.handleError(response);
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { success: true, data: {} as T };
    }

    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const responseData = await response.json();
        
        // If response already has ApiResponse structure
        if (typeof responseData === 'object' && 'success' in responseData) {
          if (!responseData.success) {
            throw new ApiException(
              responseData.error || responseData.message || 'Erreur inconnue',
              response.status,
              responseData
            );
          }
          return responseData as ApiResponse<T>;
        }
        
        // Otherwise wrap in ApiResponse
        return {
          success: true,
          data: responseData as T
        };
      }
      
      // Non-JSON response
      const text = await response.text();
      return {
        success: true,
        data: text as any
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('Erreur de traitement de la réponse', response.status);
    }
  }

  private async handleError(response: Response): Promise<never> {
    let errorMessage = `Erreur HTTP ${response.status}`;
    let errorData = null;

    try {
      const text = await response.text();
      if (text) {
        errorData = JSON.parse(text);
        errorMessage = errorData.error || errorData.message || errorMessage;
      }
    } catch {
      // Response is not JSON
    }

    switch (response.status) {
      case 401:
        this.clearToken();
        throw new ApiException('Session expirée. Veuillez vous reconnecter.', 401, errorData);
      case 403:
        throw new ApiException('Accès non autorisé.', 403, errorData);
      case 404:
        throw new ApiException('Ressource non trouvée.', 404, errorData);
      case 422:
      case 400:
        if (errorData?.details && Array.isArray(errorData.details)) {
          const details = errorData.details
            .map((d: any) => `${d.field}: ${d.message}`)
            .join('\n');
          throw new ApiException(`Erreur de validation:\n${details}`, response.status, errorData);
        }
        throw new ApiException(errorMessage, response.status, errorData);
      case 429:
        throw new ApiException('Trop de requêtes. Veuillez patienter.', 429, errorData);
      default:
        throw new ApiException(errorMessage, response.status, errorData);
    }
  }

  // Main request method
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: { 
      isFormData?: boolean; 
      timeout?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        ...this.getHeaders(options.isFormData),
        ...options.headers
      },
    };

    // Add timeout
    if (options.timeout && 'AbortSignal' in window) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);
      config.signal = controller.signal;
      
      // Clear timeout on success
      config.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    }

    // Add body for POST, PUT, PATCH
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = options.isFormData ? data : JSON.stringify(data);
    }

    // Add query params for GET
    let finalUrl = url;
    if (data && method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      finalUrl = queryString ? `${url}?${queryString}` : url;
    }

    if (ENV.IS_DEVELOPMENT) {
      console.log(`📤 ${method} ${finalUrl}`);
      if (data && !options.isFormData) {
        console.log('📦 Data:', data);
      }
    }

    try {
      const response = await fetch(finalUrl, config);
      return await this.handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof ApiException) throw error;
      
      if (error.name === 'AbortError') {
        throw new ApiException('Délai d\'attente dépassé', 0);
      }
      
      throw new ApiException('Erreur de connexion au serveur', 0);
    }
  }

  // Public methods
  async get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, params);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data);
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  // Méthode pour la pagination
  async getPaginated<T>(endpoint: string, params?: any): Promise<PaginatedResponse<T>> {
    const response = await this.get<any>(endpoint, params);
    
    // Vérifier si la réponse a la structure de pagination attendue
    if (response.data && Array.isArray(response.data.data) && response.data.pagination) {
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      } as PaginatedResponse<T>;
    }
    
    // Si pas de structure de pagination, retourner une structure par défaut
    const items = Array.isArray(response.data) ? response.data : [];
    return {
      success: true,
      data: items,
      pagination: {
        total: items.length,
        page: 1,
        pages: 1,
        limit: items.length
      }
    } as PaginatedResponse<T>;
  }

  // File upload
  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    // Le backend attend 'image' ou 'file' selon l'endpoint
    const fieldName = endpoint.includes('image') ? 'image' : 'file';
    formData.append(fieldName, file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    return this.request<T>('POST', endpoint, formData, { isFormData: true });
  }

  // Download file
  async download(endpoint: string, filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw new ApiException('Erreur lors du téléchargement', 0);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get(API_ENDPOINTS.health);
      return response.success;
    } catch {
      return false;
    }
  }

  // Get base URL
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton
export const apiService = ApiService.getInstance();

// Export types
