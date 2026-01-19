// services/commentaire.service.ts - VERSION CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    } catch (error: any) {
      // ✅ Gérer silencieusement les erreurs 501 ou autres
      console.warn('Commentaires non disponibles:', error.message);
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
    } catch (error: any) {
      console.warn('Commentaires événement non disponibles:', error.message);
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du commentaire'
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du commentaire'
      };
    }
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la modification'
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression'
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
      const response = await httpClient.patch<void>(
        `${this.endpoint}/${id}/moderate`,
        { statut }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la modération'
      };
    }
  }
}

export const commentaireService = new CommentaireService();
export type { Commentaire, CreateCommentaireData };