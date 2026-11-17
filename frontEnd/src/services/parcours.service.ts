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

/**
 * Parcours personnalisé tel que le serveur le renvoie (services/parcours/parcoursService.js, 2026-11-17 :
 * l'ancien type « ParcoursIntelligent » ne correspondait pas à la réponse).
 */
interface ParcoursEtape {
  id: number;
  nom: string;
  type: string;
  latitude?: number;
  longitude?: number;
  distance: number;
  duree: number;
  description?: string;
  image?: string;
  horaires?: string;
  note?: number;
}

interface ServiceProche { id: number; nom: string; latitude?: number; longitude?: number; distance: number; telephone?: string; tarif_min?: number; tarif_max?: number }

interface ParcoursGenere {
  etapes: ParcoursEtape[];
  distanceTotale: number;
  dureeEstimee: number;
  pointsInteret: number;
  services?: {
    restaurants?: ServiceProche[];
    hotels?: ServiceProche[];
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
  async generatePersonnalise(params: GenerateParcoursParams): Promise<ApiResponse<ParcoursGenere>> {
    return httpClient.post<ParcoursGenere>(`${this.baseUrl}/personnalise`, params);
  }
}

export const parcoursIntelligentService = new ParcoursIntelligentService();
export type {
  ParcoursGenere,
  ParcoursEtape,
  CreateParcoursData,
  GenerateParcoursParams,
  ParcoursStats,
  Etape
};
