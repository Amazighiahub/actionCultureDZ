// services/metadata.service.ts - VERSION CORRIGÉE
import i18n from 'i18next';
import { httpClient } from './httpClient';
import { API_ENDPOINTS, type ApiResponse } from '../config/api';
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
import { reponseEchec } from '@/utils/erreurServeur';

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
  private cache: Map<string, { data: AllMetadata; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * ✅ CORRIGÉ: Appelle /metadata/ au lieu de /metadata/all
   * La route backend est GET /api/metadata/ (voir metadataRoutes.js ligne 21)
   */
  async getAll(): Promise<ApiResponse<AllMetadata>> {
    try {
      // ❌ AVANT: const response = await httpClient.get<AllMetadata>('/metadata/all');
      // ✅ APRÈS: La route backend est /metadata/ pas /metadata/all
      const response = await httpClient.get<AllMetadata>('/metadata');
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  /**
   * Obtenir toutes les métadonnées avec cache
   */
  async getAllCached(): Promise<ApiResponse<AllMetadata>> {
    // Une copie par langue : les noms (types, genres, langues…) sont traduits par le serveur
    const cacheKey = `all-metadata:${i18n.language || 'fr'}`;
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
   */
  async getCategoriesForType(typeOeuvreId: number): Promise<ApiResponse<CategoryGroupedByGenre[]>> {
    try {
      const response = await httpClient.get<CategoryGroupedByGenre[]>(
        `/metadata/types-oeuvres/${typeOeuvreId}/categories`
      );
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
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
      return false;
    }
  }

  // ================================================
  // TYPES D'ÉVÉNEMENTS
  // ================================================

  async getTypesEvenements(): Promise<ApiResponse<TypeEvenement[]>> {
    try {
      const response = await httpClient.get<TypeEvenement[]>('/metadata/types-evenements');
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  // ================================================
  // TYPES USERS
  // ================================================

  async getTypesUsers(): Promise<ApiResponse<TypeUser[]>> {
    try {
      const response = await httpClient.get<TypeUser[]>('/metadata/types-users');
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  /** Types d'organisation (association, maison d'édition, université…), traduits par le serveur */
  async getTypesOrganisations(): Promise<ApiResponse<Array<{ id_type_organisation: number; nom: unknown; code?: string }>>> {
    try {
      return await httpClient.get(API_ENDPOINTS.metadata.typesOrganisations);
    } catch (error: unknown) {
      return { ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue')) };
    }
  }

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
      this.clearCache();
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  async createTag(data: { nom: string }): Promise<ApiResponse<TagMotCle>> {
    try {
      const response = await httpClient.post<TagMotCle>('/metadata/tags', data);
      this.clearCache();
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  // ================================================
  // MATÉRIAUX ET TECHNIQUES
  // ================================================

  async getMateriaux(): Promise<ApiResponse<Materiau[]>> {
    try {
      const response = await httpClient.get<Materiau[]>('/metadata/materiaux');
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  async getTechniques(): Promise<ApiResponse<Technique[]>> {
    try {
      const response = await httpClient.get<Technique[]>('/metadata/techniques');
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  // ================================================
  // WILAYAS
  // ================================================

  /** @deprecated Dans un composant, utiliser useWilayas (hooks/useGeographie) : liste en cache partagée (audit V11 COD-11) */
  async getWilayas(): Promise<ApiResponse<Wilaya[]>> {
    try {
      const response = await httpClient.get<Wilaya[]>(API_ENDPOINTS.metadata.geographie.wilayas);
      return response;
    } catch (error: unknown) {
      return {
        ...reponseEchec(error, i18n.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }
}

// Export de l'instance singleton
export const metadataService = new MetadataService();