// services/commentaire.service.ts - Service de gestion des commentaires corrigé

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { Commentaire } from '../types/User.types';

export type CommentaireType = 'oeuvre' | 'evenement';
export type CommentaireStatut = 'en_attente' | 'approuve' | 'rejete' | 'modere';

export interface CommentaireFilters {
  statut?: CommentaireStatut;
  noteQualiteMin?: number;
  avecReponses?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CommentaireStats {
  total: number;
  moyenne: number;
  parNote: Record<number, number>;
  recentComments: number;
}

export interface CreateCommentaireData {
  contenu: string;
  noteQualite?: number;
  commentaireParentId?: number;
}

export interface ModerateCommentaireData {
  statut: CommentaireStatut;
  raison?: string;
  notifierAuteur?: boolean;
}

export class CommentaireService {
  /**
   * RÉCUPÉRATION DES COMMENTAIRES
   */

  /**
   * Récupérer les commentaires d'une œuvre
   */
  static async getByOeuvre(
    oeuvreId: number, 
    filters?: CommentaireFilters
  ): Promise<PaginatedResponse<Commentaire>> {
    return apiService.getPaginated<Commentaire>(
      API_ENDPOINTS.commentaires.oeuvre(oeuvreId), 
      filters
    );
  }

  /**
   * Récupérer les commentaires d'un événement
   */
  static async getByEvenement(
    evenementId: number, 
    filters?: CommentaireFilters
  ): Promise<PaginatedResponse<Commentaire>> {
    return apiService.getPaginated<Commentaire>(
      API_ENDPOINTS.commentaires.evenement(evenementId), 
      filters
    );
  }

  /**
   * CRÉATION DE COMMENTAIRES
   */

  /**
   * Créer un commentaire sur une œuvre
   */
  static async createForOeuvre(
    oeuvreId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return apiService.post<Commentaire>(
      API_ENDPOINTS.commentaires.createOeuvre(oeuvreId), 
      data
    );
  }

  /**
   * Créer un commentaire sur un événement
   */
  static async createForEvenement(
    evenementId: number, 
    data: CreateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return apiService.post<Commentaire>(
      API_ENDPOINTS.commentaires.createEvenement(evenementId), 
      data
    );
  }

  /**
   * MODIFICATION ET SUPPRESSION
   */

  /**
   * Mettre à jour un commentaire
   */
  static async update(
    id: number, 
    data: { contenu?: string; noteQualite?: number }
  ): Promise<ApiResponse<Commentaire>> {
    return apiService.put<Commentaire>(
      API_ENDPOINTS.commentaires.update(id), 
      data
    );
  }

  /**
   * Supprimer un commentaire
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.commentaires.delete(id)
    );
  }

  /**
   * MODÉRATION (ADMIN)
   */

  /**
   * Modérer un commentaire
   */
  static async moderate(
    id: number, 
    data: ModerateCommentaireData
  ): Promise<ApiResponse<Commentaire>> {
    return apiService.patch<Commentaire>(
      API_ENDPOINTS.commentaires.moderate(id), 
      data
    );
  }

  /**
   * HELPERS
   */

