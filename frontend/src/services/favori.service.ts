// services/favori.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, PaginationParams } from '@/config/api';
import { httpClient } from './httpClient';

interface Favori {
  id: number;
  user_id: number;
  entity_type: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat';
  entity_id: number;
  entity: {
    id: number;
    titre: string;
    description?: string;
    image_url?: string;
    type?: string;
  };
  created_at: string;
}

interface AddFavoriData {
  entity_type: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat';
  entity_id: number;
}

interface FavoriStats {
  total_favoris: number;
  favoris_par_type: {
    oeuvres: number;
    evenements: number;
    lieux: number;
    artisanats: number;
  };
  derniers_ajouts: Favori[];
}

interface PopularItem {
  entity_type: string;
  entity_id: number;
  titre: string;
  favoris_count: number;
  image_url?: string;
}

interface GroupedFavoris {
  oeuvres: Favori[];
  evenements: Favori[];
  lieux: Favori[];
  artisanats: Favori[];
}

class FavoriService {
  // Listing
  async getAll(params?: PaginationParams & { type?: string }): Promise<ApiResponse<PaginatedResponse<Favori>>> {
    return httpClient.getPaginated<Favori>(API_ENDPOINTS.favoris.list, params);
  }

  async getAllGrouped(): Promise<ApiResponse<GroupedFavoris>> {
    const response = await httpClient.get<Favori[]>(API_ENDPOINTS.favoris.list);
    if (response.success && response.data) {
      const grouped: GroupedFavoris = {
        oeuvres: [],
        evenements: [],
        lieux: [],
        artisanats: []
      };
      
      response.data.forEach(fav => {
        switch (fav.entity_type) {
          case 'oeuvre':
            grouped.oeuvres.push(fav);
            break;
          case 'evenement':
            grouped.evenements.push(fav);
            break;
          case 'lieu':
            grouped.lieux.push(fav);
            break;
          case 'artisanat':
            grouped.artisanats.push(fav);
            break;
        }
      });
      
      return { success: true, data: grouped };
    }
    return { success: false, error: response.error };
  }

  // Statistiques
  async getStats(): Promise<ApiResponse<FavoriStats>> {
    return httpClient.get<FavoriStats>(API_ENDPOINTS.favoris.stats);
  }

  async getPopular(type?: string, limit: number = 10): Promise<ApiResponse<PopularItem[]>> {
    return httpClient.get<PopularItem[]>(API_ENDPOINTS.favoris.popular, {
      params: { type, limit }
    });
  }

  // Vérification
  async check(type: string, entityId: number): Promise<ApiResponse<{ is_favorite: boolean; favori_id?: number }>> {
    return httpClient.get<any>(API_ENDPOINTS.favoris.check(type, entityId));
  }

  // Actions
  async add(data: AddFavoriData): Promise<ApiResponse<Favori>> {
    return httpClient.post<Favori>(API_ENDPOINTS.favoris.add, data);
  }

  async removeById(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.favoris.removeById(id));
  }

  async removeByEntity(type: string, entityId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.favoris.removeByEntity(type, entityId));
  }

  // Toggle helper
  async toggle(type: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat', entityId: number): Promise<ApiResponse<{ added: boolean; favori?: Favori }>> {
    const checkResponse = await this.check(type, entityId);
    
    if (checkResponse.success && checkResponse.data) {
      if (checkResponse.data.is_favorite && checkResponse.data.favori_id) {
        // Retirer des favoris
        const removeResponse = await this.removeById(checkResponse.data.favori_id);
        return {
          success: removeResponse.success,
          data: { added: false },
          error: removeResponse.error
        };
      } else {
        // Ajouter aux favoris
        const addResponse = await this.add({ entity_type: type, entity_id: entityId });
        return {
          success: addResponse.success,
          data: { added: true, favori: addResponse.data },
          error: addResponse.error
        };
      }
    }
    
    return { success: false, error: 'Erreur lors de la vérification du favori' };
  }
}

export const favoriService = new FavoriService();
export type { Favori, AddFavoriData, FavoriStats, PopularItem, GroupedFavoris };