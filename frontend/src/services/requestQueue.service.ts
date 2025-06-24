// services/requestQueue.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient } from './httpClient';

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  retryCount: number;
  priority: number;
}

// Interface pour le retour des méthodes avec support des résultats
interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class RequestQueueService {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private rateLimitDelay = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 100; // 100ms entre chaque requête minimum
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Ajouter une requête à la file avec priorité
  async enqueue<T>(
    method: string, 
    url: string, 
    data?: any, 
    priority: number = 5
  ): Promise<RequestResult<T>> {
    // Vérifier le cache d'abord
    const cacheKey = `${method}:${url}:${JSON.stringify(data || {})}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('📦 Retour depuis le cache:', url);
      return { success: true, data: cached.data };
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        method,
        url,
        data,
        resolve: (value) => resolve({ success: true, data: value }),
        reject: (error) => resolve({ success: false, error: error.message || 'Erreur inconnue' }),
        retryCount: 0,
        priority
      };

      // Insérer selon la priorité (plus petit = plus prioritaire)
      const insertIndex = this.queue.findIndex(r => r.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Respecter le délai de rate limit
      if (this.rateLimitDelay > 0) {
        const now = Date.now();
        if (now < this.rateLimitDelay) {
          const waitTime = this.rateLimitDelay - now;
          console.log(`⏳ Attente rate limit: ${Math.ceil(waitTime / 1000)}s`);
          await this.delay(waitTime);
        }
        this.rateLimitDelay = 0;
      }

      // Respecter l'intervalle minimum entre requêtes
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.delay(this.minRequestInterval - timeSinceLastRequest);
      }

      const request = this.queue.shift()!;
      
      try {
        this.lastRequestTime = Date.now();
        const response = await this.executeRequest(request);
        
        // Mettre en cache si succès
        const cacheKey = `${request.method}:${request.url}:${JSON.stringify(request.data || {})}`;
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        
        // Nettoyer le cache périodiquement
        this.cleanCache();
        
        request.resolve(response);
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Gestion du rate limit
          this.handleRateLimit(error, request);
        } else if (this.shouldRetry(error) && request.retryCount < 3) {
          // Retry avec backoff exponentiel
          request.retryCount++;
          const backoffDelay = Math.min(1000 * Math.pow(2, request.retryCount), 10000);
          console.log(`🔄 Retry ${request.retryCount}/3 après ${backoffDelay}ms`);
          
          await this.delay(backoffDelay);
          this.queue.unshift(request); // Remettre en tête de file
        } else {
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  private async executeRequest(request: QueuedRequest) {
    const { method, url, data } = request;
    
    switch (method.toUpperCase()) {
      case 'GET':
        return (await httpClient.get(url)).data;
      case 'POST':
        return (await httpClient.post(url, data)).data;
      case 'PUT':
        return (await httpClient.put(url, data)).data;
      case 'DELETE':
        return (await httpClient.delete(url)).data;
      default:
        throw new Error(`Méthode non supportée: ${method}`);
    }
  }

  private handleRateLimit(error: any, request: QueuedRequest) {
    // Extraire le temps d'attente
    const retryAfter = this.extractRetryAfter(error);
    this.rateLimitDelay = Date.now() + (retryAfter * 1000);
    
    // Augmenter l'intervalle entre requêtes
    this.minRequestInterval = Math.min(this.minRequestInterval * 2, 1000);
    
    console.warn(`🚦 Rate limit atteint. Attente: ${retryAfter}s. Nouvel intervalle: ${this.minRequestInterval}ms`);
    
    // Remettre la requête en file
    this.queue.unshift(request);
  }

  private extractRetryAfter(error: any): number {
    // Depuis les headers
    if (error.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after']);
    }
    
    // Depuis le message d'erreur
    const match = error.message?.match(/(\d+)\s*secondes?/i);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Défaut: 60 secondes
    return 60;
  }

  private shouldRetry(error: any): boolean {
    const status = error.response?.status;
    return status >= 500 || status === 408 || !status;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  // Méthodes publiques pour contrôle
  clearQueue() {
    this.queue = [];
    this.rateLimitDelay = 0;
  }

  clearCache() {
    this.cache.clear();
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  adjustMinInterval(ms: number) {
    this.minRequestInterval = ms;
  }

  // Méthodes utilitaires pour différents types de requêtes
  async get<T>(url: string, priority: number = 5): Promise<RequestResult<T>> {
    return this.enqueue<T>('GET', url, undefined, priority);
  }

  async post<T>(url: string, data: any, priority: number = 5): Promise<RequestResult<T>> {
    return this.enqueue<T>('POST', url, data, priority);
  }

  async put<T>(url: string, data: any, priority: number = 5): Promise<RequestResult<T>> {
    return this.enqueue<T>('PUT', url, data, priority);
  }

  async delete<T>(url: string, priority: number = 5): Promise<RequestResult<T>> {
    return this.enqueue<T>('DELETE', url, undefined, priority);
  }
}

export const requestQueue = new RequestQueueService();

// Hook React pour utiliser facilement la queue
// SOLUTION: Créer des fonctions fléchées qui préservent les génériques
export function useRequestQueue() {
  return {
    get: <T = any>(url: string, priority?: number) => requestQueue.get<T>(url, priority),
    post: <T = any>(url: string, data: any, priority?: number) => requestQueue.post<T>(url, data, priority),
    put: <T = any>(url: string, data: any, priority?: number) => requestQueue.put<T>(url, data, priority),
    delete: <T = any>(url: string, priority?: number) => requestQueue.delete<T>(url, priority),
    queueSize: () => requestQueue.getQueueSize(),
    clearCache: () => requestQueue.clearCache()
  };
}