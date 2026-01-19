// services/base.service.ts - VERSION CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams,
  buildUrl,
  getApiUrl,
} from '@/config/api';
import { httpClient } from './httpClient';

export abstract class BaseService<T, CreateDTO = unknown, UpdateDTO = unknown> {
  constructor(protected baseEndpoint: string) {}

  // Méthodes CRUD de base
  
  /**
   * ✅ CORRIGÉ: N'appelle plus buildUrl() avant getPaginated()
   * car getPaginated() fait déjà buildUrl() en interne
   */
  async getAll(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<PaginatedResponse<T>>> {
    // ❌ AVANT (causait le double ?limit=100?limit=100):
    // const url = buildUrl(this.baseEndpoint, params);
    // return httpClient.getPaginated<T>(url, params);
    
    // ✅ APRÈS: Passer directement l'endpoint de base et les params
    // getPaginated() se charge de construire l'URL complète
    return httpClient.getPaginated<T>(this.baseEndpoint, params);
  }

  async getById(id: number): Promise<ApiResponse<T>> {
    return httpClient.get<T>(`${this.baseEndpoint}/${id}`);
  }

  async create(data: CreateDTO): Promise<ApiResponse<T>> {
    return httpClient.post<T>(this.baseEndpoint, data);
  }

  async update(id: number, data: UpdateDTO): Promise<ApiResponse<T>> {
    return httpClient.put<T>(`${this.baseEndpoint}/${id}`, data);
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${this.baseEndpoint}/${id}`);
  }

  // Méthodes utilitaires
  protected buildUrl(endpoint: string, params?: Record<string, any>): string {
    return buildUrl(endpoint, params);
  }

  protected getApiUrl(endpoint: string, ...ids: number[]): string {
    return getApiUrl(endpoint, ...ids);
  }
}