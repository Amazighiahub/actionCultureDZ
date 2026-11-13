// services/patrimoine.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';
import { prepareFilesForUpload } from '@/utils/prepareImageForUpload';
import type { TexteMultilingue } from '@/types/common/multilingual.types';
import type { TypePatrimoine } from '@/utils/typesPatrimoine';

interface SitePatrimoine {
  id: number;
  id_lieu?: number; // Backend peut retourner id_lieu au lieu de id
  nom: string;
  nom_ar?: string;
  description: string;
  type: TypePatrimoine;
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
  /** Photographe ou source, et droits (photo d'un lieu) */
  credit?: string | null;
  licence?: string | null;
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

  /** Sites de la commune au nom proche (au plus 5), avant de créer un site. Passe par httpClient : adresse
   *  de l'API, langue et jetons comme les autres appels (avant : fetch direct sur /api, audit V11 COD-14) */
  async checkDuplicate(nom: string, communeId: number): Promise<ApiResponse<{
    exists: boolean;
    sites?: Array<{ id_lieu: number; nom: TexteMultilingue; typePatrimoine: TypePatrimoine }>;
  }>> {
    return httpClient.get(API_ENDPOINTS.patrimoine.checkDuplicate, { nom, communeId });
  }

  // ⚡ Obtenir les types de patrimoine avec comptages
  async getTypesPatrimoine(): Promise<ApiResponse<Array<{
    value: string;
    label: string;
    count: number;
  }>>> {
    return httpClient.get<Array<{ value: string; label: string; count: number }>>(API_ENDPOINTS.patrimoine.types);
  }

  /**
   * langue : celle des enregistrements audio envoyés (fr, ar, en, tz-ltn, tz-tfng) ;
   * credit : photographe ou source, et droits, communs aux photos envoyées
   */
  async uploadMedias(siteId: number, files: File[], langue?: string, credit?: { credit?: string; licence?: string }): Promise<ApiResponse<MediaSite[]>> {
    const formData = new FormData();
    if (langue) formData.append('langue', langue);
    if (credit?.credit?.trim()) formData.append('credit', credit.credit.trim());
    if (credit?.licence) formData.append('licence', credit.licence);
    (await prepareFilesForUpload(files)).forEach(file => formData.append('medias', file));
    return httpClient.upload<MediaSite[]>(
      API_ENDPOINTS.patrimoine.uploadMedias(siteId),
      formData
    );
  }

  /**
   * Voix enregistrée depuis le téléphone : variante parlée, nom de la personne (facultatif) et
   * accord de la personne enregistrée (obligatoire, vérifié par le serveur)
   */
  async uploadVoix(siteId: number, fichier: File, voix: { langue: string; parler?: string; nom?: string }): Promise<ApiResponse<MediaSite[]>> {
    const formData = new FormData();
    formData.append('langue', voix.langue);
    if (voix.parler?.trim()) formData.append('parler', voix.parler.trim());
    if (voix.nom?.trim()) formData.append('credit', voix.nom.trim());
    formData.append('accord', 'true');
    formData.append('medias', fichier);
    return httpClient.upload<MediaSite[]>(API_ENDPOINTS.patrimoine.uploadVoix(siteId), formData);
  }

  /** Nouvel ordre de visite des points d'un site (tous les points, dans l'ordre) */
  async reordonnerPoints(siteId: number, ordre: number[]): Promise<ApiResponse<Array<{ id_lieu: number; ordre_visite: number }>>> {
    return httpClient.put(API_ENDPOINTS.patrimoine.reordonnerPoints(siteId), { ordre });
  }

  /** Corriger le photographe ou les droits d'une photo déjà en ligne */
  async updateMediaCredit(siteId: number, mediaId: number, credit: { credit: string; licence: string }): Promise<ApiResponse<{ id: number; credit: string | null; licence: string | null }>> {
    return httpClient.patch(API_ENDPOINTS.patrimoine.deleteMedia(siteId, mediaId), credit);
  }

  async deleteMedia(siteId: number, mediaId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.patrimoine.deleteMedia(siteId, mediaId));
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