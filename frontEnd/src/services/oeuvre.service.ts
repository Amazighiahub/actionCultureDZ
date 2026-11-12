// services/oeuvre.service.ts - Version complètement corrigée
import i18next from 'i18next';
import { reponseEchec } from '@/utils/erreurServeur';
import { CreateOeuvreCompleteDTO, CreateOeuvreResponse, IntervenantSearchResult, CheckUserByEmailResponse } from '@/types/api/oeuvre-creation.types';
import { Oeuvre } from '@/types/models/oeuvre.types';
import { Media } from '@/types/models/media.types';
import { httpClient } from './httpClient';
import { API_ENDPOINTS, type ApiResponse } from '@/config/api';
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

class OeuvreService {

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
              message: i18next.t('oeuvreService.creeeApresDelai', 'Œuvre créée (retrouvée après un délai dépassé)')
            }
          };
        }
      }

      // Détail des champs, code et statut gardés : le formulaire place chaque refus sous son champ
      // (avant : getApiErrorMessage cherchait « error.response », absent d'une HttpError, et perdait tout)
      return reponseEchec(error, i18next.t('ajouteroeuvre.createError', "Erreur lors de la création de l'oeuvre"));
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
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.vue', 'Erreur lors de l’enregistrement de la vue'));
    }
  }

  /**
   * Récupérer les œuvres similaires (recommandations)
   */
  async getSimilarOeuvres(oeuvreId: number, limit = 6): Promise<ApiResponse<Oeuvre[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/similar`, { limit });
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.similaires', 'Erreur lors de la récupération des œuvres similaires'));
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
        error: i18next.t('oeuvreService.erreurs.aucuneRecente', 'Aucune œuvre récente trouvée')
      };
    } catch (error) {
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.verification', 'Erreur lors de la vérification'));
    }
  }

  /**
   * Récupérer une œuvre par ID
   */
  /** Œuvre pour le formulaire de modification : toutes les langues (voir BaseService.getForEdit) */
  async getForEdit(id: number): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.get<Oeuvre>(`/oeuvres/${id}`, { i18n: 'all' });
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.recuperation', 'Erreur lors de la récupération'));
    }
  }

  async getOeuvreById(id: number): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.get<Oeuvre>(`/oeuvres/${id}`);
    } catch (error: unknown) {
      // Statut gardé : une œuvre absente (404) n'est pas redemandée, et la page dit « introuvable »
      // au lieu de 7 s d'attente (audit V11 UX-7)
      return reponseEchec(error, i18next.t('errors.loadingFailed', 'Erreur lors du chargement'));
    }
  }

  /**
   * Soumettre une œuvre pour validation (brouillon → en_attente)
   */
  async submitForValidation(oeuvreId: number): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.post<Oeuvre>(`/oeuvres/${oeuvreId}/submit`, {});
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('service.errors.submitFailed', 'Erreur lors de la soumission'));
    }
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
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.recuperation', 'Erreur lors de la récupération'));
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
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.recuperation', 'Erreur lors de la récupération'));
    }
  }

  /**
   * Mettre à jour une œuvre
   */
  async updateOeuvre(id: number, data: Partial<CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO>): Promise<ApiResponse<Oeuvre>> {
    try {
      return await httpClient.put(`/oeuvres/${id}`, data);
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('ajouteroeuvre.updateError', 'Erreur lors de la mise à jour'));
    }
  }

  /**
   * Supprimer une œuvre
   */
  async deleteOeuvre(id: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${id}`);
    } catch (error: unknown) {
      // Statut gardé : le tableau de bord reconnaît une œuvre déjà supprimée (404)
      return reponseEchec(error, i18next.t('toasts.deleteFailed', 'Erreur de suppression'));
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
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.recherche', 'Erreur lors de la recherche'));
    }
  }

  /**
   * Récupérer les médias d'une œuvre
   */
  async getMedias(oeuvreId: number): Promise<ApiResponse<Media[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/medias`);
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('oeuvreService.erreurs.medias', 'Erreur lors de la récupération des médias'));
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(oeuvreId: number, mediaId: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${oeuvreId}/medias/${mediaId}`);
    } catch (error: unknown) {
      return reponseEchec(error, i18next.t('common.deleteError', 'Impossible de supprimer'));
    }
  }

}

// Instance singleton
export const oeuvreService = new OeuvreService();
