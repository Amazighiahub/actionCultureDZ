// services/oeuvre.service.ts - Version complètement corrigée
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { httpClient } from './httpClient';
import { API_ENDPOINTS, type ApiResponse } from '@/config/api';
import { mediaService } from './media.service';
import { CreateOeuvreBackendDTO } from '@/types/api/create-oeuvre-backend.dto';

class OeuvreService {
  /**
   * Créer une nouvelle œuvre AVEC médias
   */
  async createOeuvreWithMedias(
    data: CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO,
    mediaFiles?: File[]
  ): Promise<ApiResponse<CreateOeuvreResponse>> {
    try {
      console.log('📝 Création œuvre avec médias:', {
        titre: data.titre,
        nb_medias: mediaFiles?.length || 0
      });

      // ÉTAPE 1 : Créer l'œuvre d'abord
      const oeuvreResult = await this.createOeuvre(data);

      if (!oeuvreResult.success || !oeuvreResult.data) {
        return oeuvreResult;
      }

      const oeuvreId = oeuvreResult.data.oeuvre.id_oeuvre;
      console.log('✅ Œuvre créée avec ID:', oeuvreId);

      // ÉTAPE 2 : Upload des médias si présents
      if (mediaFiles && mediaFiles.length > 0) {
        console.log('📤 Upload de', mediaFiles.length, 'médias...');

        const uploadResult = await mediaService.uploadMultiple(
          mediaFiles,
          'oeuvre',
          oeuvreId,
          (progress) => {
            console.log(`Upload ${progress.file}: ${progress.percentage}%`);
          }
        );

        if (!uploadResult.success) {
          console.error('⚠️ Erreur upload médias:', uploadResult.error);
          // L'œuvre est créée mais les médias n'ont pas pu être uploadés
          console.warn('⚠️ Œuvre créée mais certains médias n\'ont pas pu être uploadés');
          return oeuvreResult;
        }

        console.log('✅ Médias uploadés avec succès');
      }

      return oeuvreResult;

    } catch (error: any) {
      console.error('❌ Erreur création œuvre avec médias:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création'
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

      console.log('📝 Création œuvre:', {
        titre: normalizedData.titre,
        type: normalizedData.id_type_oeuvre,
        categories: normalizedData.categories
      });

      const response = await httpClient.post<CreateOeuvreResponse>('/oeuvres', normalizedData);

      return response;
    } catch (error: any) {
      console.error('❌ Erreur création œuvre:', error);

      // Gestion du timeout
      if (error.message &&
        (error.message.includes('timeout') ||
          error.message.includes('Timeout') ||
          error.code === 'ECONNABORTED')) {

        console.log('⏱️ Timeout détecté, vérification de la création...');

        // Attendre un peu et vérifier si l'œuvre a été créée
        await new Promise(resolve => setTimeout(resolve, 2000));

        const checkResult = await this.checkRecentOeuvre(data.titre);
        if (checkResult.success && checkResult.data) {
          console.log('✅ Œuvre trouvée malgré le timeout');
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
        error: error.response?.data?.error || error.message || 'Erreur lors de la création'
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
      formData.append('titre', data.titre);
      formData.append('description', data.description || '');
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
        // Option 1: Envoyer comme JSON
        formData.append('categories', JSON.stringify(data.categories));

        // Option 2: Envoyer chaque élément séparément
        // data.categories.forEach((cat, index) => {
        //   formData.append(`categories[${index}]`, cat.toString());
        // });
      }

      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }

      // Contributeurs
      if ('utilisateurs_inscrits' in data && data.utilisateurs_inscrits?.length) {
        formData.append('utilisateurs_inscrits', JSON.stringify(data.utilisateurs_inscrits));
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

      // Debug
      console.log('📋 FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`- ${key}:`, value);
        }
      }

      const response = await httpClient.postFormData<CreateOeuvreResponse>(
        '/oeuvres',
        formData
      );

      return response;

    } catch (error: any) {
      console.error('❌ Erreur création œuvre FormData:', error);

      if (error.response?.data) {
        console.error('Détails de l\'erreur:', error.response.data);
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erreur lors de la création'
      };
    }
  }

  /**
   * Upload de médias pour une œuvre existante
   */
  async uploadMedias(oeuvreId: number, files: File[]): Promise<ApiResponse<any>> {
    try {
      console.log('📤 Upload médias pour œuvre', oeuvreId);

      return await mediaService.uploadMultiple(
        files,
        'oeuvre',
        oeuvreId,
        (progress) => {
          console.log(`Upload ${progress.file}: ${progress.percentage}%`);
        }
      );
    } catch (error: any) {
      console.error('❌ Erreur upload médias:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'upload'
      };
    }
  }

  /**
   * Rechercher des intervenants
   */
  async searchIntervenants(params: { q: string }): Promise<IntervenantSearchResult[]> {
    try {
      console.log('🔍 Recherche intervenants avec:', params);

      const response = await httpClient.get<IntervenantSearchResult[]>('/intervenants/search', params);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('❌ Erreur recherche intervenants:', error);
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
    } catch (error: any) {
      console.error('Erreur tracking vue:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du tracking de la vue'
      };
    }
  }

  /**
   * Récupérer les événements où l'œuvre est présentée
   */
  async getEventsByOeuvre(oeuvreId: number): Promise<ApiResponse<any[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/evenements`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des événements'
      };
    }
  }

  /**
   * Recommander une œuvre
   */
  async recommendOeuvre(oeuvreId: number, data: {
    destinataire_email: string;
    message?: string;
  }): Promise<ApiResponse<void>> {
    try {
      return await httpClient.post(`/oeuvres/${oeuvreId}/recommander`, data);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la recommandation'
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
      return await httpClient.get(`/oeuvres/${oeuvreId}/stats/vues`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  /**
   * Récupérer les œuvres similaires (recommandations)
   */
  async getSimilarOeuvres(oeuvreId: number, limit = 6): Promise<ApiResponse<Oeuvre[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/similaires`, { limit });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des œuvres similaires'
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
  }): Promise<ApiResponse<{
    oeuvres: Oeuvre[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    try {
      console.log('🔍 Récupération œuvres pour intervenant:', intervenantId);
      
      // Utiliser l'endpoint approprié pour récupérer les œuvres d'un intervenant
      const response = await httpClient.get<{
        oeuvres: Oeuvre[];
        pagination: {
          total: number;
          page: number;
          pages: number;
          limit: number;
        };
      }>(`/intervenants/${intervenantId}/oeuvres`, params);
      
      if (response.success && response.data) {
        console.log(`✅ ${response.data.oeuvres.length} œuvres trouvées pour l'intervenant`);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Erreur récupération œuvres intervenant:', error);
      
      // Alternative : utiliser l'endpoint de recherche d'œuvres avec filtre intervenant
      try {
        const searchResponse = await httpClient.get<{
          oeuvres: Oeuvre[];
          pagination: {
            total: number;
            page: number;
            pages: number;
            limit: number;
          };
        }>('/oeuvres', {
          ...params,
          intervenant_id: intervenantId
        });
        
        return searchResponse;
      } catch (searchError: any) {
        return {
          success: false,
          error: searchError.message || error.message || 'Erreur lors de la récupération des œuvres de l\'intervenant'
        };
      }
    }
  }

  /**
   * Noter une œuvre
   */
  async rateOeuvre(oeuvreId: number, rating: number): Promise<ApiResponse<{
    note_moyenne: number;
    nombre_notes: number;
  }>> {
    try {
      return await httpClient.post(`/oeuvres/${oeuvreId}/noter`, { note: rating });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la notation'
      };
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
      console.error('Erreur vérification email:', error);
      return { success: false, exists: false };
    }
  }

  /**
   * Vérifier si une œuvre récente existe
   */
  async checkRecentOeuvre(titre: string): Promise<ApiResponse<any>> {
    try {
      const response = await httpClient.get<any>('/oeuvres', {
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
      console.error('Erreur vérification œuvre:', error);
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération'
      };
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
    saisi_par?: number; // Ajout du paramètre pour filtrer par créateur
  }): Promise<ApiResponse<{
    oeuvres: Oeuvre[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    try {
      return await httpClient.get('/oeuvres', params);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération'
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
  }): Promise<ApiResponse<{
    oeuvres: Oeuvre[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    try {
      console.log('🔍 Appel API getMyOeuvres avec params:', params);

      // Spécifier le type attendu pour httpClient.get
      const response = await httpClient.get<{
        oeuvres: Oeuvre[];
        pagination: {
          total: number;
          page: number;
          pages: number;
          limit: number;
        };
      }>(API_ENDPOINTS.oeuvres.myWorks, params);

      console.log('📚 Réponse API getMyOeuvres:', response);

      if (!response.success) {
        console.error('❌ Erreur API:', response.error);

        // Si c'est une erreur 401, afficher plus d'infos
        if (response.error?.includes('401') || response.error?.includes('auth')) {
          const token = localStorage.getItem('auth_token');
          console.error('🔐 Problème d\'authentification:', {
            tokenPresent: !!token,
            tokenLength: token?.length,
            error: response.error
          });
        }
      }

      return response;
    } catch (error: any) {
      console.error('❌ Erreur getMyOeuvres:', error);

      // Vérifier si c'est une erreur réseau
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        console.error('🌐 Erreur réseau détectée');
      }

      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération'
      };
    }
  }

  /**
   * Mettre à jour une œuvre
   */
  async updateOeuvre(id: number, data: Partial<CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO>): Promise<ApiResponse<any>> {
    try {
      return await httpClient.put(`/oeuvres/${id}`, data);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour'
      };
    }
  }

  /**
   * Supprimer une œuvre
   */
  async deleteOeuvre(id: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${id}`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression'
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
  }): Promise<ApiResponse<{
    oeuvres: Oeuvre[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    try {
      return await httpClient.get('/oeuvres/search', params);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la recherche'
      };
    }
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(): Promise<ApiResponse<{
    total: number;
    parType: Array<{ type: string; count: number }>;
    parLangue: Array<{ langue: string; count: number }>;
    noteMoyenneGlobale: number;
  }>> {
    try {
      return await httpClient.get('/oeuvres/statistics');
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  /**
   * Récupérer les œuvres récentes
   */
  async getRecentOeuvres(limit = 6): Promise<ApiResponse<{
    oeuvres: Oeuvre[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> {
    try {
      return await httpClient.get('/oeuvres/recent', { limit });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération'
      };
    }
  }

  /**
   * Récupérer les médias d'une œuvre
   */
  async getMedias(oeuvreId: number): Promise<ApiResponse<any[]>> {
    try {
      return await httpClient.get(`/oeuvres/${oeuvreId}/medias`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des médias'
      };
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(oeuvreId: number, mediaId: number): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete(`/oeuvres/${oeuvreId}/medias/${mediaId}`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du média'
      };
    }
  }
  /**
 * Récupérer les œuvres par types (plusieurs types)
 */
async getOeuvresByType(types: number[]): Promise<ApiResponse<Oeuvre[]>> {
  try {
    console.log('🔍 Récupération œuvres par types:', types);
    
    // Option 1: Utiliser un endpoint dédié si disponible
    // return await httpClient.get('/oeuvres/by-types', { types });
    
    // Option 2: Utiliser l'endpoint existant avec un filtre
    const response = await httpClient.get<{
      oeuvres: Oeuvre[];
      pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
      };
    }>('/oeuvres', {
      types: types.join(','), // ou types selon le format accepté par l'API
      limit: 100 // Ajuster selon vos besoins
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
  } catch (error: any) {
    console.error('❌ Erreur récupération œuvres par types:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération'
    };
  }
}

}

// Instance singleton
export const oeuvreService = new OeuvreService();