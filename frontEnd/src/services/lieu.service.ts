// services/lieu.service.ts - VERSION SIMPLIFIÉE
// Note: Pour les monuments et vestiges, utiliser patrimoine.service.ts
import { httpClient } from './httpClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/config/api';
import { Lieu } from '@/types/models/lieu.types';
import { DetailLieu, Service } from '@/types/models/lieux-details.types';

// Types pour les données multilingues
interface MultiLangString {
  fr?: string;
  ar?: string;
  en?: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
}

interface CreateLieuData {
  typeLieu: string;
  typePatrimoine?: string;
  nom: string | MultiLangString;
  adresse: string | MultiLangString;
  latitude: number;
  longitude: number;
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  description?: string | MultiLangString;
  histoire?: string | MultiLangString;
  details?: {
    description?: string | MultiLangString;
    horaires?: string | MultiLangString;
    histoire?: string | MultiLangString;
    referencesHistoriques?: string | MultiLangString;
  };
}

interface UpdateLieuData extends Partial<CreateLieuData> {}

// Types pour les services d'un lieu
interface CreateServiceData {
  nom: string | MultiLangString;
  description?: string | MultiLangString;
  disponible?: boolean;
}

interface SearchLieuParams extends PaginationParams {
  q?: string;
  typeLieu?: string;
  typeLieuCulturel?: string;
  wilayaId?: number;
  rayon?: number;
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
   * Mettre à jour un lieu
   */
  async update(id: number, data: UpdateLieuData): Promise<ApiResponse<Lieu>> {
    return httpClient.put<Lieu>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Supprimer un lieu
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${this.endpoint}/${id}`);
  }

  /**
   * Obtenir les lieux par wilaya
   */
  async getByWilaya(wilayaId: number): Promise<ApiResponse<Lieu[]>> {
    return httpClient.get<Lieu[]>(`${this.endpoint}/wilaya/${wilayaId}`);
  }

  /**
   * Obtenir les wilayas
   */
  async getWilayas(): Promise<ApiResponse<any[]>> {
    return httpClient.get<any[]>('/metadata/wilayas');
  }

  /**
   * Obtenir les communes d'une wilaya
   */
  async getCommunesByWilaya(wilayaId: number): Promise<ApiResponse<any[]>> {
    return httpClient.get<any[]>(`/geography/wilayas/${wilayaId}/communes`);
  }

  /**
   * Obtenir les lieux proches d'une position
   */
  async getNearby(latitude: number, longitude: number, rayon: number = 10): Promise<ApiResponse<Lieu[]>> {
    return httpClient.get<Lieu[]>(`${this.endpoint}/nearby`, {
      latitude,
      longitude,
      rayon
    });
  }

  /**
   * Obtenir les détails d'un lieu
   */
  async getDetails(id: number): Promise<ApiResponse<DetailLieu>> {
    return httpClient.get<DetailLieu>(`${this.endpoint}/${id}/details`);
  }

  /**
   * Ajouter des services à un lieu (array de noms)
   */
  async addServices(lieuId: number, services: string[]): Promise<ApiResponse<Service[]>> {
    return httpClient.post<Service[]>(`${this.endpoint}/${lieuId}/services`, { services });
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
   * Helper pour extraire une chaîne d'un champ multilingue
   */
  private getStringValue(value: string | MultiLangString | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.fr || value.ar || value.en || '';
  }

  /**
   * Valider un lieu avant création
   */
  validate(data: CreateLieuData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    const nomValue = this.getStringValue(data.nom);
    if (!nomValue || nomValue.trim().length < 3) {
      errors.push('Le nom du lieu doit contenir au moins 3 caractères');
    }

    const adresseValue = this.getStringValue(data.adresse);
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
   * Vérifier si un lieu existe déjà (pour éviter les doublons)
   */
  async checkDuplicate(nom: string, latitude: number, longitude: number): Promise<ApiResponse<{ exists: boolean; lieu?: Lieu }>> {
    return httpClient.post<{ exists: boolean; lieu?: Lieu }>(`${this.endpoint}/check-duplicate`, {
      nom,
      latitude,
      longitude
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

  /**
   * Ajouter un service à un lieu
   */
  async addService(lieuId: number, data: CreateServiceData): Promise<ApiResponse<Service>> {
    return httpClient.post<Service>(`${this.endpoint}/${lieuId}/services`, data);
  }

  /**
   * Mettre à jour un service
   */
  async updateService(lieuId: number, serviceId: number, data: Partial<CreateServiceData>): Promise<ApiResponse<Service>> {
    return httpClient.put<Service>(`${this.endpoint}/${lieuId}/services/${serviceId}`, data);
  }

  /**
   * Supprimer un service
   */
  async deleteService(lieuId: number, serviceId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`${this.endpoint}/${lieuId}/services/${serviceId}`);
  }

  // ========================================
  // DETAIL LIEU
  // ========================================

  /**
   * Créer ou mettre à jour les détails d'un lieu
   */
  async updateDetails(lieuId: number, data: {
    description?: string | MultiLangString;
    horaires?: string | MultiLangString;
    histoire?: string | MultiLangString;
    referencesHistoriques?: string | MultiLangString;
  }): Promise<ApiResponse<DetailLieu>> {
    return httpClient.put<DetailLieu>(`${this.endpoint}/${lieuId}/details`, data);
  }

  // ========================================
  // STATISTIQUES
  // ========================================

  /**
   * Obtenir les statistiques des lieux
   */
  async getStatistiques(): Promise<ApiResponse<{
    totalLieux: number;
    lieuxParType: Array<{ typeLieu: string; count: number }>;
    lieuxAvecDetails: number;
    lieuxAvecServices: number;
  }>> {
    return httpClient.get(`${this.endpoint}/statistiques`);
  }

  // ========================================
  // TRADUCTIONS (Admin)
  // ========================================

  /**
   * Obtenir toutes les traductions d'un lieu
   */
  async getTranslations(lieuId: number): Promise<ApiResponse<{
    nom: MultiLangString;
    adresse: MultiLangString;
    description?: MultiLangString;
    histoire?: MultiLangString;
  }>> {
    return httpClient.get(`${this.endpoint}/${lieuId}/translations`);
  }

  /**
   * Mettre à jour une traduction spécifique
   */
  async updateTranslation(lieuId: number, lang: string, data: {
    nom?: string;
    adresse?: string;
    description?: string;
    histoire?: string;
  }): Promise<ApiResponse<Lieu>> {
    return httpClient.patch<Lieu>(`${this.endpoint}/${lieuId}/translation/${lang}`, data);
  }
}

export const lieuService = new LieuService();
export type {
  CreateLieuData,
  UpdateLieuData,
  SearchLieuParams,
  GeocodingResult,
  CreateServiceData,
  MultiLangString
};
