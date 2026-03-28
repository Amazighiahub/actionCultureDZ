// services/favori.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, PaginationParams } from '@/config/api';
import { httpClient } from './httpClient';

interface Favori {
  id_favori: number;
  id_user: number;
  type_entite: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat';
  id_entite: number;
  date_ajout: string;
  notes?: string;
  entite?: Record<string, unknown>;
  date_creation: string;
  date_modification: string;
}

interface AddFavoriData {
  type_entite: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat';
  id_entite: number;
}

interface FavoriStats {
  total: number;
  byType: {
    oeuvre?: number;
    evenement?: number;
    lieu?: number;
    artisanat?: number;
  };
}

interface PopularItem {
  type: string;
  count: number;
  entite: Record<string, unknown>;
}

interface GroupedFavoris {
  oeuvres: Favori[];
  evenements: Favori[];
  lieux: Favori[];
  artisanats: Favori[];
}

// Interface personnalisée pour la réponse de check
interface CheckFavoriResponse {
  success: boolean;
  isFavorite: boolean;
  data: Record<string, unknown> | null;
}

class FavoriService {
  // Listing
  async getAll(params?: PaginationParams & { type?: string }): Promise<ApiResponse<PaginatedResponse<Favori>>> {
    return httpClient.get<PaginatedResponse<Favori>>(API_ENDPOINTS.favoris.list, {
      params: params
    });
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

      // response.data peut être un tableau ou {favoris: [], pagination: {}}
      const items = Array.isArray(response.data) ? response.data : (response.data as Record<string, unknown>).favoris as Favori[] || [];
      items.forEach(fav => {
        switch (fav.type_entite) {
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

  // Vérification - retourne un type personnalisé
 // Vérification - retourne un type personnalisé
async check(type: string, entityId: number): Promise<CheckFavoriResponse> {
  try {
    // Vider le cache pour éviter les problèmes (temporaire)
    const cacheKey = `cache_${API_ENDPOINTS.favoris.check(type, entityId)}`;
    localStorage.removeItem(cacheKey);
    
    const response = await httpClient.get<{ isFavorite?: boolean; is_favorite?: boolean }>(API_ENDPOINTS.favoris.check(type, entityId));
    
    // L'API retourne probablement :
    // - Soit { success: true, data: { isFavorite: boolean } }
    // - Soit { success: true, isFavorite: boolean, data: null }
    
    // Vérifier où se trouve isFavorite
    const isFavorite = response.data?.isFavorite || 
                      response.data?.is_favorite || 
                      (response as Record<string, unknown>).isFavorite || 
                      false;
    
    return {
      success: response.success,
      isFavorite: isFavorite,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      isFavorite: false,
      data: null
    };
  }
}
  // Actions
  async add(data: AddFavoriData): Promise<ApiResponse<Favori>> {
    // L'API attend type_entite et id_entite
    return httpClient.post<Favori>(API_ENDPOINTS.favoris.add, {
      type_entite: data.type_entite,
      id_entite: data.id_entite
    });
  }

  async removeById(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.favoris.removeById(id));
  }

  async removeByEntity(type: string, entityId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.favoris.removeByEntity(type, entityId));
  }

  // Toggle helper
  async toggle(type: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat', entityId: number): Promise<ApiResponse<{ added: boolean; favori?: Favori }>> {
    try {
      // 1. Vérifier l'état actuel
      const checkResponse = await this.check(type, entityId);
      
      if (!checkResponse.success) {
        return { 
          success: false, 
          error: 'Erreur lors de la vérification du favori' 
        };
      }
      
      const isFavorite = checkResponse.isFavorite;
      let result: ApiResponse<{ added: boolean; favori?: Favori }>;
      
      if (isFavorite) {
        // 2. Si c'est déjà en favori, on le retire
        const removeResponse = await this.removeByEntity(type, entityId);
        
        result = {
          success: removeResponse.success,
          data: { added: false },
          error: removeResponse.error
        };
      } else {
        // 3. Sinon on l'ajoute
        const addResponse = await this.add({ 
          type_entite: type, 
          id_entite: entityId 
        });
        
        result = {
          success: addResponse.success,
          data: { 
            added: true, 
            favori: addResponse.data 
          },
          error: addResponse.error
        };
      }
      
      // 4. Invalider le cache après l'opération
      if (result.success) {
        const cacheKey = `cache_${API_ENDPOINTS.favoris.check(type, entityId)}`;
        localStorage.removeItem(cacheKey);
      }
      
      return result;
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Erreur lors de la modification du favori' 
      };
    }
  }

  // Méthode helper pour nettoyer tous les caches de favoris
  clearAllFavorisCache(): void {
    const keys = Object.keys(localStorage);
    let count = 0;
    
    keys.forEach(key => {
      if (key.includes('cache_') && key.includes('/favoris')) {
        localStorage.removeItem(key);
        count++;
      }
    });
  }
}

export const favoriService = new FavoriService();
export type { Favori, AddFavoriData, FavoriStats, PopularItem, GroupedFavoris, CheckFavoriResponse };