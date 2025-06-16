// services/oeuvre.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams, UploadProgress } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';

interface Oeuvre {
  id: number;
  titre: string;
  description?: string;
  id_type_oeuvre: number;
  id_langue: number;
  statut: string;
  date_creation?: string;
  user_id: number;
  views_count?: number;
  likes_count?: number;
  medias?: Media[];
  categories?: any[];
  tags?: any[];
  created_at: string;
  updated_at: string;
}

interface CreateOeuvreData {
  titre: string;
  description?: string;
  id_type_oeuvre: number;
  id_langue: number;
  date_creation?: string;
  categories?: number[];
  tags?: string[];
  // Champs spécifiques selon le type
  isbn?: string;
  pages?: number;
  duree?: number;
  realisateur?: string;
  label?: string;
  doi?: string;
  peer_reviewed?: boolean;
}

interface UpdateOeuvreData extends Partial<CreateOeuvreData> {
  statut?: string;
}

interface Media {
  id: number;
  url: string;
  type: string;
  titre?: string;
  description?: string;
  ordre: number;
  is_principal: boolean;
}

interface OeuvreStatistics {
  total_views: number;
  total_likes: number;
  total_comments: number;
  views_by_day: Array<{ date: string; count: number }>;
  engagement_rate: number;
}

interface ShareLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  whatsapp: string;
  email: string;
  embed_code?: string;
}

interface SearchOeuvresParams extends FilterParams {
  q?: string;
  type_oeuvre?: number;
  langue?: number;
  categorie?: number;
  user_id?: number;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
}

class OeuvreService extends BaseService<Oeuvre, CreateOeuvreData, UpdateOeuvreData> {
  constructor() {
    super(API_ENDPOINTS.oeuvres.list);
  }

  // Recherche et listing
  async search(params: SearchOeuvresParams): Promise<ApiResponse<PaginatedResponse<Oeuvre>>> {
    return httpClient.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.search, params);
  }

  async getRecent(limit?: number): Promise<ApiResponse<Oeuvre[]>> {
    return httpClient.get<Oeuvre[]>(API_ENDPOINTS.oeuvres.recent, {
      params: { limit: limit || 10 }
    });
  }

  async getPopular(limit?: number): Promise<ApiResponse<Oeuvre[]>> {
    return httpClient.get<Oeuvre[]>(API_ENDPOINTS.oeuvres.popular, {
      params: { limit: limit || 10 }
    });
  }

  // Détails et partage
  async getDetail(id: number): Promise<ApiResponse<Oeuvre>> {
    return httpClient.get<Oeuvre>(API_ENDPOINTS.oeuvres.detail(id));
  }

  async getShareLinks(id: number): Promise<ApiResponse<ShareLinks>> {
    return httpClient.get<ShareLinks>(API_ENDPOINTS.oeuvres.shareLinks(id));
  }

  // Médias
  async getMedias(id: number): Promise<ApiResponse<Media[]>> {
    return httpClient.get<Media[]>(API_ENDPOINTS.oeuvres.medias(id));
  }

  async uploadMedia(
    oeuvreId: number, 
    file: File, 
    data?: { titre?: string; description?: string; is_principal?: boolean },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<Media>> {
    return httpClient.uploadFile<Media>(
      API_ENDPOINTS.oeuvres.uploadMedia(oeuvreId),
      file,
      {
        additionalData: data,
        onProgress
      }
    );
  }

  async deleteMedia(oeuvreId: number, mediaId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.oeuvres.deleteMedia(oeuvreId, mediaId));
  }

  // Statistiques
  async getStatistics(): Promise<ApiResponse<{
    total_oeuvres: number;
    oeuvres_by_type: Record<string, number>;
    oeuvres_by_status: Record<string, number>;
    top_categories: Array<{ categorie: string; count: number }>;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.oeuvres.statistics);
  }

  // Espace utilisateur
  async getMyWorks(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Oeuvre>>> {
    return httpClient.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.myWorks, params);
  }

  async getMyStatistics(): Promise<ApiResponse<OeuvreStatistics>> {
    return httpClient.get<OeuvreStatistics>(API_ENDPOINTS.oeuvres.myStats);
  }

  // Administration
  async validate(id: number, validated: boolean, comment?: string): Promise<ApiResponse<Oeuvre>> {
    return httpClient.post<Oeuvre>(API_ENDPOINTS.oeuvres.validate(id), {
      validated,
      comment
    });
  }

  async getPending(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Oeuvre>>> {
    return httpClient.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.pending, params);
  }

  async getRejected(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Oeuvre>>> {
    return httpClient.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.rejected, params);
  }

  // Documentation API
  async getApiDocumentation(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.oeuvres.documentation);
  }
}

export const oeuvreService = new OeuvreService();
export type { 
  Oeuvre, CreateOeuvreData, UpdateOeuvreData, Media, 
  OeuvreStatistics, ShareLinks, SearchOeuvresParams 
};