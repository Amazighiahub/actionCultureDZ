// services/parcours.service.ts
import { ApiResponse } from '@/config/api';
import { httpClient } from './httpClient';
import type { TranslatableValue } from '@/types/common/multilingual.types';

interface Etape {
  id_lieu: number;
  nom: TranslatableValue | string;
  description?: TranslatableValue | string;
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
  nom_parcours: TranslatableValue;
  description: TranslatableValue;
  duree_estimee: number; // en minutes
  distance_km: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  theme?: string;
  point_depart?: string;
  point_arrivee?: string;
  etapes: Etape[];
  qrCodeParcours?: string;
  services?: {
    restaurants?: Record<string, unknown>[];
    hotels?: Record<string, unknown>[];
  };
  statistiques?: {
    vues?: number;
    utilisations?: number;
    notesMoyenne?: string;
  };
}

interface CreateParcoursData {
  nom_parcours: TranslatableValue;
  description: TranslatableValue;
  id_lieu_parent: number; // Le lieu (ville/village) parent
  theme?: string;
  difficulte?: 'facile' | 'moyen' | 'difficile';
  etapes: Array<{
    id_lieu: number;
    ordre: number;
    duree_visite?: number;
    description?: TranslatableValue;
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
  private baseUrl = '/parcours';

  // Générer un parcours personnalisé
  async generatePersonnalise(params: GenerateParcoursParams): Promise<ApiResponse<ParcoursIntelligent>> {
    return httpClient.post<ParcoursIntelligent>(`${this.baseUrl}/personnalise`, params);
  }
}

export const parcoursIntelligentService = new ParcoursIntelligentService();
export type {
  ParcoursIntelligent,
  CreateParcoursData,
  GenerateParcoursParams,
  ParcoursStats,
  Etape
};
