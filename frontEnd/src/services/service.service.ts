/**
 * Service pour les services culturels (restaurant, hébergement, guide, etc.)
 * Entité distincte de l'artisanat.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse } from '@/config/api';
import { httpClient } from './httpClient';

export interface Service {
  id: number;
  nom: string | Record<string, string>;
  description?: string | Record<string, string>;
  type_service?: string;
  type?: string;
  prix?: number;
  duree?: string;
  tarif_min?: number;
  tarif_max?: string;
  disponible?: boolean;
  statut?: string;
  photo_url?: string;
  Lieu?: { nom: string | Record<string, string> };
  lieu?: { nom: string | Record<string, string> };
}

class ServiceService {
  async getMyServices(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Service>>> {
    const response = await httpClient.get<PaginatedResponse<Service>>('/services/my/list', {
      params: { page: params?.page ?? 1, limit: params?.limit ?? 50 },
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    const data = response.data;
    const items = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
    const pagination = data?.pagination ?? response.pagination ?? { total: items.length, page: 1, limit: 50, pages: 1 };

    return {
      success: true,
      data: {
        items,
        pagination: typeof pagination === 'object' ? pagination : { total: items.length, page: 1, limit: 50, pages: 1 },
      },
    };
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.services?.delete?.(id) ?? `/services/${id}`);
  }
}

export const serviceService = new ServiceService();
