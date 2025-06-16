// services/metadata.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../config/api';
import type { ApiResponse, PaginatedResponse } from '../config/api';
import type {
  Wilaya,
  Daira,
  Commune,
  Localite
} from '../types/models/geography.types';
import type {
  TypeOeuvre,
  TypeEvenement,
  TypeOrganisation,
  Genre,
  Langue,
  Categorie,
  TagMotCle,
  Materiau,
  Technique,
  Editeur
} from '../types/models/references.types';
import { UploadResponse, uploadService } from './upload.service';

interface MetadataStatistics {
  total_categories: number;
  total_tags: number;
  total_materiaux: number;
  total_techniques: number;
  total_langues: number;
  total_genres: number;
}

interface AllMetadata {
  types_oeuvres: TypeOeuvre[];
  types_evenements: TypeEvenement[];
  types_organisations: TypeOrganisation[];
  genres: Genre[];
  langues: Langue[];
  categories: Categorie[];
  materiaux: Materiau[];
  techniques: Technique[];
  editeurs: Editeur[];
  wilayas: Wilaya[];
}

export class MetadataService {
  /**
   * Obtenir toutes les métadonnées
   */
  async getAll(): Promise<ApiResponse<AllMetadata>> {
    return httpClient.get<AllMetadata>(API_ENDPOINTS.metadata.all);
  }

  /**
   * Obtenir les statistiques des métadonnées
   */
  async getStatistics(): Promise<ApiResponse<MetadataStatistics>> {
    return httpClient.get<MetadataStatistics>(API_ENDPOINTS.metadata.statistics);
  }

  // ================================================
  // MATÉRIAUX
  // ================================================

  /**
   * Obtenir la liste des matériaux
   */
  async getMateriaux(): Promise<ApiResponse<Materiau[]>> {
    return httpClient.get<Materiau[]>(API_ENDPOINTS.metadata.materiaux.list);
  }

  /**
   * Créer un nouveau matériau
   */
  async createMateriau(data: { nom: string; description?: string }): Promise<ApiResponse<Materiau>> {
    return httpClient.post<Materiau>(API_ENDPOINTS.metadata.materiaux.create, data);
  }

  /**
   * Mettre à jour un matériau
   */
  async updateMateriau(id: number, data: { nom?: string; description?: string }): Promise<ApiResponse<Materiau>> {
    return httpClient.put<Materiau>(API_ENDPOINTS.metadata.materiaux.update(id), data);
  }

