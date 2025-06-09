// services/evenement.service.ts - Service de gestion des événements corrigé

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { 
  Evenement, 
  EvenementStatut,
  EvenementUser,
  Programme,
  ParticipationStatut
} from '../types/Evenement.types';
import { Media } from '../types/Media.types';
import { Oeuvre } from '../types/Oeuvre.types';
import { User } from '../types/User.types';

export interface EvenementFilters {
  typeEvenement?: number;
  statut?: EvenementStatut;
  dateDebutMin?: string;
  dateDebutMax?: string;
  dateFinMin?: string;
  dateFinMax?: string;
  lieu?: number;
  wilaya?: number;
  organisateur?: number;
  tarifMax?: number;
  capaciteMin?: number;
  inscriptionRequise?: boolean;
  certificatDelivre?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface EvenementStats {
  total: number;
  actifs: number;
  aVenir: number;
  termines: number;
  capaciteTotale: number;
  participantsTotal: number;
  tauxRemplissageMoyen: number;
  parType: Record<number, number>;
  parWilaya: Record<number, number>;
}

export interface ShareData {
  title: string;
  description: string;
  url: string;
  image?: string;
  hashtags: string[];
}

export interface NotificationData {
  titre: string;
  message: string;
  type: 'info' | 'rappel' | 'modification' | 'annulation';
  destinataires?: 'tous' | 'inscrits' | 'professionnels';
}

export interface SearchParams {
  q?: string;
  type?: string;
  limit?: number;
  page?: number;
}

export class EvenementService {
  /**
   * Récupérer la liste des événements
   */
  static async getAll(filters?: EvenementFilters): Promise<PaginatedResponse<Evenement>> {
    return apiService.getPaginated<Evenement>(API_ENDPOINTS.evenements.list, filters);
  }

  /**
   * Récupérer un événement par son ID
   */
  static async getById(id: number): Promise<ApiResponse<Evenement>> {
    return apiService.get<Evenement>(API_ENDPOINTS.evenements.detail(id));
  }

  /**
   * Créer un nouvel événement
   */
  static async create(data: Partial<Evenement>): Promise<ApiResponse<Evenement>> {
    return apiService.post<Evenement>(API_ENDPOINTS.evenements.create, data);
  }

  /**
   * Mettre à jour un événement
   */
  static async update(id: number, data: Partial<Evenement>): Promise<ApiResponse<Evenement>> {
    return apiService.put<Evenement>(API_ENDPOINTS.evenements.update(id), data);
  }

  /**
   * Annuler un événement
   */
  static async cancel(id: number, reason: string): Promise<ApiResponse<Evenement>> {
    return apiService.patch<Evenement>(
      API_ENDPOINTS.evenements.cancel(id), 
      { reason }
    );
  }

  /**
   * Rechercher des événements
   */
  static async search(params: SearchParams): Promise<ApiResponse<Evenement[]>> {
    try {
      const query = params.q?.toLowerCase() || '';
      if (!query.trim()) {
        return { success: true, data: [] };
      }

      // Stratégie 1: Essayer avec un paramètre de recherche
      try {
        const response = await this.getAll({
          page: 1,
          limit: params.limit || 20,
          ...params
        });
        
        if (response.success && response.data) {
          return {
            success: true,
            data: response.data.slice(0, params.limit || 10)
          };
        }
      } catch (searchError) {
        console.log('Recherche directe non supportée, tentative alternative...');
      }

      // Stratégie 2: Récupérer tous les événements récents et filtrer côté client
      const response = await this.getAll({
        page: 1,
        limit: 50,
        sort: 'dateDebut',
        order: 'desc'
      });

      if (response.success && response.data) {
        // Filtrer côté client
        const filteredEvents = response.data.filter(evenement => {
          const searchFields = [
            evenement.nomEvenement,
            evenement.description,
            evenement.lieu?.nom,
            typeof evenement.organisateur === 'object' 
              ? `${evenement.organisateur?.nom} ${evenement.organisateur?.prenom}`
              : evenement.organisateur,
            evenement.typeEvenement?.nomType,
            evenement.statut
          ].filter(Boolean) as string[];

          return searchFields.some(field => 
            field && typeof field === 'string' && field.toLowerCase().includes(query)
          );
        });

        return {
          success: true,
          data: filteredEvents.slice(0, params.limit || 10)
        };
      }

      return { success: false, data: [], error: 'Aucun résultat trouvé' };
      
    } catch (error) {
      console.error('Erreur lors de la recherche d\'événements:', error);
      return {
        success: false,
        data: [],
        error: 'Erreur lors de la recherche'
      };
    }
  }

