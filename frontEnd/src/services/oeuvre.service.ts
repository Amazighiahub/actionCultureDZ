// services/oeuvre.service.ts - Version complètement corrigée
import {
  CreateOeuvreCompleteDTO,
  CreateOeuvreResponse,
  IntervenantSearchResult,
  CheckUserByEmailResponse,
  IntervenantExistant,
  NouvelIntervenant,
  EditeurOeuvre
} from '@/types/api/oeuvre-creation.types';
import { Oeuvre } from '@/types/models/oeuvre.types';
import { Media } from '@/types/models/media.types';
import { Evenement } from '@/types/models/evenement.types';
import { httpClient } from './httpClient';
import { API_ENDPOINTS, type ApiResponse } from '@/config/api';
import { mediaService } from './media.service';
import { CreateOeuvreBackendDTO } from '@/types/api/create-oeuvre-backend.dto';

// ========================================
// EXPORTS DE TYPES - AJOUTER CE BLOC !
// ========================================

// Ré-export des types depuis leurs sources
export type { Oeuvre } from '@/types/models/oeuvre.types';
export type {
  CreateOeuvreCompleteDTO,
  CreateOeuvreResponse,
  IntervenantSearchResult,
  CheckUserByEmailResponse,
  IntervenantExistant,
  NouvelIntervenant,
  EditeurOeuvre
} from '@/types/api/oeuvre-creation.types';
export type { CreateOeuvreBackendDTO } from '@/types/api/create-oeuvre-backend.dto';

// Types alias pour l'API
export type CreateOeuvreData = CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO;
export type UpdateOeuvreData = Partial<CreateOeuvreData>;

// Interface pour les paramètres de recherche
export interface SearchOeuvresParams {
  q?: string;
  type?: number;
  langue?: number;
  categorie?: number;
  annee_min?: number;
  annee_max?: number;
  prix_min?: number;
  prix_max?: number;
  editeur?: number;
  tag?: string;
  intervenant?: string;
  limit?: number;
  page?: number;
  sort?: string;
  statut?: string;
  saisi_par?: number;
}

// Interface pour les statistiques
export interface OeuvreStatistics {
  total: number;
  parType: Array<{ type: string; count: number }>;
  parLangue: Array<{ langue: string; count: number }>;
  noteMoyenneGlobale: number;
}

// Interface pour les liens de partage
export interface ShareLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  whatsapp: string;
  email: string;
  embed?: string;
}

// Interface pour la réponse paginée d'oeuvres
interface OeuvreListResponse {
  oeuvres: Oeuvre[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

// Helper pour extraire le message d'erreur
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}

// Helper pour extraire le message d'erreur de réponse API
function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const axiosError = error as {
      response?: {
        data?: {
          error?: string;
          details?: Array<{ field?: string; message?: string }> | Record<string, unknown>;
          errors?: Array<{ field?: string; message?: string }>;
        };
      };
    };
    const apiError = axiosError.response?.data?.error;
    const apiDetails = axiosError.response?.data?.details;
    const apiErrors = axiosError.response?.data?.errors;

    const detailItems = Array.isArray(apiDetails)
      ? apiDetails
      : Array.isArray(apiErrors)
        ? apiErrors
        : [];

    const formattedDetails = detailItems
      .map((item) => {
        const field = item.field ? `${item.field}: ` : '';
        return item.message ? `${field}${item.message}` : null;
      })
      .filter((item): item is string => Boolean(item));

    if (formattedDetails.length > 0) {
      const baseMessage = apiError || error.message || fallback;
      return `${baseMessage} — ${formattedDetails.join(' | ')}`;
    }

    return apiError || error.message || fallback;
  }
  return fallback;
}

