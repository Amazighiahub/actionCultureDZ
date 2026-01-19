// services/evenement-oeuvre.service.ts - Gestion des œuvres dans les événements
import { httpClient } from './httpClient';
import { API_ENDPOINTS, ApiResponse } from '@/config/api';
import type { Oeuvre } from '@/types/models/oeuvre.types';

// Interface pour une association événement-œuvre
export interface EvenementOeuvre {
  id_EventOeuvre: number;
  id_evenement: number;
  id_oeuvre: number;
  id_presentateur?: number;
  ordre_presentation: number;
  duree_presentation?: number;
  description_presentation?: string;
  Oeuvre?: Oeuvre;
  Presentateur?: {
    id_user: number;
    nom: string;
    prenom: string;
  };
}

// Données pour ajouter une œuvre
export interface AddOeuvreData {
  id_oeuvre: number;
  description_presentation?: string;
  duree_presentation?: number;
}

// Données pour mettre à jour une association
export interface UpdateOeuvreData {
  description_presentation?: string;
  duree_presentation?: number;
  ordre_presentation?: number;
}

// Données pour réorganiser
export interface ReorderOeuvreData {
  id_oeuvre: number;
  ordre: number;
}

// Réponse de mes-oeuvres
export interface MesOeuvresResponse {
  oeuvres_ajoutees: EvenementOeuvre[];
  oeuvres_disponibles: Oeuvre[];
}

class EvenementOeuvreService {
  /**
   * Récupérer les œuvres de l'utilisateur (ajoutées et disponibles) pour un événement
   */
  async getMesOeuvres(evenementId: number): Promise<ApiResponse<MesOeuvresResponse>> {
    return httpClient.get<MesOeuvresResponse>(
      API_ENDPOINTS.evenements.mesOeuvres(evenementId)
    );
  }

  /**
   * Ajouter une œuvre à un événement
   */
  async addOeuvre(evenementId: number, data: AddOeuvreData): Promise<ApiResponse<EvenementOeuvre>> {
    return httpClient.post<EvenementOeuvre>(
      API_ENDPOINTS.evenements.addOeuvre(evenementId),
      data
    );
  }

  /**
   * Mettre à jour une association œuvre-événement
   */
  async updateOeuvre(
    evenementId: number,
    oeuvreId: number,
    data: UpdateOeuvreData
  ): Promise<ApiResponse<EvenementOeuvre>> {
    return httpClient.put<EvenementOeuvre>(
      `${API_ENDPOINTS.evenements.addOeuvre(evenementId)}/${oeuvreId}`,
      data
    );
  }

  /**
   * Retirer une œuvre d'un événement
   */
  async removeOeuvre(evenementId: number, oeuvreId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(
      API_ENDPOINTS.evenements.removeOeuvre(evenementId, oeuvreId)
    );
  }

  /**
   * Réorganiser l'ordre des œuvres dans un événement
   */
  async reorderOeuvres(
    evenementId: number,
    oeuvres: ReorderOeuvreData[]
  ): Promise<ApiResponse<void>> {
    return httpClient.put<void>(
      `${API_ENDPOINTS.evenements.addOeuvre(evenementId)}/reorder`,
      { oeuvres }
    );
  }
}

export const evenementOeuvreService = new EvenementOeuvreService();