  /**
   * Organiser les commentaires en arbre (threads)
   */
  static buildCommentTree(commentaires: Commentaire[]): Commentaire[] {
    const map = new Map<number, Commentaire>();
    const roots: Commentaire[] = [];

    // Créer une copie pour ne pas modifier les originaux
    const comments = commentaires.map(c => ({ ...c, reponses: [] }));

    // Créer la map
    comments.forEach(comment => {
      map.set(comment.idCommentaire, comment);
    });

    // Construire l'arbre
    comments.forEach(comment => {
      if (comment.commentaireParentId) {
        const parent = map.get(comment.commentaireParentId);
        if (parent) {
          if (!parent.reponses) parent.reponses = [];
          parent.reponses.push(comment);
        } else {
          // Si le parent n'existe pas, traiter comme racine
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    // Trier les réponses par date
    const sortReplies = (comments: Commentaire[]) => {
      comments.forEach(comment => {
        if (comment.reponses && comment.reponses.length > 0) {
          comment.reponses.sort((a, b) => 
            new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
          );
          sortReplies(comment.reponses);
        }
      });
    };

    sortReplies(roots);

    // Trier les racines (plus récent en premier)
    roots.sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );

    return roots;
  }

  /**
   * Compter le nombre total de commentaires (incluant les réponses)
   */
  static countTotalComments(comments: Commentaire[]): number {
    let count = 0;
    
    const countRecursive = (commentList: Commentaire[]) => {
      commentList.forEach(comment => {
        count++;
        if (comment.reponses && comment.reponses.length > 0) {
          countRecursive(comment.reponses);
        }
      });
    };
    
    countRecursive(comments);
    return count;
  }

  /**
   * Calculer la note moyenne
   */
  static calculateAverageRating(commentaires: Commentaire[]): number {
    const withRating = commentaires.filter(c => c.noteQualite);
    if (withRating.length === 0) return 0;
    
    const sum = withRating.reduce((acc, c) => acc + (c.noteQualite || 0), 0);
    return Math.round((sum / withRating.length) * 10) / 10;
  }

  /**
   * Obtenir les statistiques des commentaires
   */
  static getStats(commentaires: Commentaire[]): CommentaireStats {
    const total = this.countTotalComments(commentaires);
    const moyenne = this.calculateAverageRating(commentaires);
    
    const parNote: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    commentaires.forEach(c => {
      if (c.noteQualite) {
        parNote[c.noteQualite] = (parNote[c.noteQualite] || 0) + 1;
      }
    });
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentComments = commentaires.filter(c => 
      new Date(c.createdAt || '') > oneWeekAgo
    ).length;
    
    return { total, moyenne, parNote, recentComments };
  }

  /**
   * Formater le contenu d'un commentaire
   */
  static formatContent(content: string): string {
    // Remplacer les retours à la ligne par des <br>
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **texte** en gras
      .replace(/\*(.*?)\*/g, '<em>$1</em>'); // *texte* en italique
  }

  /**
   * Obtenir l'icône pour la note
   */
  static getRatingIcon(rating: number): string {
    const icons = ['⭐', '⭐', '⭐', '⭐', '⭐'];
    return icons.slice(0, rating).join('');
  }

  /**
   * Obtenir la couleur selon le statut
   */
  static getStatutColor(statut: CommentaireStatut): string {
    const colors: Record<CommentaireStatut, string> = {
      'en_attente': 'orange',
      'approuve': 'green',
      'rejete': 'red',
      'modere': 'gray'
    };
    return colors[statut] || 'gray';
  }

  /**
   * Vérifier si un commentaire peut être modifié
   */
  static canEdit(commentaire: Commentaire, userId: number): boolean {
    // Peut éditer si c'est l'auteur et que le commentaire a moins de 30 minutes
    if (commentaire.idUser !== userId) return false;
    
    const createdAt = new Date(commentaire.createdAt || '');
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    return diffMinutes <= 30;
  }

  /**
   * Vérifier si un commentaire peut être supprimé
   */
  static canDelete(commentaire: Commentaire, userId: number, isAdmin: boolean): boolean {
    // Admin peut toujours supprimer
    if (isAdmin) return true;
    
    // L'auteur peut supprimer s'il n'y a pas de réponses
    if (commentaire.idUser === userId) {
      return !commentaire.reponses || commentaire.reponses.length === 0;
    }
    
    return false;
  }

  /**
   * Valider le contenu d'un commentaire
   */
  static validateContent(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Le commentaire ne peut pas être vide' };
    }
    
    if (content.length < 3) {
      return { valid: false, error: 'Le commentaire doit contenir au moins 3 caractères' };
    }
    
    if (content.length > 1000) {
      return { valid: false, error: 'Le commentaire ne peut pas dépasser 1000 caractères' };
    }
    
    // Vérifier les mots interdits (à personnaliser)
    const forbiddenWords = ['spam', 'pub', 'promo'];
    const contentLower = content.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (contentLower.includes(word)) {
        return { valid: false, error: 'Le commentaire contient des mots interdits' };
      }
    }
    
    return { valid: true };
  }
}

export default CommentaireService;