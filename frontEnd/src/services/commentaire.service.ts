// services/commentaire.service.ts - VERSION CORRIGÉE
import { httpClient } from './httpClient';
import type { ApiResponse, PaginatedResponse } from '@/config/api';

interface Commentaire {
  id_commentaire: number;
  contenu: string;
  note_qualite?: number;
  statut: string;
  date_creation: string;
  date_modification?: string;
  id_user: number;
  id_oeuvre?: number;
  id_evenement?: number;
  commentaire_parent_id?: number;
  User?: {
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
  Reponses?: Commentaire[];
}

/** Avis sur un service (réponses du professionnel dans Reponses) */
interface AvisService {
  id_commentaire: number;
  id_user: number;
  contenu: string;
  note_qualite?: number | null;
  date_creation: string;
  User?: { nom: unknown; prenom: unknown };
  Reponses?: AvisService[];
}

interface CreateCommentaireData {
  contenu: string;
  note_qualite?: number;
  commentaire_parent_id?: number;
}

class CommentaireService {
  private endpoint = '/commentaires';

  /**
   * ✅ Récupérer les commentaires d'une œuvre
   * Gère gracieusement les erreurs 501 (Not Implemented)
   */
  async getCommentairesOeuvre(
    oeuvreId: number, 
    page = 1, 
    limit = 10
  ): Promise<ApiResponse<PaginatedResponse<Commentaire>>> {
    try {
      const response = await httpClient.get<{
        commentaires: Commentaire[];
        pagination: { total: number; page: number; pages: number; limit: number };
      }>(`${this.endpoint}/oeuvre/${oeuvreId}`, { page, limit });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            items: response.data.commentaires || [],
            total: response.data.pagination?.total || 0,
            page: response.data.pagination?.page || page,
            pages: response.data.pagination?.pages || 1,
            limit: response.data.pagination?.limit || limit,
          }
        };
      }

      // Si pas de succès, retourner liste vide sans erreur
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pages: 1,
          limit,
        }
      };
    } catch (error: unknown) {
      return {
        success: true, // ← Retourner succès avec liste vide
        data: {
          items: [],
          total: 0,
          page,
          pages: 1,
          limit,
        }
      };
    }
  }

  /**
   * ✅ Récupérer les commentaires d'un événement
   */
  async getCommentairesEvenement(
    evenementId: number, 
    page = 1, 
    limit = 10
  ): Promise<ApiResponse<PaginatedResponse<Commentaire>>> {
    try {
      const response = await httpClient.get<{
        commentaires: Commentaire[];
        pagination: { total: number; page: number; pages: number; limit: number };
      }>(`${this.endpoint}/evenement/${evenementId}`, { page, limit });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            items: response.data.commentaires || [],
            total: response.data.pagination?.total || 0,
            page: response.data.pagination?.page || page,
            pages: response.data.pagination?.pages || 1,
            limit: response.data.pagination?.limit || limit,
          }
        };
      }

      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pages: 1,
          limit,
        }
      };
    } catch (error: unknown) {
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pages: 1,
          limit,
        }
      };
    }
  }

  /**
   * Créer un commentaire sur une œuvre
   */
  async createCommentaireOeuvre(
    oeuvreId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    try {
      const response = await httpClient.post<Commentaire>(
        `${this.endpoint}/oeuvre/${oeuvreId}`,
        data
      );
      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer un commentaire sur un événement
   */
  async createCommentaireEvenement(
    evenementId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    try {
      const response = await httpClient.post<Commentaire>(
        `${this.endpoint}/evenement/${evenementId}`,
        data
      );
      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Avis d'un service et note moyenne calculée par le serveur
   */
  async getAvisService(serviceId: number, page = 1, limit = 20) {
    const response = await httpClient.get<{
      commentaires: AvisService[];
      note: { moyenne: number; nombre: number };
      pagination: { total: number; page: number; pages: number; limit: number };
    }>(`${this.endpoint}/service/${serviceId}`, { page, limit });
    return response.data;
  }

  /**
   * Publier un avis (ou une réponse) sur un service ; une erreur porte le message du serveur
   */
  async createAvisService(serviceId: number, data: CreateCommentaireData) {
    return httpClient.post<AvisService>(`${this.endpoint}/service/${serviceId}`, data);
  }

  /**
   * Modifier un commentaire
   */
  async updateCommentaire(
    id: number, 
    data: Partial<CreateCommentaireData>
  ): Promise<ApiResponse<Commentaire>> {
    try {
      const response = await httpClient.put<Commentaire>(
        `${this.endpoint}/${id}`,
        data
      );
      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Supprimer un commentaire
   */
  async deleteCommentaire(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await httpClient.delete<void>(`${this.endpoint}/${id}`);
      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Modérer un commentaire (admin)
   */
  async moderateCommentaire(
    id: number, 
    statut: 'publie' | 'rejete' | 'supprime'
  ): Promise<ApiResponse<void>> {
    try {
      const response = await httpClient.put<void>(
        `${this.endpoint}/${id}/moderate`,
        { statut }
      );
      return response;
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export const commentaireService = new CommentaireService();
export type { Commentaire, CreateCommentaireData, AvisService };