  /**
   * Supprimer un matériau
   */
  async deleteMateriau(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.metadata.materiaux.delete(id));
  }

  // ================================================
  // TECHNIQUES
  // ================================================

  /**
   * Obtenir la liste des techniques
   */
  async getTechniques(): Promise<ApiResponse<Technique[]>> {
    return httpClient.get<Technique[]>(API_ENDPOINTS.metadata.techniques.list);
  }

  /**
   * Créer une nouvelle technique
   */
  async createTechnique(data: { nom: string; description?: string }): Promise<ApiResponse<Technique>> {
    return httpClient.post<Technique>(API_ENDPOINTS.metadata.techniques.create, data);
  }

  /**
   * Mettre à jour une technique
   */
  async updateTechnique(id: number, data: { nom?: string; description?: string }): Promise<ApiResponse<Technique>> {
    return httpClient.put<Technique>(API_ENDPOINTS.metadata.techniques.update(id), data);
  }

  /**
   * Supprimer une technique
   */
  async deleteTechnique(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.metadata.techniques.delete(id));
  }

  // ================================================
  // LANGUES
  // ================================================

  /**
   * Obtenir la liste des langues
   */
  async getLangues(): Promise<ApiResponse<Langue[]>> {
    return httpClient.get<Langue[]>(API_ENDPOINTS.metadata.langues);
  }

  // ================================================
  // CATÉGORIES
  // ================================================

  /**
   * Obtenir la liste des catégories
   */
  async getCategories(): Promise<ApiResponse<Categorie[]>> {
    return httpClient.get<Categorie[]>(API_ENDPOINTS.metadata.categories.list);
  }

  /**
   * Rechercher des catégories
   */
  async searchCategories(query: string): Promise<ApiResponse<Categorie[]>> {
    return httpClient.get<Categorie[]>(
      API_ENDPOINTS.metadata.categories.search,
      { q: query }  // ✅ Correction: passer directement les paramètres
    );
  }

  // ================================================
  // TYPES
  // ================================================

  /**
   * Obtenir les types d'œuvres
   */
  async getTypesOeuvres(): Promise<ApiResponse<TypeOeuvre[]>> {
    return httpClient.get<TypeOeuvre[]>(API_ENDPOINTS.metadata.typesOeuvres);
  }

  /**
   * Obtenir les genres
   */
  async getGenres(): Promise<ApiResponse<Genre[]>> {
    return httpClient.get<Genre[]>(API_ENDPOINTS.metadata.genres);
  }

  /**
   * Obtenir les éditeurs
   */
  async getEditeurs(): Promise<ApiResponse<Editeur[]>> {
    return httpClient.get<Editeur[]>(API_ENDPOINTS.metadata.editeurs);
  }

  /**
   * Obtenir les types d'organisations
   */
  async getTypesOrganisations(): Promise<ApiResponse<TypeOrganisation[]>> {
    return httpClient.get<TypeOrganisation[]>(API_ENDPOINTS.metadata.typesOrganisations);
  }

  // ================================================
  // GÉOGRAPHIE
  // ================================================

  /**
   * Obtenir toutes les wilayas
   */
  async getWilayas(): Promise<ApiResponse<Wilaya[]>> {
    return httpClient.get<Wilaya[]>(API_ENDPOINTS.metadata.geographie.wilayas);
  }

  /**
   * Rechercher des wilayas
   */
  async searchWilayas(query: string): Promise<ApiResponse<Wilaya[]>> {
    return httpClient.get<Wilaya[]>(
      API_ENDPOINTS.metadata.geographie.searchWilayas,
      { q: query }  // ✅ Correction: passer directement les paramètres
    );
  }

  /**
   * Obtenir les dairas d'une wilaya
   */
  async getDairasByWilaya(wilayaId: number): Promise<ApiResponse<Daira[]>> {
    return httpClient.get<Daira[]>(
      API_ENDPOINTS.metadata.geographie.dairasByWilaya(wilayaId)
    );
  }

  /**
   * Obtenir les communes d'une daira
   */
  async getCommunesByDaira(dairaId: number): Promise<ApiResponse<Commune[]>> {
    return httpClient.get<Commune[]>(
      API_ENDPOINTS.metadata.geographie.communesByDaira(dairaId)
    );
  }

  /**
   * Obtenir les localités d'une commune
   */
  async getLocalitesByCommune(communeId: number): Promise<ApiResponse<Localite[]>> {
    return httpClient.get<Localite[]>(
      API_ENDPOINTS.metadata.geographie.localitesByCommune(communeId)
    );
  }

  // ================================================
  // TAGS
  // ================================================

  /**
   * Obtenir la liste des tags
   */
  async getTags(): Promise<ApiResponse<TagMotCle[]>> {
    return httpClient.get<TagMotCle[]>(API_ENDPOINTS.metadata.tags.list);
  }

  /**
   * Créer un nouveau tag
   */
  async createTag(data: { nom: string }): Promise<ApiResponse<TagMotCle>> {
    return httpClient.post<TagMotCle>(API_ENDPOINTS.metadata.tags.create, data);
  }

  // ================================================
  // HELPERS
  // ================================================

  /**
   * Cache local des métadonnées (pour éviter les requêtes répétées)
   */
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Obtenir des données avec cache
   */
  private async getWithCache<T>(key: string, fetcher: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return {
        success: true,
        data: cached.data as T
      };
    }

    const response = await fetcher();
    
    if (response.success && response.data) {
      this.cache.set(key, {
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

  /**
   * Obtenir toutes les métadonnées avec cache
   */
  async getAllCached(): Promise<ApiResponse<AllMetadata>> {
    return this.getWithCache('all-metadata', () => this.getAll());
  }

  /**
   * Obtenir les wilayas avec cache
   */
  async getWilayasCached(): Promise<ApiResponse<Wilaya[]>> {
    return this.getWithCache('wilayas', () => this.getWilayas());
  }
  // Ajoutez cette méthode dans la classe MediaService de media.service.ts

/**
 * Upload d'une photo de profil lors de l'inscription (sans authentification)
 * Cette méthode est différente de uploadProfilePhoto car elle n'essaie pas
 * de mettre à jour le profil (qui n'existe pas encore)
 */
async uploadProfilePhotoForRegistration(file: File): Promise<ApiResponse<UploadResponse>> {
  // Valider le fichier
  const validation = uploadService.validateFile(file, 'image');
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  console.log('📷 Upload photo pour inscription:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  // Utiliser uploadService pour l'upload PUBLIC (pas d'auth requise)
  const result = await uploadService.uploadImage(file, {
    isPublic: true,  // IMPORTANT: endpoint public car pas encore authentifié
    generateThumbnail: true,
    maxWidth: 500,
    maxHeight: 500,
    quality: 0.9
  });

  // Log pour debug
  if (result.success && result.data) {
    console.log('✅ Photo uploadée pour inscription:', {
      url: result.data.url,
      filename: result.data.filename
    });
  } else {
    console.error('❌ Échec upload photo inscription:', result.error);
  }

  // Retourner simplement le résultat de l'upload
  // PAS de mise à jour du profil car l'utilisateur n'existe pas encore
  return result;
}
}

// Export de l'instance singleton
export const metadataService = new MetadataService();