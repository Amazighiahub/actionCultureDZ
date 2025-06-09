// services/metadata.service.ts - Service de gestion des métadonnées corrigé

import { apiService, ApiResponse } from './api.service';
import { TypeOrganisation } from '../types/User.types';
import { API_ENDPOINTS } from '../config/api';
import {
  Wilaya,
  Daira,
  Commune,
  Localite
} from '../types/Geographie.types';
import {
  Langue,
  Categorie,
  Genre,
  TypeOeuvre,
  TagMotCle,
  Materiau,
  Technique,
  Editeur,
} from '../types/Classification.types';

export interface AllMetadata {
  langues: Langue[];
  categories: Categorie[];
  genres: Genre[];
  typesOeuvres: TypeOeuvre[];
  materiaux: Materiau[];
  techniques: Technique[];
  editeurs: Editeur[];
  typesOrganisations: TypeOrganisation[];
  wilayas: Wilaya[];
}

export interface MetadataStats {
  totalOeuvres: number;
  totalEvenements: number;
  totalUtilisateurs: number;
  totalLieux: number;
  parWilaya: Record<number, {
    oeuvres: number;
    evenements: number;
    utilisateurs: number;
    lieux: number;
  }>;
}

export class MetadataService {
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupérer toutes les métadonnées en une seule requête
   */
  static async getAll(): Promise<ApiResponse<AllMetadata>> {
    const cached = this.getFromCache('all-metadata');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<AllMetadata>(
      API_ENDPOINTS.metadata.all
    );

    if (response.success && response.data) {
      this.setCache('all-metadata', response.data);
    }

    return response;
  }

  /**
   * MATÉRIAUX
   */
  static async getMateriaux(): Promise<ApiResponse<Materiau[]>> {
    const cached = this.getFromCache('materiaux');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Materiau[]>(
      API_ENDPOINTS.metadata.materiaux.list
    );

    if (response.success && response.data) {
      this.setCache('materiaux', response.data);
    }

    return response;
  }

  static async createMateriau(data: { nom: string; description?: string }): Promise<ApiResponse<Materiau>> {
    const response = await apiService.post<Materiau>(
      API_ENDPOINTS.metadata.materiaux.create,
      data
    );
    this.clearCache('materiaux');
    return response;
  }

  static async updateMateriau(id: number, data: Partial<Materiau>): Promise<ApiResponse<Materiau>> {
    const response = await apiService.put<Materiau>(
      API_ENDPOINTS.metadata.materiaux.update(id),
      data
    );
    this.clearCache('materiaux');
    return response;
  }

  static async deleteMateriau(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(
      API_ENDPOINTS.metadata.materiaux.delete(id)
    );
    this.clearCache('materiaux');
    return response;
  }

  /**
   * TECHNIQUES
   */
  static async getTechniques(): Promise<ApiResponse<Technique[]>> {
    const cached = this.getFromCache('techniques');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Technique[]>(
      API_ENDPOINTS.metadata.techniques.list
    );

    if (response.success && response.data) {
      this.setCache('techniques', response.data);
    }

    return response;
  }

  static async createTechnique(data: { nom: string; description?: string }): Promise<ApiResponse<Technique>> {
    const response = await apiService.post<Technique>(
      API_ENDPOINTS.metadata.techniques.create,
      data
    );
    this.clearCache('techniques');
    return response;
  }

  static async updateTechnique(id: number, data: Partial<Technique>): Promise<ApiResponse<Technique>> {
    const response = await apiService.put<Technique>(
      API_ENDPOINTS.metadata.techniques.update(id),
      data
    );
    this.clearCache('techniques');
    return response;
  }

  static async deleteTechnique(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(
      API_ENDPOINTS.metadata.techniques.delete(id)
    );
    this.clearCache('techniques');
    return response;
  }

  /**
   * LANGUES
   */
  static async getLangues(): Promise<ApiResponse<Langue[]>> {
    const cached = this.getFromCache('langues');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Langue[]>(
      API_ENDPOINTS.metadata.langues
    );

    if (response.success && response.data) {
      this.setCache('langues', response.data);
    }

    return response;
  }

  /**
   * CATÉGORIES
   */
  static async getCategories(): Promise<ApiResponse<Categorie[]>> {
    const cached = this.getFromCache('categories');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Categorie[]>(
      API_ENDPOINTS.metadata.categories.list
    );

    if (response.success && response.data) {
      this.setCache('categories', response.data);
    }

    return response;
  }

  static async searchCategories(query: string): Promise<ApiResponse<Categorie[]>> {
    return apiService.get<Categorie[]>(
      API_ENDPOINTS.metadata.categories.search,
      { q: query }
    );
  }