class OeuvreService {
  /**
   * Créer une nouvelle œuvre AVEC médias
   */
  async createOeuvreWithMedias(
    data: CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO,
    mediaFiles?: File[]
  ): Promise<ApiResponse<CreateOeuvreResponse>> {
    try {
      // ÉTAPE 1 : Créer l'œuvre d'abord
      const oeuvreResult = await this.createOeuvre(data);

      if (!oeuvreResult.success || !oeuvreResult.data) {
        return oeuvreResult;
      }

      const oeuvreId = oeuvreResult.data.oeuvre.id_oeuvre;

      // ÉTAPE 2 : Upload des médias si présents
      if (mediaFiles && mediaFiles.length > 0) {
        const uploadResult = await mediaService.uploadMultiple(
        mediaFiles,
        'oeuvre',
        oeuvreId,
        () => {}
        );

        if (!uploadResult.success) {
          return oeuvreResult;
        }
      }

      return oeuvreResult;

    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la création')
      };
    }
  }

  /**
   * Créer une nouvelle œuvre (sans médias)
   */
  async createOeuvre(data: CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO): Promise<ApiResponse<CreateOeuvreResponse>> {
    try {
      // S'assurer que les catégories sont toujours un tableau
      const normalizedData = {
        ...data,
        categories: Array.isArray(data.categories) ? data.categories : data.categories ? [data.categories] : []
      };

      const response = await httpClient.post<CreateOeuvreResponse>('/oeuvres', normalizedData);

      return response;
    } catch (error: unknown) {
      // Gestion du timeout
      const errMsg = getErrorMessage(error, '');
      const errCode = (error as { code?: string }).code;

      if (errMsg.includes('timeout') || errMsg.includes('Timeout') || errCode === 'ECONNABORTED') {
        // Attendre un peu et vérifier si l'œuvre a été créée
        await new Promise(resolve => setTimeout(resolve, 2000));

        const checkResult = await this.checkRecentOeuvre(data.titre);
        if (checkResult.success && checkResult.data) {
          return {
            success: true,
            data: {
              oeuvre: checkResult.data,
              message: 'Œuvre créée (récupérée après timeout)'
            }
          };
        }
      }

      return {
        success: false,
        error: getApiErrorMessage(error, 'Erreur lors de la création')
      };
    }
  }

  /**
   * Alternative : Créer une œuvre avec FormData (pour upload direct)
   */
  async createOeuvreFormData(
    data: CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO,
    mediaFiles?: File[],
    mediaMetadata?: Array<{ is_principal: boolean }>
  ): Promise<ApiResponse<CreateOeuvreResponse>> {
    try {
      const formData = new FormData();

      // Ajouter les champs simples directement
      formData.append('titre', typeof data.titre === 'string' ? data.titre : JSON.stringify(data.titre));
      formData.append('description', typeof data.description === 'string' ? data.description : JSON.stringify(data.description || {}));
      formData.append('id_type_oeuvre', data.id_type_oeuvre.toString());
      formData.append('id_langue', data.id_langue.toString());

      if (data.annee_creation) {
        formData.append('annee_creation', data.annee_creation.toString());
      }
      if (data.prix) {
        formData.append('prix', data.prix.toString());
      }

      // Pour les tableaux et objets, les stringifier
      if (data.categories && data.categories.length > 0) {
        formData.append('categories', JSON.stringify(data.categories));
      }

      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }

      // Contributeurs
      if ('utilisateurs_inscrits' in data && data.utilisateurs_inscrits?.length) {
        formData.append('utilisateurs_inscrits', JSON.stringify(data.utilisateurs_inscrits));
      }

      if ('intervenants_existants' in data) {
        const completeData = data as CreateOeuvreCompleteDTO;
        if (completeData.intervenants_existants?.length) {
          formData.append('intervenants_existants', JSON.stringify(completeData.intervenants_existants));
        }
      }

      if ('intervenants_non_inscrits' in data && data.intervenants_non_inscrits?.length) {
        formData.append('intervenants_non_inscrits', JSON.stringify(data.intervenants_non_inscrits));
      }

      if ('nouveaux_intervenants' in data && data.nouveaux_intervenants?.length) {
        formData.append('nouveaux_intervenants', JSON.stringify(data.nouveaux_intervenants));
      }

      if ('editeurs' in data && data.editeurs?.length) {
        formData.append('editeurs', JSON.stringify(data.editeurs));
      }

      // Détails spécifiques
      if (data.details_specifiques && Object.keys(data.details_specifiques).length > 0) {
        formData.append('details_specifiques', JSON.stringify(data.details_specifiques));
      }

      // Ajouter les fichiers médias
      if (mediaFiles && mediaFiles.length > 0) {
        mediaFiles.forEach((file) => {
          formData.append('medias', file);
        });
        if (mediaMetadata && mediaMetadata.length > 0) {
          formData.append('media_metadata', JSON.stringify(mediaMetadata));
        }
      }

      const response = await httpClient.postFormData<CreateOeuvreResponse>(
        '/oeuvres',
        formData
      );

      return response;

    } catch (error: unknown) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Erreur lors de la création')
      };
    }
  }

  /**
   * Upload de médias pour une œuvre existante
   */
  async uploadMedias(oeuvreId: number, files: File[]): Promise<ApiResponse<Media[]>> {
    try {
      const result = await mediaService.uploadMultiple(
        files,
        'oeuvre',
        oeuvreId,
        () => {}
      );
      // Map MediaUploadResponse[] to Media[] in the response
      return result as ApiResponse<Media[]>;
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de l\'upload')
      };
    }
  }

  /**
   * Rechercher des intervenants
   */
  async searchIntervenants(params: { q: string }): Promise<IntervenantSearchResult[]> {
    try {
      const response = await httpClient.get<IntervenantSearchResult[]>('/intervenants/search', params);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Enregistrer une vue pour une œuvre
   */
  async trackView(idOeuvre: number): Promise<ApiResponse<void>> {
    try {
      // Utiliser la bonne route de tracking
      return await httpClient.post(`/tracking/oeuvre/${idOeuvre}/view`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors du tracking de la vue')
      };
    }
  }

  /**
   * Récupérer les événements où l'œuvre est présentée
   */
  async getEventsByOeuvre(oeuvreId: number): Promise<ApiResponse<Evenement[]>> {
    try {
      return await httpClient.get(`/evenements/oeuvre/${oeuvreId}`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération des événements')
      };
    }
  }

  /**
   * Récupérer les statistiques de vues d'une œuvre
   */
  async getViewStats(oeuvreId: number): Promise<ApiResponse<{
    total_vues: number;
    vues_uniques: number;
    vues_30_jours: number;
    evolution: Array<{ date: string; vues: number }>;
  }>> {
    try {
      return await httpClient.get(`/tracking/stats/oeuvre/${oeuvreId}`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération des statistiques')
      };
    }
  }

  /**
   * Récupérer les œuvres similaires (recommandations)
   */
  async getSimilarOeuvres(oeuvreId: number, limit = 6): Promise<ApiResponse<Oeuvre[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/similar`, { limit });
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération des œuvres similaires')
      };
    }
  }

  /**
   * Récupérer les œuvres d'un intervenant
   */
  async getOeuvresByIntervenant(intervenantId: number, params?: {
    page?: number;
    limit?: number;
    role_principal?: boolean;
  }): Promise<ApiResponse<OeuvreListResponse>> {
    try {
      const response = await httpClient.get<OeuvreListResponse>(
        `/intervenants/${intervenantId}/oeuvres`, params
      );

      return response;
    } catch (error: unknown) {
      // Alternative : utiliser l'endpoint de recherche d'œuvres avec filtre intervenant
      try {
        const searchResponse = await httpClient.get<OeuvreListResponse>('/oeuvres', {
          ...params,
          intervenant_id: intervenantId
        });

        return searchResponse;
      } catch (searchError: unknown) {
        return {
          success: false,
          error: getErrorMessage(searchError, getErrorMessage(error, 'Erreur lors de la récupération des œuvres de l\'intervenant'))
        };
      }
    }
  }

  /**
   * Vérifier si un email existe
   */
  async checkUserByEmail(email: string): Promise<CheckUserByEmailResponse> {
    try {
      const response = await httpClient.post<CheckUserByEmailResponse>('/users/check-email', { email });

      if (response.success && response.data) {
        return response.data;
      }

      return { success: false, exists: false };
    } catch (error) {
      return { success: false, exists: false };
    }
  }

  /**
   * Vérifier si une œuvre récente existe
   */
  async checkRecentOeuvre(titre: string): Promise<ApiResponse<Oeuvre>> {
    try {
      const response = await httpClient.get<OeuvreListResponse>('/oeuvres', {
        search: titre,
        sort: 'recent',
        limit: 1
      });

      if (response.success && response.data?.oeuvres?.length > 0) {
        const oeuvre = response.data.oeuvres[0];

        const createdAt = new Date(oeuvre.date_creation);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        if (diffMinutes <= 5) {
          return {
            success: true,
            data: oeuvre
          };
        }
      }

      return {
        success: false,
        error: 'Aucune œuvre récente trouvée'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la vérification'
      };
    }
  }

  /**
   * Récupérer une œuvre par ID
   */
  async getOeuvreById(id: number): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.get<Oeuvre>(`/oeuvres/${id}`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération')
      };
    }
  }

  /**
   * Alias rétrocompatible pour les consommateurs historiques
   */
  async getById(id: number): Promise<ApiResponse<Oeuvre>> {
    return this.getOeuvreById(id);
  }

  /**
   * Récupérer la liste des œuvres avec filtres
   */
  async getOeuvres(params?: {
    page?: number;
    limit?: number;
    statut?: string;
    type?: number;
    langue?: number;
    categorie?: number;
    search?: string;
    sort?: string;
    saisi_par?: number;
  }): Promise<ApiResponse<OeuvreListResponse>> {
    try {
      return await httpClient.get('/oeuvres', params);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération')
      };
    }
  }

  /**
   * Récupérer mes œuvres (œuvres de l'utilisateur connecté)
   */
  async getMyOeuvres(params?: {
    page?: number;
    limit?: number;
    statut?: string;
  }): Promise<ApiResponse<OeuvreListResponse>> {
    try {
      const response = await httpClient.get<OeuvreListResponse>(API_ENDPOINTS.oeuvres.myWorks, params);

      if (!response.success) {
        return response;
      }

      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération')
      };
    }
  }

  /**
   * Mettre à jour une œuvre
   */
  async updateOeuvre(id: number, data: Partial<CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO>): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.put(`/oeuvres/${id}`, data);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la mise à jour')
      };
    }
  }

  /**
   * Supprimer une œuvre
   */
  async deleteOeuvre(id: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${id}`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la suppression')
      };
    }
  }

  /**
   * Recherche avancée
   */
  async searchOeuvres(params: {
    q?: string;
    type?: number;
    langue?: number;
    categorie?: number;
    annee_min?: number;
    annee_max?: number;
    prix_min?: number;
    prix_max?: number;
    editeur?: number;
    tag?: string;
    intervenant?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<OeuvreListResponse>> {
    try {
      return await httpClient.get('/oeuvres/search', params);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la recherche')
      };
    }
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(): Promise<ApiResponse<OeuvreStatistics>> {
    try {
      return await httpClient.get('/oeuvres/statistics');
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération des statistiques')
      };
    }
  }

  /**
   * Récupérer les œuvres récentes
   */
  async getRecentOeuvres(limit = 6): Promise<ApiResponse<OeuvreListResponse>> {
    try {
      return await httpClient.get('/oeuvres/recent', { limit });
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération')
      };
    }
  }

  /**
   * Récupérer les médias d'une œuvre
   */
  async getMedias(oeuvreId: number): Promise<ApiResponse<Media[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/medias`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la récupération des médias')
      };
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(oeuvreId: number, mediaId: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${oeuvreId}/medias/${mediaId}`);
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Erreur lors de la suppression du média')
      };
    }
  }
  /**
 * Récupérer les œuvres par types (plusieurs types)
 */
async getOeuvresByType(types: number[]): Promise<ApiResponse<Oeuvre[]>> {
  try {
    const response = await httpClient.get<OeuvreListResponse>('/oeuvres', {
      types: types.join(','),
      limit: 100
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.oeuvres
      };
    }

    return {
      success: false,
      error: 'Erreur lors de la récupération des œuvres'
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, 'Erreur lors de la récupération')
    };
  }
}

}

// Instance singleton
export const oeuvreService = new OeuvreService();
