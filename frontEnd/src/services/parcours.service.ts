// services/parcours.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse } from '@/config/api';
import { httpClient } from './httpClient';

interface MultiLangText {
  fr?: string;
  ar?: string;
  en?: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
}

interface Etape {
  id_lieu: number;
  nom: MultiLangText | string;
  description?: MultiLangText | string;
  latitude: number;
  longitude: number;
  distance?: number;
  tempsVisite?: number;
  tempsTrajet?: number;
  ordre: number;
  qrCode?: string;
  image?: string;
  type?: string;
}

interface ParcoursIntelligent {
  id_parcours?: number;
  nom_parcours: MultiLangText;
  description: MultiLangText;
  duree_estimee: number; // en minutes
  distance_km: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  theme?: string;
  point_depart?: string;
  point_arrivee?: string;
  etapes: Etape[];
  qrCodeParcours?: string;
  services?: {
    restaurants?: any[];
    hotels?: any[];
  };
  statistiques?: {
    vues?: number;
    utilisations?: number;
    notesMoyenne?: string;
  };
}

interface CreateParcoursData {
  nom_parcours: MultiLangText;
  description: MultiLangText;
  id_lieu_parent: number; // Le lieu (ville/village) parent
  theme?: string;
  difficulte?: 'facile' | 'moyen' | 'difficile';
  etapes: Array<{
    id_lieu: number;
    ordre: number;
    duree_visite?: number;
    description?: MultiLangText;
  }>;
}

interface GenerateParcoursParams {
  evenementId?: number;
  latitude?: number;
  longitude?: number;
  rayon?: number;
  maxSites?: number;
  dureeMaxParcours?: number;
  types?: string[];
  includeRestaurants?: boolean;
  includeHotels?: boolean;
  interests?: string[];
  transport?: 'marche' | 'velo' | 'voiture';
  accessibility?: boolean;
  familyFriendly?: boolean;
}

interface ParcoursStats {
  distanceTotale: number;
  dureeEstimee: number;
  nombreEtapes: number;
  typesInclus: string[];
}

class ParcoursIntelligentService {
  private baseUrl = '/api/parcours-intelligent';

  // Générer un parcours autour d'un événement
  async generateForEvenement(evenementId: number, params?: Partial<GenerateParcoursParams>): Promise<ApiResponse<{
    evenement: any;
    parcours: ParcoursIntelligent;
    statistiques: ParcoursStats;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.rayon) queryParams.append('rayon', params.rayon.toString());
    if (params?.maxSites) queryParams.append('maxSites', params.maxSites.toString());
    if (params?.dureeMaxParcours) queryParams.append('dureeMaxParcours', params.dureeMaxParcours.toString());
    if (params?.includeRestaurants !== undefined) queryParams.append('includeRestaurants', params.includeRestaurants.toString());
    if (params?.includeHotels !== undefined) queryParams.append('includeHotels', params.includeHotels.toString());
    if (params?.types?.length) queryParams.append('types', params.types.join(','));

    return httpClient.get<any>(`${this.baseUrl}/evenement/${evenementId}?${queryParams.toString()}`);
  }

  // Générer un parcours personnalisé
  async generatePersonnalise(params: GenerateParcoursParams): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.post<ParcoursIntelligent>(`${this.baseUrl}/personnalise`, params);
  }

  // Récupérer les parcours populaires d'une wilaya
  async getPopulaires(wilayaId: number, limit: number = 5): Promise<ApiResponse<ParcoursIntelligent[]>> {
    return httpClient.get<ParcoursIntelligent[]>(`${this.baseUrl}/wilaya/${wilayaId}/populaires`, { limit });
  }

  // Récupérer un parcours par ID
  async getById(id: number): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.get<ParcoursIntelligent>(`/api/parcours/${id}`);
  }

  // Créer un parcours manuel pour un lieu
  async createParcours(data: CreateParcoursData): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.post<ParcoursIntelligent>('/api/parcours', data);
  }

  // Mettre à jour un parcours
  async updateParcours(id: number, data: Partial<CreateParcoursData>): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.put<ParcoursIntelligent>(`/api/parcours/${id}`, data);
  }

  // Supprimer un parcours
  async deleteParcours(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/api/parcours/${id}`);
  }

  // Récupérer les parcours d'un lieu
  async getParcoursByLieu(lieuId: number): Promise<ApiResponse<ParcoursIntelligent[]>> {
    return httpClient.get<ParcoursIntelligent[]>(`/api/lieux/${lieuId}/parcours`);
  }

  // Générer automatiquement un parcours optimal pour un lieu
  async generateOptimalParcours(lieuId: number, options?: {
    maxEtapes?: number;
    dureeMax?: number;
    theme?: string;
    difficulte?: 'facile' | 'moyen' | 'difficile';
  }): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.post<ParcoursIntelligent>(`/api/lieux/${lieuId}/parcours/generate`, options || {});
  }

  // Ajouter une étape à un parcours existant
  async addEtape(parcoursId: number, etape: {
    id_lieu: number;
    ordre: number;
    duree_visite?: number;
    description?: MultiLangText;
  }): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.post<ParcoursIntelligent>(`/api/parcours/${parcoursId}/etapes`, etape);
  }

  // Supprimer une étape d'un parcours
  async removeEtape(parcoursId: number, etapeId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/api/parcours/${parcoursId}/etapes/${etapeId}`);
  }

  // Réordonner les étapes d'un parcours
  async reorderEtapes(parcoursId: number, etapesOrder: Array<{ id: number; ordre: number }>): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.put<ParcoursIntelligent>(`/api/parcours/${parcoursId}/etapes/reorder`, { etapes: etapesOrder });
  }

  // Calculer la distance et durée estimée d'un parcours
  async calculateStats(etapes: Array<{ latitude: number; longitude: number; tempsVisite?: number }>): Promise<{
    distanceKm: number;
    dureeMinutes: number;
  }> {
    let totalDistance = 0;
    let totalDuree = 0;

    for (let i = 0; i < etapes.length - 1; i++) {
      const distance = this.calculateDistance(
        etapes[i].latitude,
        etapes[i].longitude,
        etapes[i + 1].latitude,
        etapes[i + 1].longitude
      );
      totalDistance += distance;
      // Temps de trajet (50 km/h en moyenne) + temps de visite
      totalDuree += (distance / 50) * 60 + (etapes[i].tempsVisite || 30);
    }

    // Ajouter le temps de visite de la dernière étape
    if (etapes.length > 0) {
      totalDuree += etapes[etapes.length - 1].tempsVisite || 30;
    }

    return {
      distanceKm: Math.round(totalDistance * 100) / 100,
      dureeMinutes: Math.round(totalDuree)
    };
  }

  // Calculer la distance entre deux points (formule de Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const parcoursIntelligentService = new ParcoursIntelligentService();
export type {
  ParcoursIntelligent,
  CreateParcoursData,
  GenerateParcoursParams,
  ParcoursStats,
  Etape,
  MultiLangText
};