  /**
   * TYPES D'ŒUVRES
   */
  static async getTypesOeuvres(): Promise<ApiResponse<TypeOeuvre[]>> {
    const cached = this.getFromCache('types-oeuvres');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<TypeOeuvre[]>(
      API_ENDPOINTS.metadata.typesOeuvres
    );

    if (response.success && response.data) {
      this.setCache('types-oeuvres', response.data);
    }

    return response;
  }

  /**
   * GENRES
   */
  static async getGenres(): Promise<ApiResponse<Genre[]>> {
    const cached = this.getFromCache('genres');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Genre[]>(
      API_ENDPOINTS.metadata.genres
    );

    if (response.success && response.data) {
      this.setCache('genres', response.data);
    }

    return response;
  }

  /**
   * ÉDITEURS
   */
  static async getEditeurs(typeEditeur?: string): Promise<ApiResponse<Editeur[]>> {
    const cacheKey = typeEditeur ? `editeurs-${typeEditeur}` : 'editeurs';
    const cached = this.getFromCache(cacheKey);
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Editeur[]>(
      API_ENDPOINTS.metadata.editeurs,
      typeEditeur ? { type_editeur: typeEditeur } : undefined
    );

    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  /**
   * TYPES D'ORGANISATIONS
   */
  static async getTypesOrganisations(): Promise<ApiResponse<TypeOrganisation[]>> {
    const cached = this.getFromCache('types-organisations');
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<TypeOrganisation[]>(
      API_ENDPOINTS.metadata.typesOrganisations
    );

    if (response.success && response.data) {
      this.setCache('types-organisations', response.data);
    }

    return response;
  }

  /**
   * GÉOGRAPHIE
   */
  static async getWilayas(includeDetails = false): Promise<ApiResponse<Wilaya[]>> {
    const cacheKey = includeDetails ? 'wilayas-complete' : 'wilayas';
    const cached = this.getFromCache(cacheKey);
    if (cached) return { success: true, data: cached };

    const params = includeDetails 
      ? { includeDairas: true, includeCommunes: true } 
      : undefined;

    const response = await apiService.get<Wilaya[]>(
      API_ENDPOINTS.metadata.geographie.wilayas,
      params
    );

    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  static async searchWilayas(query: string): Promise<ApiResponse<Wilaya[]>> {
    return apiService.get<Wilaya[]>(
      API_ENDPOINTS.metadata.geographie.searchWilayas,
      { q: query }
    );
  }

  static async getDairasByWilaya(wilayaId: number): Promise<ApiResponse<Daira[]>> {
    const cacheKey = `dairas-wilaya-${wilayaId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Daira[]>(
      API_ENDPOINTS.metadata.geographie.dairasByWilaya(wilayaId)
    );

    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  static async getCommunesByDaira(dairaId: number): Promise<ApiResponse<Commune[]>> {
    const cacheKey = `communes-daira-${dairaId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { success: true, data: cached };

    const response = await apiService.get<Commune[]>(
      API_ENDPOINTS.metadata.geographie.communesByDaira(dairaId)
    );

    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  static async getLocalitesByCommune(communeId: number): Promise<ApiResponse<Localite[]>> {
    return apiService.get<Localite[]>(
      API_ENDPOINTS.metadata.geographie.localitesByCommune(communeId)
    );
  }

  /**
   * TAGS
   */
  static async getTags(search?: string, limit = 50): Promise<ApiResponse<TagMotCle[]>> {
    return apiService.get<TagMotCle[]>(
      API_ENDPOINTS.metadata.tags.list,
      { search, limit }
    );
  }

  static async createTag(nom: string): Promise<ApiResponse<TagMotCle>> {
    return apiService.post<TagMotCle>(
      API_ENDPOINTS.metadata.tags.create,
      { nom }
    );
  }

  /**
   * STATISTIQUES
   */
  static async getStatistics(): Promise<ApiResponse<MetadataStats>> {
    return apiService.get<MetadataStats>(
      API_ENDPOINTS.metadata.statistics
    );
  }

  /**
   * MÉTHODES DE CACHE
   */
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      // Aussi supprimer all-metadata car elle contient tout
      this.cache.delete('all-metadata');
    } else {
      this.cache.clear();
    }
  }

  /**
   * Précharger toutes les métadonnées essentielles
   */
  static async preload(): Promise<void> {
    try {
      await Promise.all([
        this.getAll(),
        this.getWilayas(),
        this.getLangues(),
        this.getCategories(),
        this.getTypesOeuvres()
      ]);
    } catch (error) {
      console.error('Erreur lors du préchargement des métadonnées:', error);
    }
  }

  /**
   * Rafraîchir le cache
   */
  static async refresh(): Promise<void> {
    this.clearCache();
    await this.preload();
  }
}

export default MetadataService;