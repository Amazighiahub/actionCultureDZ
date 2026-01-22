// services/patrimoine.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';

interface SitePatrimoine {
  id: number;
  id_lieu?: number; // Backend peut retourner id_lieu au lieu de id
  nom: string;
  nom_ar?: string;
  description: string;
  type: 'monument' | 'vestige' | 'musee' | 'site_naturel' | 'autre';
  epoque?: string;
  wilaya_id: number;
  commune_id?: number;
  adresse?: string;
  latitude: number;
  longitude: number;
  statut: 'ouvert' | 'ferme' | 'restauration' | 'abandonne';
  classement?: 'mondial' | 'national' | 'regional' | 'local';
  date_classement?: string;
  horaires?: HoraireSite[];
  tarifs?: TarifSite[];
  medias?: MediaSite[];
  note_moyenne?: number;
  nombre_avis?: number;
  visite_virtuelle_url?: string;
  created_at: string;
  updated_at: string;
}

interface CreateSiteData {
  nom: string;
  nom_ar?: string;
  description: string;
  type: string;
  epoque?: string;
  wilaya_id: number;
  commune_id?: number;
  adresse?: string;
  latitude: number;
  longitude: number;
  statut?: string;
  classement?: string;
  date_classement?: string;
  visite_virtuelle_url?: string;
}

type UpdateSiteData = Partial<CreateSiteData>;

interface HoraireSite {
  jour: number;
  ouverture: string;
  fermeture: string;
  ferme: boolean;
}

interface TarifSite {
  categorie: string;
  prix: number;
  description?: string;
}

interface MediaSite {
  id: number;
  url: string;
  type: string;
  titre?: string;
  description?: string;
  ordre: number;
  is_principale: boolean;
}

interface Parcours {
  id: number;
  nom: string;
  description: string;
  duree_estimee: number;
  distance_km: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  sites: Array<{
    site_id: number;
    ordre: number;
    duree_visite: number;
  }>;
  created_at: string;
}

interface CreateParcoursData {
  nom: string;
  description: string;
  wilaya_id: number;
  sites: Array<{
    site_id: number;
    ordre: number;
    duree_visite: number;
  }>;
  type_transport?: 'voiture' | 'marche' | 'velo' | 'mixte';
}

interface CarteVisite {
  site: SitePatrimoine;
  qr_code: string;
  url_partage: string;
}

interface SearchPatrimoineParams extends FilterParams {
  q?: string;
  type?: string;
  typePatrimoine?: string; // ⚡ Type de patrimoine (ville_village, monument, musee, etc.)
  wilaya_id?: number;
  commune_id?: number;
  epoque?: string;
  classement?: string;
  statut?: string;
  latitude?: number;
  longitude?: number;
  rayon_km?: number;
}

interface OfflineData {
  sites: SitePatrimoine[];
  parcours: Parcours[];
  last_update: string;
  version: string;
}

class PatrimoineService extends BaseService<SitePatrimoine, CreateSiteData, UpdateSiteData> {
  constructor() {
    super(API_ENDPOINTS.patrimoine.sites);
  }

  // Sites
  async getSitesPopulaires(limit?: number, typePatrimoine?: string): Promise<ApiResponse<SitePatrimoine[]>> {
    return httpClient.get<SitePatrimoine[]>(API_ENDPOINTS.patrimoine.sitesPopulaires, {
      limit: limit || 10,
      ...(typePatrimoine && { typePatrimoine })
    });
  }

  async getSiteDetail(id: number): Promise<ApiResponse<SitePatrimoine>> {
    return httpClient.get<SitePatrimoine>(API_ENDPOINTS.patrimoine.siteDetail(id));
  }

  // ⚡ Obtenir les types de patrimoine avec comptages
  async getTypesPatrimoine(): Promise<ApiResponse<Array<{
    value: string;
    label: string;
    count: number;
  }>>> {
    return httpClient.get<any>(API_ENDPOINTS.patrimoine.types);
  }

  async recherche(params: SearchPatrimoineParams): Promise<ApiResponse<PaginatedResponse<SitePatrimoine>>> {
    return httpClient.getPaginated<SitePatrimoine>(API_ENDPOINTS.patrimoine.recherche, params);
  }

  async getMonuments(type: string): Promise<ApiResponse<SitePatrimoine[]>> {
    return httpClient.get<SitePatrimoine[]>(API_ENDPOINTS.patrimoine.monuments(type));
  }

  async getVestiges(type: string): Promise<ApiResponse<SitePatrimoine[]>> {
    return httpClient.get<SitePatrimoine[]>(API_ENDPOINTS.patrimoine.vestiges(type));
  }

  async getGalerie(id: number): Promise<ApiResponse<MediaSite[]>> {
    return httpClient.get<MediaSite[]>(API_ENDPOINTS.patrimoine.galerie(id));
  }

