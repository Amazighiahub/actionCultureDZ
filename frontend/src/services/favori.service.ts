// services/favori.service.ts - Service de gestion des favoris

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { Favori } from '../types/User.types';

export type FavoriType = 'oeuvre' | 'evenement' | 'lieu' | 'user' | 'artisanat';

export interface FavoriFilters {
  typeEntite?: FavoriType;
  dateMin?: string;
  dateMax?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FavoriStats {
  total: number;
  parType: Record<FavoriType, number>;
  recentlyAdded: number;
  topFavoris: Array<{
    typeEntite: FavoriType;
    idEntite: number;
    count: number;
    entity?: any;
  }>;
}

export interface PopularItem {
  typeEntite: FavoriType;
  idEntite: number;
  count: number;
  entity: any;
}

export class FavoriService {
  /**
   * Récupérer la liste de mes favoris
   */
  static async getAll(filters?: FavoriFilters): Promise<ApiResponse<Favori[]>> {
    return apiService.get<Favori[]>(API_ENDPOINTS.favoris.list, filters);
  }

  /**
   * Récupérer les statistiques de mes favoris
   */
  static async getStats(): Promise<ApiResponse<FavoriStats>> {
    return apiService.get<FavoriStats>(API_ENDPOINTS.favoris.stats);
  }

  /**
   * Récupérer les éléments les plus populaires
   */
  static async getPopular(
    type?: FavoriType, 
    limit = 10
  ): Promise<ApiResponse<PopularItem[]>> {
    return apiService.get<PopularItem[]>(
      API_ENDPOINTS.favoris.popular, 
      { type, limit }
    );
  }

  /**
   * Vérifier si un élément est dans mes favoris
   */
  static async check(type: FavoriType, id: number): Promise<ApiResponse<{ isFavorite: boolean; favoriId?: number }>> {
    return apiService.get<{ isFavorite: boolean; favoriId?: number }>(
      API_ENDPOINTS.favoris.check(type, id)
    );
  }

  /**
   * Ajouter un élément aux favoris
   */
  static async add(
    typeEntite: FavoriType, 
    idEntite: number, 
    notes?: string
  ): Promise<ApiResponse<Favori>> {
    return apiService.post<Favori>(
      API_ENDPOINTS.favoris.add, 
      { typeEntite, idEntite, notes }
    );
  }

  /**
   * Supprimer un favori par son ID
   */
  static async remove(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.favoris.removeById(id));
  }

  /**
   * Supprimer un favori par type et ID d'entité
   */
  static async removeByEntity(type: FavoriType, id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.favoris.removeByEntity(type, id));
  }

  /**
   * Basculer l'état favori d'un élément
   */
  static async toggle(
    type: FavoriType, 
    id: number, 
    notes?: string
  ): Promise<ApiResponse<{ added: boolean; favori?: Favori }>> {
    const checkResponse = await this.check(type, id);
    
    if (checkResponse.success && checkResponse.data?.isFavorite) {
      // Retirer des favoris
      await this.removeByEntity(type, id);
      return { success: true, data: { added: false } };
    } else {
      // Ajouter aux favoris
      const addResponse = await this.add(type, id, notes);
      return { 
        success: addResponse.success, 
        data: { added: true, favori: addResponse.data },
        error: addResponse.error
      };
    }
  }

  /**
   * HELPERS
   */

  /**
   * Obtenir l'icône selon le type
   */
  static getTypeIcon(type: FavoriType): string {
    const icons: Record<FavoriType, string> = {
      'oeuvre': '📚',
      'evenement': '📅',
      'lieu': '📍',
      'user': '👤',
      'artisanat': '🎨'
    };
    return icons[type] || '⭐';
  }

  /**
   * Obtenir le label selon le type
   */
  static getTypeLabel(type: FavoriType): string {
    const labels: Record<FavoriType, string> = {
      'oeuvre': 'Œuvre',
      'evenement': 'Événement',
      'lieu': 'Lieu',
      'user': 'Utilisateur',
      'artisanat': 'Artisanat'
    };
    return labels[type] || type;
  }

  /**
   * Grouper les favoris par type
   */
  static groupByType(favoris: Favori[]): Record<FavoriType, Favori[]> {
    return favoris.reduce((acc, favori) => {
      const type = favori.typeEntite as FavoriType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(favori);
      return acc;
    }, {} as Record<FavoriType, Favori[]>);
  }

  /**
   * Gérer le cache local des favoris
   */
  private static favoritesCache = new Map<string, boolean>();

  static getCacheKey(type: FavoriType, id: number): string {
    return `${type}-${id}`;
  }

  static isCachedFavorite(type: FavoriType, id: number): boolean | undefined {
    return this.favoritesCache.get(this.getCacheKey(type, id));
  }

  static setCachedFavorite(type: FavoriType, id: number, isFavorite: boolean): void {
    this.favoritesCache.set(this.getCacheKey(type, id), isFavorite);
  }

  static clearCache(): void {
    this.favoritesCache.clear();
  }

  /**
   * Vérifier rapidement si un élément est favori (avec cache)
   */
  static async isFavorite(type: FavoriType, id: number): Promise<boolean> {
    // Vérifier le cache d'abord
    const cached = this.isCachedFavorite(type, id);
    if (cached !== undefined) return cached;

    // Sinon faire la requête
    const response = await this.check(type, id);
    const isFavorite = response.success && response.data?.isFavorite || false;
    
    // Mettre en cache
    this.setCachedFavorite(type, id, isFavorite);
    
    return isFavorite;
  }

  /**
   * Récupérer plusieurs états de favoris en une fois
   */
  static async checkMultiple(
    items: Array<{ type: FavoriType; id: number }>
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Pour l'instant, on fait des requêtes individuelles
    // Une amélioration future serait d'avoir un endpoint pour vérifier plusieurs à la fois
    const promises = items.map(async ({ type, id }) => {
      const isFavorite = await this.isFavorite(type, id);
      results.set(this.getCacheKey(type, id), isFavorite);
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Exporter les favoris
   */
  static async export(format: 'json' | 'csv' = 'json'): Promise<void> {
    const response = await this.getAll({ limit: 1000 });
    
    if (!response.success || !response.data) {
      throw new Error('Impossible de récupérer les favoris');
    }

    const favoris = response.data;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(favoris, null, 2);
      filename = 'mes-favoris.json';
      mimeType = 'application/json';
    } else {
      // Format CSV
      const headers = ['Type', 'ID', 'Notes', 'Date d\'ajout'];
      const rows = favoris.map(f => [
        this.getTypeLabel(f.typeEntite as FavoriType),
        f.idEntite,
        f.notes || '',
        new Date(f.dateAjout || '').toLocaleDateString('fr-FR')
      ]);
      
      content = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      filename = 'mes-favoris.csv';
      mimeType = 'text/csv';
    }

    // Télécharger le fichier
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export default FavoriService;