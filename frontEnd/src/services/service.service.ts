/**
 * Service pour les services culturels (restaurant, hébergement, guide, etc.)
 * Entité distincte de l'artisanat.
 */
import { ApiResponse, PaginatedResponse } from '@/config/api';
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

  // Galerie (10 photos au plus) et menus en PDF ou image (3 au plus) : le fichier est d'abord mis en ligne
  async ajouterMedia(id: number, media: { type: 'photo' | 'menu'; url: string; nom?: string }): Promise<ApiResponse<MediaService>> {
    return httpClient.post<MediaService>(`/services/${id}/medias`, media);
  }

  async retirerMedia(id: number, idMedia: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/services/${id}/medias/${idMedia}`);
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/services/${id}`);
  }
}

/** Photo de galerie ; menu : PDF servi par le site (`lien`) ou image (`url`) */
export interface MediaService { id: number; type?: 'photo' | 'menu'; url?: string; nom?: string | null; pdf?: boolean; lien?: string }

export const serviceService = new ServiceService();
