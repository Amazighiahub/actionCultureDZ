// services/lieu.service.ts
import { httpClient } from './httpClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/config/api';
import { BaseService } from './base.service';
import { Lieu } from '@/types/models/lieu.types';
import { DetailLieu, Service } from '@/types/models/lieux-details.types';

interface CreateLieuData {
  typeLieu: string;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  description?: string;
  horaires?: string;
}

interface UpdateLieuData extends Partial<CreateLieuData> {}

interface SearchLieuParams extends PaginationParams {
  q?: string;
  typeLieu?: string;
  wilayaId?: number;
  rayon?: number; // rayon en km depuis une position
  latitude?: number;
  longitude?: number;
}

interface GeocodingResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingbox: string[];
}

class LieuService extends BaseService<Lieu, CreateLieuData, UpdateLieuData> {
  constructor() {
    super('/lieux');
  }

  /**
   * Rechercher des lieux
   */
  async search(params: SearchLieuParams): Promise<ApiResponse<PaginatedResponse<Lieu>>> {
    return this.getAll(params);
  }

  /**
   * Obtenir les lieux par wilaya
   */
  async getByWilaya(wilayaId: number): Promise<ApiResponse<Lieu[]>> {
    return httpClient.get<Lieu[]>(`/lieux/wilaya/${wilayaId}`);
  }

  /**
   * Obtenir les lieux proches d'une position
   */
  async getNearby(latitude: number, longitude: number, rayon: number = 10): Promise<ApiResponse<Lieu[]>> {
    return httpClient.get<Lieu[]>('/lieux/nearby', {
      latitude,
      longitude,
      rayon
    });
  }

  /**
   * Obtenir les détails d'un lieu
   */
  async getDetails(id: number): Promise<ApiResponse<DetailLieu>> {
    return httpClient.get<DetailLieu>(`/lieux/${id}/details`);
  }

  /**
   * Ajouter des services à un lieu
   */
  async addServices(lieuId: number, services: string[]): Promise<ApiResponse<Service[]>> {
    return httpClient.post<Service[]>(`/lieux/${lieuId}/services`, { services });
  }

  /**
   * Geocoding avec Nominatim (OpenStreetMap)
   */
  async geocodeAddress(address: string, countryCode: string = 'DZ'): Promise<GeocodingResult[]> {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: countryCode
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {
          'Accept-Language': 'fr'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du geocoding');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur geocoding:', error);
      return [];
    }
  }

  /**
   * Reverse geocoding avec Nominatim
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'fr'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);

      if (!response.ok) {
        throw new Error('Erreur lors du reverse geocoding');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Valider un lieu avant création
   */
  async validate(data: CreateLieuData): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!data.nom || data.nom.trim().length < 3) {
      errors.push('Le nom du lieu doit contenir au moins 3 caractères');
    }

    if (!data.adresse || data.adresse.trim().length < 10) {
      errors.push('L\'adresse doit contenir au moins 10 caractères');
    }

    if (!data.latitude || !data.longitude) {
      errors.push('Les coordonnées GPS sont requises');
    }

    if (data.latitude < -90 || data.latitude > 90) {
      errors.push('La latitude doit être comprise entre -90 et 90');
    }

    if (data.longitude < -180 || data.longitude > 180) {
      errors.push('La longitude doit être comprise entre -180 et 180');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Vérifier si un lieu existe déjà (pour éviter les doublons)
   */
  async checkDuplicate(nom: string, latitude: number, longitude: number): Promise<ApiResponse<{ exists: boolean; lieu?: Lieu }>> {
    return httpClient.post<{ exists: boolean; lieu?: Lieu }>('/lieux/check-duplicate', {
      nom,
      latitude,
      longitude
    });
  }
}

export const lieuService = new LieuService();