  /**
   * Récupérer les événements à venir
   */
  static async getUpcoming(filters?: EvenementFilters): Promise<PaginatedResponse<Evenement>> {
    return apiService.getPaginated<Evenement>(API_ENDPOINTS.evenements.upcoming, filters);
  }

  /**
   * Récupérer les statistiques
   */
  static async getStatistics(): Promise<ApiResponse<EvenementStats>> {
    return apiService.get<EvenementStats>(API_ENDPOINTS.evenements.statistics);
  }

  /**
   * Récupérer les données de partage
   */
  static async getShareData(id: number): Promise<ApiResponse<ShareData>> {
    return apiService.get<ShareData>(API_ENDPOINTS.evenements.shareData(id));
  }

  /**
   * GESTION DES INSCRIPTIONS
   */

  /**
   * S'inscrire à un événement
   */
  static async inscription(
    id: number, 
    data?: { message?: string; besoinsSpecifiques?: string }
  ): Promise<ApiResponse<EvenementUser>> {
    return apiService.post<EvenementUser>(
      API_ENDPOINTS.evenements.inscription(id), 
      data
    );
  }

  /**
   * Se désinscrire d'un événement
   */
  static async desinscription(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.evenements.desinscription(id));
  }

  /**
   * Récupérer la liste des participants
   */
  static async getParticipants(
    id: number, 
    filters?: { statut?: ParticipationStatut; type?: string }
  ): Promise<ApiResponse<EvenementUser[]>> {
    return apiService.get<EvenementUser[]>(
      API_ENDPOINTS.evenements.participants(id), 
      filters
    );
  }

  /**
   * Valider la participation d'un utilisateur
   */
  static async validateParticipation(
    eventId: number,
    userId: number,
    data: {
      validated: boolean;
      reason?: string;
      notifyUser?: boolean;
    }
  ): Promise<ApiResponse<EvenementUser>> {
    return apiService.patch<EvenementUser>(
      API_ENDPOINTS.evenements.validateParticipation(eventId, userId),
      data
    );
  }

  /**
   * Récupérer les professionnels en attente
   */
  static async getProfessionnelsEnAttente(id: number): Promise<ApiResponse<User[]>> {
    return apiService.get<User[]>(
      API_ENDPOINTS.evenements.professionnelsEnAttente(id)
    );
  }

  /**
   * GESTION DES MÉDIAS
   */

  /**
   * Récupérer les médias d'un événement
   */
  static async getMedias(id: number): Promise<ApiResponse<Media[]>> {
    return apiService.get<Media[]>(API_ENDPOINTS.evenements.medias(id));
  }

  /**
   * Ajouter des médias
   */
  static async addMedias(id: number, files: File[]): Promise<ApiResponse<Media[]>> {
    const results: Media[] = [];
    
    for (const file of files) {
      try {
        const response = await apiService.upload<Media>(
          API_ENDPOINTS.evenements.addMedias(id),
          file
        );
        if (response.success && response.data) {
          results.push(response.data);
        }
      } catch (error) {
        console.error('Erreur upload média:', error);
      }
    }
    
    return { success: true, data: results };
  }

  /**
   * Mettre à jour un média
   */
  static async updateMedia(
    eventId: number, 
    mediaId: number, 
    data: Partial<Media>
  ): Promise<ApiResponse<Media>> {
    return apiService.put<Media>(
      API_ENDPOINTS.evenements.updateMedia(eventId, mediaId), 
      data
    );
  }

