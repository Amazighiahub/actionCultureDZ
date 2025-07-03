// services/commentaire.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, FilterParams, PaginatedResponse, PaginationParams } from '@/config/api';
import { httpClient } from './httpClient';

interface Commentaire {
  id: number;
  contenu: string;
  user_id: number;
  user: {
    id: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
  entity_type: 'oeuvre' | 'evenement';
  entity_id: number;
  parent_id?: number;
  replies?: Commentaire[];
  likes_count: number;
  is_liked?: boolean;
  statut: string;
  created_at: string;
  updated_at: string;
}

interface CreateCommentaireData {
  contenu: string;
  parent_id?: number;
}

interface UpdateCommentaireData {
  contenu: string;
}

interface ModerateCommentaireData {
  action: 'approuver' | 'rejeter' | 'supprimer';
  raison?: string;
}

class CommentaireService {
  // Œuvres
  async getCommentairesOeuvre(
    oeuvreId: number, 
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Commentaire>>> {
    // Cast vers FilterParams car httpClient.getPaginated l'attend
    return httpClient.getPaginated<Commentaire>(
      API_ENDPOINTS.commentaires.oeuvre(oeuvreId), 
      params as FilterParams
    );
  }

  async createCommentaireOeuvre(
    oeuvreId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return httpClient.post<Commentaire>(
      API_ENDPOINTS.commentaires.createOeuvre(oeuvreId), 
      data
    );
  }

  // Événements
  async getCommentairesEvenement(
    evenementId: number, 
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Commentaire>>> {
    return httpClient.getPaginated<Commentaire>(
      API_ENDPOINTS.commentaires.evenement(evenementId), 
      params as FilterParams
    );
  }

  async createCommentaireEvenement(
    evenementId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return httpClient.post<Commentaire>(
      API_ENDPOINTS.commentaires.createEvenement(evenementId), 
      data
    );
  }

  // Actions communes
  async update(
    id: number, 
    data: UpdateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return httpClient.put<Commentaire>(
      API_ENDPOINTS.commentaires.update(id), 
      data
    );
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.commentaires.delete(id));
  }

  // Modération (admin)
  async moderate(
    id: number, 
    data: ModerateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return httpClient.post<Commentaire>(
      API_ENDPOINTS.commentaires.moderate(id), 
      data
    );
  }

  // Like/Unlike (si implémenté)
  async toggleLike(id: number): Promise<ApiResponse<{ liked: boolean; likes_count: number }>> {
    return httpClient.post<any>(`/commentaires/${id}/like`);
  }
}

export const commentaireService = new CommentaireService();
export type { Commentaire, CreateCommentaireData, UpdateCommentaireData, ModerateCommentaireData };