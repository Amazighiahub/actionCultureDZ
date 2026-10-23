// services/patrimoine.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';
import { prepareFilesForUpload } from '@/utils/prepareImageForUpload';

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
  lieuId?: number;
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

/** Aperçu d'un relevé Excel (backend services/patrimoine/importReleve.js, resumerPlan) */
interface ApercuReleve {
  lieu: { id: number | null; nom: string; existe: boolean; commune?: string } | null;
  erreurs: string[];
  bilan: { creer: number; maj: number; inchanges: number; ignorees: number };
  points: Array<{
    id: number;
    action: 'creer' | 'maj' | 'inchange';
    nom: string;
    nomAr: string | null;
    type: string;
    statut: 'publie' | 'brouillon';
    interieur: boolean;
    repere: string | null;
    latitude: number | null;
    longitude: number | null;
    champs: string[];
  }>;
  ignorees: Array<{ id: number; nom: string; raison: string }>;
}

interface BilanReleve {
  idLieu: number;
  lieuCree: boolean;
  crees: number;
  maj: number;
  inchanges: number;
  erreurs: Array<{ id: number; nom: string; erreur: string }>;
}

const formulaireReleve = (fichier: File, parentId?: number | null): FormData => {
  const formData = new FormData();
  formData.append('fichier', fichier);
  if (parentId) formData.append('parentId', String(parentId));
  return formData;
};

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

  /** Sites géolocalisés pour la carte (id_lieu, nom, latitude, longitude, typePatrimoine) */
  async getCarte(): Promise<ApiResponse<Array<Pick<SitePatrimoine, 'id_lieu' | 'nom' | 'latitude' | 'longitude'> & { typePatrimoine?: string }>>> {
    return httpClient.get(API_ENDPOINTS.patrimoine.carte);
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
    return httpClient.get<Array<{ value: string; label: string; count: number }>>(API_ENDPOINTS.patrimoine.types);
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
    return httpClient.get<{ total_sites: number; sites_par_type: Record<string, number>; sites_par_wilaya: Array<{ wilaya: string; count: number }>; sites_classes: number; visites_mois: number }>(API_ENDPOINTS.patrimoine.statistiques);
  }

  async getCarteVisite(id: number): Promise<ApiResponse<CarteVisite>> {
    return httpClient.get<CarteVisite>(API_ENDPOINTS.patrimoine.carteVisite(id));
  }

  async getQRCode(id: number): Promise<ApiResponse<Blob>> {
    // format=png pour recevoir un vrai buffer PNG (pas du JSON dataurl)
    return httpClient.download(`${API_ENDPOINTS.patrimoine.qrcode(id)}?format=png`, `qrcode_site_${id}.png`);
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

  async getLieuxStatistiques(): Promise<ApiResponse<{ total: number; par_wilaya: Array<{ wilaya: string; count: number }>; par_type: Record<string, number> }>> {
    return httpClient.get<{ total: number; par_wilaya: Array<{ wilaya: string; count: number }>; par_type: Record<string, number> }>(API_ENDPOINTS.patrimoine.lieuxStatistiques);
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

  /** langue : celle des enregistrements audio envoyés (fr, ar, en, tz-ltn, tz-tfng) */
  async uploadMedias(siteId: number, files: File[], langue?: string): Promise<ApiResponse<MediaSite[]>> {
    const formData = new FormData();
    if (langue) formData.append('langue', langue);
    (await prepareFilesForUpload(files)).forEach(file => formData.append('medias', file));
    return httpClient.upload<MediaSite[]>(
      API_ENDPOINTS.patrimoine.uploadMedias(siteId),
      formData
    );
  }

  /** Nouvel ordre de visite des points d'un site (tous les points, dans l'ordre) */
  async reordonnerPoints(siteId: number, ordre: number[]): Promise<ApiResponse<Array<{ id_lieu: number; ordre_visite: number }>>> {
    return httpClient.put(API_ENDPOINTS.patrimoine.reordonnerPoints(siteId), { ordre });
  }

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
    return httpClient.get<{ sites: SitePatrimoine[]; parcours_suggeres: Parcours[] }>(API_ENDPOINTS.patrimoine.nearbyMobile, {
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
  /**
   * Relevé Excel de points de visite (modèle Taladz) — aperçu sans écriture.
   * parentId : lieu choisi ; sinon celui de la feuille « Site » (retrouvé ou créé).
   */
  async apercuReleve(fichier: File, parentId?: number | null): Promise<ApiResponse<ApercuReleve>> {
    return httpClient.upload<ApercuReleve>(API_ENDPOINTS.patrimoine.importReleveApercu, formulaireReleve(fichier, parentId));
  }

  async importerReleve(fichier: File, parentId?: number | null): Promise<ApiResponse<BilanReleve>> {
    return httpClient.upload<BilanReleve>(API_ENDPOINTS.patrimoine.importReleve, formulaireReleve(fichier, parentId));
  }

  async exportSites(format: 'excel' | 'csv' | 'json' = 'excel'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `/patrimoine/export?format=${format}`,
      `sites_patrimoine.${format}`
    );
  }
  /** Sites et points de visite créés par le compte connecté, tous statuts (tableau de bord pro) */
  async getMySites(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<SitePatrimoine>>> {
    return httpClient.get<PaginatedResponse<SitePatrimoine>>('/patrimoine/mes-sites', params);
  }
}

export const patrimoineService = new PatrimoineService();
export type { 
  SitePatrimoine, CreateSiteData, UpdateSiteData, HoraireSite, 
  TarifSite, MediaSite, Parcours, CreateParcoursData, CarteVisite, 
  SearchPatrimoineParams, OfflineData, ApercuReleve, BilanReleve
};