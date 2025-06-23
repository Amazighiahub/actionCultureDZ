// services/metadata.service.ts - Version complète réécrite
/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  TypeOeuvre,
  TypeEvenement,
  Genre,
  Langue,
  Categorie,
  TagMotCle,
  Materiau,
  Technique,
  Editeur,
  
} from '../types/models/references.types';
import { Wilaya } from '@/types';
import { TypeUser } from '@/types/models/type-user.types';

// Types pour la hiérarchie des catégories
export interface CategoryGroupedByGenre {
  id_genre: number;
  nom: string;
  description?: string;
  categories: Categorie[];
}

export interface GenreFromCategories {
  id_genre: number;
  nom: string;
  description?: string;
  categories_count: number;
}

export interface HierarchyValidationResult {
  valid: boolean;
  invalidCategories?: Array<{
    id: number;
    nom: string;
  }>;
}

// Type pour toutes les métadonnées
interface AllMetadata {
  types_oeuvres: TypeOeuvre[];
  types_evenements: TypeEvenement[];
  genres: Genre[];
  langues: Langue[];
  categories: Categorie[];
  materiaux: Materiau[];
  techniques: Technique[];
  editeurs: Editeur[];
  wilayas: Wilaya[];
  tags: TagMotCle[];
  types_users: TypeUser[];
}

