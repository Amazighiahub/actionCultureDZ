// services/base.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams,
  buildUrl,
  getApiUrl,
  getAuthHeaders 
} from '@/config/api';
import { httpClient } from './httpClient';

export abstract class BaseService<T, CreateDTO = unknown, UpdateDTO = unknown> {
  constructor(protected baseEndpoint: string) {}

  // Méthodes CRUD de base
  async getAll(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<PaginatedResponse<T>>> {
    const url = buildUrl(this.baseEndpoint, params);
    return httpClient.getPaginated<T>(url, params);
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

  protected getApiUrl(endpoint: string , ...ids: number[]): string {
    return getApiUrl(endpoint, ...ids);
  }
}