  async getStatistiques(): Promise<ApiResponse<{
    total_sites: number;
    sites_par_type: Record<string, number>;
    sites_par_wilaya: Array<{ wilaya: string; count: number }>;
    sites_classes: number;
    visites_mois: number;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.patrimoine.statistiques);
  }

  async getCarteVisite(id: number): Promise<ApiResponse<CarteVisite>> {
    return httpClient.get<CarteVisite>(API_ENDPOINTS.patrimoine.carteVisite(id));
  }

  async getQRCode(id: number): Promise<ApiResponse<Blob>> {
    return httpClient.download(API_ENDPOINTS.patrimoine.qrcode(id), `qrcode_site_${id}.png`);
  }

  // Parcours
  async getParcours(wilayaId?: number): Promise<ApiResponse<Parcours[]>> {
    return httpClient.get<Parcours[]>(API_ENDPOINTS.patrimoine.parcours, 
      wilayaId ? { wilaya_id: wilayaId } : undefined
    );
  }

  async getParcoursEvenement(evenementId: number): Promise<ApiResponse<Parcours[]>> {
    return httpClient.get<Parcours[]>(API_ENDPOINTS.patrimoine.parcoursEvenement(evenementId));
  }

  async createParcoursPersonnalise(data: CreateParcoursData): Promise<ApiResponse<Parcours>> {
    return httpClient.post<Parcours>(API_ENDPOINTS.patrimoine.parcoursPersonnalise, data);
  }

  async getParcoursPopulaires(wilayaId: number): Promise<ApiResponse<Parcours[]>> {
    return httpClient.get<Parcours[]>(API_ENDPOINTS.patrimoine.parcoursPopulaires(wilayaId));
  }

  // Lieux
  async getLieuxProximite(latitude: number, longitude: number, rayon: number = 10): Promise<ApiResponse<SitePatrimoine[]>> {
    return httpClient.get<SitePatrimoine[]>(API_ENDPOINTS.patrimoine.lieuxProximite, {
      latitude, 
      longitude, 
      rayon_km: rayon
    });
  }

  async getLieuxStatistiques(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.patrimoine.lieuxStatistiques);
  }

  // Gestion (auth)
  async noterSite(id: number, note: number, commentaire?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.patrimoine.noterSite(id), { note, commentaire });
  }

  async ajouterFavoris(id: number): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.patrimoine.ajouterFavoris(id));
  }

  async retirerFavoris(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.patrimoine.retirerFavoris(id));
  }

  /*async uploadMedias(siteId: number, files: File[]): Promise<ApiResponse<MediaSite[]>> {
    return httpClient.uploadMultipleFiles<MediaSite[]>(
      API_ENDPOINTS.patrimoine.uploadMedias(siteId),
      files,
      { fieldName: 'medias' }
    );
  }*/

  async deleteMedia(siteId: number, mediaId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.patrimoine.deleteMedia(siteId, mediaId));
  }

  async updateHoraires(siteId: number, horaires: HoraireSite[]): Promise<ApiResponse<void>> {
    return httpClient.put<void>(API_ENDPOINTS.patrimoine.updateHoraires(siteId), { horaires });
  }

  // Mobile
  async getNearbyMobile(latitude: number, longitude: number): Promise<ApiResponse<{
    sites: SitePatrimoine[];
    parcours_suggeres: Parcours[];
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.patrimoine.nearbyMobile, {
      latitude, 
      longitude
    });
  }

  async scanQR(code: string): Promise<ApiResponse<SitePatrimoine>> {
    return httpClient.post<SitePatrimoine>(API_ENDPOINTS.patrimoine.qrScan, { code });
  }

  async getOfflineData(wilayaId: number): Promise<ApiResponse<OfflineData>> {
    return httpClient.get<OfflineData>(API_ENDPOINTS.patrimoine.offlineData(wilayaId));
  }

  // Administration
 /* async importSites(file: File): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ line: number; error: string }>;
  }>> {
    return httpClient.upload<any>(API_ENDPOINTS.patrimoine.import, file, {
      fieldName: 'file'
    });
  }*/

  async exportSites(format: 'excel' | 'csv' | 'json' = 'excel'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.patrimoine.export}?format=${format}`,
      `sites_patrimoine.${format}`
    );
  }
  async getMySites(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<SitePatrimoine>>> {
  return this.getAll({
    ...params,
    user_id: 'current'
  });
}
}

export const patrimoineService = new PatrimoineService();
export type { 
  SitePatrimoine, CreateSiteData, UpdateSiteData, HoraireSite, 
  TarifSite, MediaSite, Parcours, CreateParcoursData, CarteVisite, 
  SearchPatrimoineParams, OfflineData 
};