  /**
   * Supprimer un média
   */
  static async deleteMedia(eventId: number, mediaId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.evenements.deleteMedia(eventId, mediaId)
    );
  }

  /**
   * GESTION DES ŒUVRES
   */

  /**
   * Récupérer mes œuvres pour un événement
   */
  static async getMesOeuvres(id: number): Promise<ApiResponse<Oeuvre[]>> {
    return apiService.get<Oeuvre[]>(API_ENDPOINTS.evenements.mesOeuvres(id));
  }

  /**
   * Ajouter une œuvre à un événement
   */
  static async addOeuvre(
    eventId: number, 
    oeuvreId: number, 
    data?: { description?: string; ordre?: number }
  ): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_ENDPOINTS.evenements.addOeuvre(eventId), 
      { oeuvreId, ...data }
    );
  }

  /**
   * Retirer une œuvre d'un événement
   */
  static async removeOeuvre(eventId: number, oeuvreId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.evenements.removeOeuvre(eventId, oeuvreId)
    );
  }

  /**
   * NOTIFICATIONS
   */

  /**
   * Envoyer une notification aux participants
   */
  static async sendNotification(id: number, data: NotificationData): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_ENDPOINTS.evenements.sendNotification(id), 
      data
    );
  }

  /**
   * EXPORT
   */

  /**
   * Exporter les données de l'événement
   */
  static async export(id: number, format: 'excel' | 'pdf' = 'excel'): Promise<void> {
    return apiService.download(
      `${API_ENDPOINTS.evenements.export(id)}?format=${format}`,
      `evenement-${id}.${format === 'excel' ? 'xlsx' : 'pdf'}`
    );
  }

  /**
   * HELPERS
   */

  /**
   * Vérifier si un événement est actif
   */
  static isActive(evenement: Evenement): boolean {
    const now = new Date();
    const debut = new Date(evenement.dateDebut || '');
    const fin = evenement.dateFin ? new Date(evenement.dateFin) : debut;
    
    return evenement.statut === 'en_cours' || 
           (evenement.statut === 'planifie' && now >= debut && now <= fin);
  }

  /**
   * Vérifier si un événement est à venir
   */
  static isUpcoming(evenement: Evenement): boolean {
    const now = new Date();
    const debut = new Date(evenement.dateDebut || '');
    
    return evenement.statut === 'planifie' && debut > now;
  }

  /**
   * Vérifier si un événement est terminé
   */
  static isFinished(evenement: Evenement): boolean {
    const now = new Date();
    const fin = evenement.dateFin ? new Date(evenement.dateFin) : new Date(evenement.dateDebut || '');
    
    return evenement.statut === 'termine' || fin < now;
  }

  /**
   * Vérifier si l'inscription est possible
   */
  static canRegister(evenement: Evenement): boolean {
    if (!this.isUpcoming(evenement) && !this.isActive(evenement)) return false;
    if (evenement.statut === 'annule') return false;
    
    if (evenement.dateLimiteInscription) {
      const limite = new Date(evenement.dateLimiteInscription);
      if (limite < new Date()) return false;
    }
    
    if (evenement.capaciteMax && evenement.nombreInscrits) {
      if (evenement.nombreInscrits >= evenement.capaciteMax) return false;
    }
    
    return true;
  }

  /**
   * Calculer le taux de remplissage
   */
  static getTauxRemplissage(evenement: Evenement): number {
    if (!evenement.capaciteMax || !evenement.nombreInscrits) return 0;
    return Math.round((evenement.nombreInscrits / evenement.capaciteMax) * 100);
  }

  /**
   * Formater un événement pour l'affichage
   */
  static formatForDisplay(evenement: Evenement): any {
    return {
      ...evenement,
      isActive: this.isActive(evenement),
      isUpcoming: this.isUpcoming(evenement),
      isFinished: this.isFinished(evenement),
      canRegister: this.canRegister(evenement),
      tauxRemplissage: this.getTauxRemplissage(evenement),
      statutLabel: this.getStatutLabel(evenement.statut || 'planifie'),
      statutColor: this.getStatutColor(evenement.statut || 'planifie')
    };
  }

  /**
   * Obtenir le label d'un statut
   */
  static getStatutLabel(statut: EvenementStatut): string {
    const labels: Record<EvenementStatut, string> = {
      planifie: 'Planifié',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé',
      reporte: 'Reporté'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir la couleur d'un statut
   */
  static getStatutColor(statut: EvenementStatut): string {
    const colors: Record<EvenementStatut, string> = {
      planifie: 'blue',
      en_cours: 'green',
      termine: 'gray',
      annule: 'red',
      reporte: 'orange'
    };
    return colors[statut] || 'gray';
  }

  /**
   * Formater la durée d'un événement
   */
  static formatDuration(evenement: Evenement): string {
    if (!evenement.dateDebut) return '';
    
    const debut = new Date(evenement.dateDebut);
    const fin = evenement.dateFin ? new Date(evenement.dateFin) : debut;
    
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Toute la journée';
    if (diffDays === 1) return '1 jour';
    return `${diffDays} jours`;
  }

  /**
   * Créer un résumé de l'événement
   */
  static getSummary(evenement: Evenement): string {
    const parts = [];
    
    if (evenement.dateDebut) {
      parts.push(new Date(evenement.dateDebut).toLocaleDateString('fr-FR'));
    }
    
    if (evenement.lieu?.nom) {
      parts.push(evenement.lieu.nom);
    }
    
    if (evenement.capaciteMax) {
      parts.push(`${evenement.nombreInscrits || 0}/${evenement.capaciteMax} places`);
    }
    
    return parts.join(' • ');
  }
}

export default EvenementService;