// services/lieu.service.ts - VERSION SIMPLIFIÉE
// Note: Pour les monuments et vestiges, utiliser patrimoine.service.ts
import { httpClient } from './httpClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/config/api';
import { Lieu } from '@/types/models/lieu.types';
import { Service } from '@/types/models/lieux-details.types';
import { getLocalizedText } from '@/utils/getLocalizedText';
import type { TranslatableValue } from '@/types/common/multilingual.types';

interface CreateLieuData {
  typeLieu: string;
  typePatrimoine?: string;
  nom: string | TranslatableValue;
  adresse: string | TranslatableValue;
  latitude: number;
  longitude: number;
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  /** Commune et wilaya du point sur la carte (OpenStreetMap), pour trouver la commune du lieu */
  communeNom?: string;
  wilayaNom?: string;
  description?: string | TranslatableValue;
  histoire?: string | TranslatableValue;
  details?: {
    description?: string | TranslatableValue;
    horaires?: string | TranslatableValue;
    histoire?: string | TranslatableValue;
    referencesHistoriques?: string | TranslatableValue;
  };
}

interface UpdateLieuData extends Partial<CreateLieuData> {}

// Types pour les services d'un lieu
interface CreateServiceData {
  nom: string | TranslatableValue;
  description?: string | TranslatableValue;
  disponible?: boolean;
}

interface SearchLieuParams extends PaginationParams {
  /** Filtres lus par GET /lieux */
  search?: string;
  wilaya?: number;
  q?: string;
  typeLieu?: string;
  typeLieuCulturel?: string;
  wilayaId?: number;
  rayon?: number;
  latitude?: number;
  longitude?: number;
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingbox?: string[];
}

class LieuService {
  private endpoint = '/lieux';

  /**
   * Rechercher des lieux
   */
  async search(params?: SearchLieuParams): Promise<ApiResponse<PaginatedResponse<Lieu>>> {
    return httpClient.get<PaginatedResponse<Lieu>>(this.endpoint, params);
  }

  /**
   * Obtenir tous les lieux (alias de search)
   */
  async getAll(params?: SearchLieuParams): Promise<ApiResponse<PaginatedResponse<Lieu>>> {
    return this.search(params);
  }

  /**
   * Obtenir un lieu par ID
   */
  async getById(id: number): Promise<ApiResponse<Lieu>> {
    return httpClient.get<Lieu>(`${this.endpoint}/${id}`);
  }

  /**
   * Créer un lieu
   */
  async create(data: CreateLieuData): Promise<ApiResponse<Lieu>> {
    return httpClient.post<Lieu>(this.endpoint, data);
  }

  /**
   * Recherche d'adresse (OpenStreetMap), par le serveur du site : appelé directement par le
   * navigateur, OpenStreetMap refuse maintenant les recherches. Liste vide si rien n'est trouvé ;
   * erreur (avec le message du serveur) si la recherche est indisponible.
   */
  async geocodeAddress(address: string): Promise<GeocodingResult[]> {
    const reponse = await httpClient.get<GeocodingResult[]>(`${this.endpoint}/geocodage/recherche`, { q: address });
    if (!reponse.success) throw reponse;
    return Array.isArray(reponse.data) ? reponse.data : [];
  }

  /**
   * Adresse d'un point de la carte (null si indisponible : le point reste placé)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const reponse = await httpClient.get<GeocodingResult | null>(`${this.endpoint}/geocodage/inverse`, { lat: latitude, lon: longitude });
      return reponse.success ? reponse.data ?? null : null;
    } catch {
      return null;
    }
  }

  /**
   * Valider un lieu avant création
   */
  validate(data: CreateLieuData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    const nomValue = getLocalizedText(data.nom, 'fr');
    if (!nomValue || nomValue.trim().length < 3) {
      errors.push('Le nom du lieu doit contenir au moins 3 caractères');
    }

    const adresseValue = getLocalizedText(data.adresse, 'fr');
    if (!adresseValue || adresseValue.trim().length < 10) {
      errors.push('L\'adresse doit contenir au moins 10 caractères');
    }

    if (!data.latitude || !data.longitude) {
      errors.push('Les coordonnées GPS sont requises');
    }

    if (data.latitude && (data.latitude < -90 || data.latitude > 90)) {
      errors.push('La latitude doit être comprise entre -90 et 90');
    }

    if (data.longitude && (data.longitude < -180 || data.longitude > 180)) {
      errors.push('La longitude doit être comprise entre -180 et 180');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Vérifier si un lieu/patrimoine existe déjà (pour éviter les doublons)
   */
  async checkDuplicate(
    nom: string, 
    latitude: number, 
    longitude: number,
    typePatrimoine?: string
  ): Promise<ApiResponse<{ 
    exists: boolean; 
    lieu?: Lieu; 
    matchType?: 'name' | 'coordinates';
    isPatrimoine?: boolean;
    typePatrimoine?: string;
  }>> {
    return httpClient.post<{ 
      exists: boolean; 
      lieu?: Lieu;
      matchType?: 'name' | 'coordinates';
      isPatrimoine?: boolean;
      typePatrimoine?: string;
    }>(`${this.endpoint}/check-duplicate`, {
      nom,
      latitude,
      longitude,
      typePatrimoine
    });
  }

  // ========================================
  // SERVICES D'UN LIEU
  // ========================================

  /**
   * Obtenir les services d'un lieu
   */
  async getServices(lieuId: number): Promise<ApiResponse<Service[]>> {
    return httpClient.get<Service[]>(`${this.endpoint}/${lieuId}/services`);
  }
}

export const lieuService = new LieuService();
export type {
  CreateLieuData,
  UpdateLieuData,
  SearchLieuParams,
  GeocodingResult,
  CreateServiceData
};