export class MetadataService {
  // Cache pour éviter les requêtes répétées
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Obtenir toutes les métadonnées d'un coup
   */
  async getAll(): Promise<ApiResponse<AllMetadata>> {
    try {
      const response = await httpClient.get<AllMetadata>('/metadata/all');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des métadonnées'
      };
    }
  }

  /**
   * Obtenir toutes les métadonnées avec cache
   */
  async getAllCached(): Promise<ApiResponse<AllMetadata>> {
    const cacheKey = 'all-metadata';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return {
        success: true,
        data: cached.data as AllMetadata
      };
    }

    const response = await this.getAll();
    
    if (response.success && response.data) {
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response;
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ================================================
  // HIÉRARCHIE TYPE → CATÉGORIES (groupées par genre)
  // ================================================

  /**
   * Récupérer les catégories valides pour un type d'œuvre
   * Retourne les catégories groupées par genre
   */
  async getCategoriesForType(typeOeuvreId: number): Promise<ApiResponse<CategoryGroupedByGenre[]>> {
    try {
      const response = await httpClient.get<CategoryGroupedByGenre[]>(
        `/metadata/types-oeuvres/${typeOeuvreId}/categories`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des catégories'
      };
    }
  }

  /**
   * Vérifier si un type d'œuvre a des catégories disponibles
   */
  async checkIfTypeHasCategories(typeOeuvreId: number): Promise<boolean> {
    try {
      const response = await httpClient.get<{ hasCategories: boolean; requiresCategories: boolean }>(
        `/metadata/types-oeuvres/${typeOeuvreId}/has-categories`
      );
      return response.success && response.data ? response.data.hasCategories : false;
    } catch (error) {
      console.error('Erreur vérification catégories:', error);
      return false;
    }
  }

  /**
   * Récupérer les genres associés à une liste de catégories
   * Utile pour afficher les genres déduits des catégories sélectionnées
   */
  async getGenresFromCategories(categoryIds: number[]): Promise<ApiResponse<{ genres: GenreFromCategories[] }>> {
    try {
      const response = await httpClient.post<{ genres: GenreFromCategories[] }>(
        '/metadata/genres-from-categories',
        { categories: categoryIds }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des genres'
      };
    }
  }

  /**
   * Valider la hiérarchie type/catégories
   * Vérifie que les catégories sélectionnées sont valides pour le type d'œuvre
   */
  async validateHierarchy(
    typeOeuvreId: number, 
    categoryIds: number[]
  ): Promise<ApiResponse<HierarchyValidationResult>> {
    try {
      const response = await httpClient.post<HierarchyValidationResult>(
        '/metadata/validate-hierarchy',
        {
          id_type_oeuvre: typeOeuvreId,
          categories: categoryIds
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la validation'
      };
    }
  }

  // ================================================
  // TYPES D'ŒUVRES
  // ================================================

  /**
   * Obtenir les types d'œuvres
   */
  async getTypesOeuvres(): Promise<ApiResponse<TypeOeuvre[]>> {
    try {
      const response = await httpClient.get<TypeOeuvre[]>('/metadata/types-oeuvres');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des types d\'œuvres'
      };
    }
  }

  // ================================================
  // LANGUES
  // ================================================

  /**
   * Obtenir la liste des langues
   */
  async getLangues(): Promise<ApiResponse<Langue[]>> {
    try {
      const response = await httpClient.get<Langue[]>('/metadata/langues');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des langues'
      };
    }
  }

  // ================================================
  // TYPES USERS (INTERVENANTS)
  // ================================================

  /**
   * Obtenir les types d'utilisateurs/intervenants
   */
  async getTypesUsers(): Promise<ApiResponse<TypeUser[]>> {
    try {
      const response = await httpClient.get<TypeUser[]>('/metadata/types-users');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des types d\'utilisateurs'
      };
    }
  }

  // ================================================
  // ÉDITEURS
  // ================================================

  /**
   * Obtenir les éditeurs
   */
  async getEditeurs(): Promise<ApiResponse<Editeur[]>> {
    try {
      const response = await httpClient.get<Editeur[]>('/metadata/editeurs');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des éditeurs'
      };
    }
  }

  /**
   * Créer un nouvel éditeur
   */
  async createEditeur(data: { 
    nom: string; 
    type_editeur?: string;
    site_web?: string;
    email?: string; 
    telephone?: string;
    description?: string;
  }): Promise<ApiResponse<Editeur>> {
    try {
      const response = await httpClient.post<Editeur>('/metadata/editeurs', data);
      
      // Invalider le cache après création
      this.clearCache();
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de l\'éditeur'
      };
    }
  }

  // ================================================
  // TAGS
  // ================================================

  /**
   * Obtenir la liste des tags
   */
  async getTags(search?: string, limit = 50): Promise<ApiResponse<TagMotCle[]>> {
    try {
      const params: any = { limit };
      if (search) {
        params.search = search;
      }
      
      const response = await httpClient.get<TagMotCle[]>('/metadata/tags', params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des tags'
      };
    }
  }

  /**
   * Créer un nouveau tag
   */
  async createTag(data: { nom: string }): Promise<ApiResponse<TagMotCle>> {
    try {
      const response = await httpClient.post<TagMotCle>('/metadata/tags', data);
      
      // Invalider le cache après création
      this.clearCache();
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du tag'
      };
    }
  }

  // ================================================
  // MATÉRIAUX ET TECHNIQUES (ARTISANAT)
  // ================================================

  /**
   * Obtenir la liste des matériaux
   */
  async getMateriaux(): Promise<ApiResponse<Materiau[]>> {
    try {
      const response = await httpClient.get<Materiau[]>('/metadata/materiaux');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des matériaux'
      };
    }
  }

  /**
   * Obtenir la liste des techniques
   */
  async getTechniques(): Promise<ApiResponse<Technique[]>> {
    try {
      const response = await httpClient.get<Technique[]>('/metadata/techniques');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des techniques'
      };
    }
  }

  // ================================================
  // CATÉGORIES ET GENRES (SANS FILTRE)
  // ================================================

  /**
   * Obtenir toutes les catégories
   */
  async getCategories(): Promise<ApiResponse<Categorie[]>> {
    try {
      const response = await httpClient.get<Categorie[]>('/metadata/categories');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des catégories'
      };
    }
  }

  /**
   * Obtenir tous les genres
   */
  async getGenres(): Promise<ApiResponse<Genre[]>> {
    try {
      const response = await httpClient.get<Genre[]>('/metadata/genres');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des genres'
      };
    }
  }

  // ================================================
  // WILAYAS
  // ================================================

  /**
   * Obtenir toutes les wilayas
   */
  async getWilayas(): Promise<ApiResponse<Wilaya[]>> {
    try {
      const response = await httpClient.get<Wilaya[]>('/metadata/wilayas');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du chargement des wilayas'
      };
    }
  }

  // ================================================
  // HELPERS
  // ================================================

  /**
   * Helper: Construire un arbre de sélection pour les catégories
   */
  buildCategoryTree(categoriesGrouped: CategoryGroupedByGenre[]): Array<{
    label: string;
    value: string;
    children: Array<{
      label: string;
      value: number;
    }>;
  }> {
    return categoriesGrouped.map(genre => ({
      label: genre.nom,
      value: `genre-${genre.id_genre}`,
      children: genre.categories.map(cat => ({
        label: cat.nom,
        value: cat.id_categorie
      }))
    }));
  }

  /**
   * Helper: Obtenir les IDs de genres depuis une liste de catégories
   */
  async getGenreIdsFromCategories(categoryIds: number[]): Promise<number[]> {
    const response = await this.getGenresFromCategories(categoryIds);
    if (response.success && response.data) {
      return response.data.genres.map(g => g.id_genre);
    }
    return [];
  }

  /**
   * Helper: Vérifier si au moins une catégorie est sélectionnée pour un genre
   */
  hasGenreRepresentation(
    selectedCategories: number[], 
    genreId: number,
    categoriesGrouped: CategoryGroupedByGenre[]
  ): boolean {
    const genre = categoriesGrouped.find(g => g.id_genre === genreId);
    if (!genre) return false;
    
    return genre.categories.some(cat => 
      selectedCategories.includes(cat.id_categorie)
    );
  }

  /**
   * Helper: Récupérer les catégories d'un genre spécifique
   */
  getCategoriesOfGenre(
    genreId: number,
    categoriesGrouped: CategoryGroupedByGenre[]
  ): Categorie[] {
    const genre = categoriesGrouped.find(g => g.id_genre === genreId);
    return genre ? genre.categories : [];
  }

  /**
   * Helper: Compter les catégories sélectionnées par genre
   */
  countCategoriesByGenre(
    selectedCategories: number[],
    categoriesGrouped: CategoryGroupedByGenre[]
  ): Map<number, number> {
    const countMap = new Map<number, number>();
    
    categoriesGrouped.forEach(genre => {
      const count = genre.categories.filter(cat => 
        selectedCategories.includes(cat.id_categorie)
      ).length;
      if (count > 0) {
        countMap.set(genre.id_genre, count);
      }
    });
    
    return countMap;
  }
}

// Export de l'instance singleton
export const metadataService = new MetadataService();