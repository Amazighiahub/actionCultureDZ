// services/patrimoine.service.ts - Service de gestion du patrimoine culturel corrigé

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { 
  Lieu, 
  DetailLieu, 
  Monument, 
  Vestige,
  LieuMedia 
} from '../types/Geographie.types';
import { Parcours } from '../types/Evenement.types';
import { QRCode, QRScan } from '../types/Tracking.types';
import { Coordinates } from '../types/Utility.types';
import { Media } from '../types/Media.types';

export interface PatrimoineFilters {
  wilaya?: number;
  commune?: number;
  type?: string;
  monuments?: boolean;
  vestiges?: boolean;
  noteMoyenneMin?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProximiteParams {
  latitude: number;
  longitude: number;
  rayon?: number; // en km
  type?: string;
  limit?: number;
}

export interface PatrimoineStats {
  totalSites: number;
  totalMonuments: number;
  totalVestiges: number;
  parWilaya: Record<number, number>;
  parType: Record<string, number>;
  plusVisites: Array<{ lieu: Lieu; visites: number }>;
  mieuxNotes: Array<{ lieu: Lieu; note: number }>;
}

export interface CarteVisite {
  nom: string;
  type: string;
  adresse: string;
  description: string;
  horaires?: string;
  qrCodeUrl: string;
  imageUrl?: string;
}

export interface ParcoursPersonnaliseParams {
  pointDepart: Coordinates;
  interests: string[];
  dureeMax?: number; // en heures
  transportMode?: 'marche' | 'velo' | 'voiture' | 'transport_public';
  includeEvenements?: boolean;
}

export interface UpdateHorairesData {
  horaires: Array<{
    jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
    ouverture?: string; // Format HH:mm
    fermeture?: string; // Format HH:mm
    ferme?: boolean;
  }>;
  horairesSpeciaux?: Array<{
    date: string;
    ouverture?: string;
    fermeture?: string;
    ferme?: boolean;
    raison?: string;
  }>;
  notesHoraires?: string;
}

export class PatrimoineService {
  /**
   * CONSULTATION
   */

  /**
   * Récupérer la liste des sites patrimoniaux
   */
  static async getSites(filters?: PatrimoineFilters): Promise<PaginatedResponse<Lieu>> {
    return apiService.getPaginated<Lieu>(API_ENDPOINTS.patrimoine.sites, filters);
  }

  /**
   * Récupérer les sites populaires
   */
  static async getSitesPopulaires(limit = 10): Promise<ApiResponse<Lieu[]>> {
    return apiService.get<Lieu[]>(
      API_ENDPOINTS.patrimoine.sitesPopulaires, 
      { limit }
    );
  }

  /**
   * Récupérer le détail d'un site
   */
  static async getSiteDetail(id: number): Promise<ApiResponse<DetailLieu>> {
    return apiService.get<DetailLieu>(
      API_ENDPOINTS.patrimoine.siteDetail(id)
    );
  }

  /**
   * Rechercher des sites
   */
  static async recherche(query: string, filters?: PatrimoineFilters): Promise<ApiResponse<Lieu[]>> {
    return apiService.get<Lieu[]>(
      API_ENDPOINTS.patrimoine.recherche, 
      { q: query, ...filters }
    );
  }

  /**
   * Récupérer les monuments par type
   */
  static async getMonuments(type: string): Promise<ApiResponse<Monument[]>> {
    return apiService.get<Monument[]>(
      API_ENDPOINTS.patrimoine.monuments(type)
    );
  }

  /**
   * Récupérer les vestiges par type
   */
  static async getVestiges(type: string): Promise<ApiResponse<Vestige[]>> {
    return apiService.get<Vestige[]>(
      API_ENDPOINTS.patrimoine.vestiges(type)
    );
  }

  /**
   * Récupérer la galerie d'un site
   */
  static async getGalerie(id: number): Promise<ApiResponse<LieuMedia[]>> {
    return apiService.get<LieuMedia[]>(
      API_ENDPOINTS.patrimoine.galerie(id)
    );
  }

  /**
   * Récupérer les statistiques
   */
  static async getStatistiques(): Promise<ApiResponse<PatrimoineStats>> {
    return apiService.get<PatrimoineStats>(
      API_ENDPOINTS.patrimoine.statistiques
    );
  }

  /**
   * QR CODES ET CARTES
   */

  /**
   * Récupérer la carte de visite d'un site
   */
  static async getCarteVisite(id: number): Promise<ApiResponse<CarteVisite>> {
    return apiService.get<CarteVisite>(
      API_ENDPOINTS.patrimoine.carteVisite(id)
    );
  }

  /**
   * Récupérer le QR code d'un site
   */
  static async getQRCode(id: number): Promise<ApiResponse<QRCode>> {
    return apiService.get<QRCode>(
      API_ENDPOINTS.patrimoine.qrcode(id)
    );
  }

  /**
   * PARCOURS
   */

  /**
   * Récupérer tous les parcours
   */
  static async getParcours(filters?: PatrimoineFilters): Promise<PaginatedResponse<Parcours>> {
    return apiService.getPaginated<Parcours>(API_ENDPOINTS.patrimoine.parcours, filters);
  }

  /**
   * Récupérer les parcours pour un événement
   */
  static async getParcoursEvenement(evenementId: number): Promise<ApiResponse<Parcours[]>> {
    return apiService.get<Parcours[]>(
      API_ENDPOINTS.patrimoine.parcoursEvenement(evenementId)
    );
  }

  /**
   * Créer un parcours personnalisé
   */
  static async createParcoursPersonnalise(
    params: ParcoursPersonnaliseParams
  ): Promise<ApiResponse<Parcours>> {
    return apiService.post<Parcours>(
      API_ENDPOINTS.patrimoine.parcoursPersonnalise, 
      params
    );
  }

  /**
   * Récupérer les parcours populaires d'une wilaya
   */
  static async getParcoursPopulaires(wilayaId: number): Promise<ApiResponse<Parcours[]>> {
    return apiService.get<Parcours[]>(
      API_ENDPOINTS.patrimoine.parcoursPopulaires(wilayaId)
    );
  }

  /**
   * LIEUX
   */

  /**
   * Récupérer les lieux à proximité
   */
  static async getLieuxProximite(params: ProximiteParams): Promise<ApiResponse<Lieu[]>> {
    return apiService.get<Lieu[]>(
      API_ENDPOINTS.patrimoine.lieuxProximite, 
      {
        lat: params.latitude,
        lng: params.longitude,
        rayon: params.rayon || 10,
        type: params.type,
        limit: params.limit || 20
      }
    );
  }

  /**
   * Récupérer les statistiques des lieux
   */
  static async getLieuxStatistiques(): Promise<ApiResponse<any>> {
    return apiService.get<any>(
      API_ENDPOINTS.patrimoine.lieuxStatistiques
    );
  }

  /**
   * GESTION (AUTH)
   */

  /**
   * Créer un nouveau site
   */
  static async createSite(data: Partial<Lieu>): Promise<ApiResponse<Lieu>> {
    return apiService.post<Lieu>(
      API_ENDPOINTS.patrimoine.createSite, 
      data
    );
  }

  /**
   * Mettre à jour un site
   */
  static async updateSite(id: number, data: Partial<Lieu>): Promise<ApiResponse<Lieu>> {
    return apiService.put<Lieu>(
      API_ENDPOINTS.patrimoine.updateSite(id), 
      data
    );
  }

  /**
   * Supprimer un site
   */
  static async deleteSite(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.patrimoine.deleteSite(id)
    );
  }

  /**
   * Noter un site
   */
  static async noterSite(id: number, note: number, commentaire?: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_ENDPOINTS.patrimoine.noterSite(id), 
      { note, commentaire }
    );
  }

  /**
   * Ajouter un site aux favoris
   */
  static async ajouterFavoris(id: number): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_ENDPOINTS.patrimoine.ajouterFavoris(id)
    );
  }

  /**
   * Retirer un site des favoris
   */
  static async retirerFavoris(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.patrimoine.retirerFavoris(id)
    );
  }

  /**
   * GESTION DES MÉDIAS
   */

  /**
   * Uploader des médias pour un site
   */
  static async uploadMedias(id: number, files: File[]): Promise<ApiResponse<Media[]>> {
    const results: Media[] = [];
    
    for (const file of files) {
      try {
        const response = await apiService.upload<Media>(
          API_ENDPOINTS.patrimoine.uploadMedias(id),
          file
        );
        if (response.success && response.data) {
          results.push(response.data);
        }
      } catch (error) {
        console.error('Erreur upload média:', error);
      }
    }
    
    return { success: true, data: results };
  }

  /**
   * Supprimer un média d'un site
   */
  static async deleteMedia(siteId: number, mediaId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.patrimoine.deleteMedia(siteId, mediaId)
    );
  }

  /**
   * GESTION DES HORAIRES
   */

  /**
   * Mettre à jour les horaires d'un site
   */
  static async updateHoraires(id: number, data: UpdateHorairesData): Promise<ApiResponse<DetailLieu>> {
    return apiService.put<DetailLieu>(
      API_ENDPOINTS.patrimoine.updateHoraires(id),
      data
    );
  }

  /**
   * MOBILE
   */

  /**
   * Récupérer les sites à proximité (optimisé mobile)
   */
  static async getNearbyMobile(coords: Coordinates, rayon = 5): Promise<ApiResponse<Lieu[]>> {
    return apiService.get<Lieu[]>(
      API_ENDPOINTS.patrimoine.nearbyMobile, 
      {
        lat: coords.latitude,
        lng: coords.longitude,
        rayon
      }
    );
  }

  /**
   * Scanner un QR code
   */
  static async scanQRCode(code: string, location?: Coordinates): Promise<ApiResponse<QRScan>> {
    return apiService.post<QRScan>(
      API_ENDPOINTS.patrimoine.qrScan, 
      { code, location }
    );
  }

  /**
   * Récupérer les données offline d'une wilaya
   */
  static async getOfflineData(wilayaId: number): Promise<ApiResponse<any>> {
    return apiService.get<any>(
      API_ENDPOINTS.patrimoine.offlineData(wilayaId)
    );
  }

  /**
   * ADMIN
   */

  /**
   * Importer des sites en masse
   */
  static async importSites(file: File): Promise<ApiResponse<any>> {
    return apiService.upload<any>(
      API_ENDPOINTS.patrimoine.import, 
      file
    );
  }

  /**
   * Exporter les sites
   */
  static async exportSites(format: 'csv' | 'excel' = 'excel'): Promise<void> {
    return apiService.download(
      `${API_ENDPOINTS.patrimoine.export}?format=${format}`,
      `sites-patrimoine.${format === 'csv' ? 'csv' : 'xlsx'}`
    );
  }

  /**
   * HELPERS
   */

  /**
   * Calculer la distance entre deux points
   */
  static calculateDistance(
    coord1: Coordinates, 
    coord2: Coordinates
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Formater l'adresse complète
   */
  static formatAdresse(lieu: Lieu): string {
    const parts = [lieu.adresse];
    
    if (lieu.commune) parts.push(lieu.commune.nom);
    if (lieu.daira) parts.push(lieu.daira.nom);
    if (lieu.wilaya) parts.push(lieu.wilaya.nom);
    
    return parts.filter(Boolean).join(', ');
  }

  /**
   * Obtenir l'icône selon le type
   */
  static getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'monument': '🏛️',
      'musee': '🏛️',
      'site_historique': '🏰',
      'site_naturel': '🌳',
      'mosquee': '🕌',
      'eglise': '⛪',
      'fort': '🏰',
      'palais': '🏯',
      'ruines': '🗿',
      'autre': '📍'
    };
    return icons[type] || icons.autre;
  }

  /**
   * Grouper les sites par wilaya
   */
  static groupByWilaya(sites: Lieu[]): Record<string, Lieu[]> {
    return sites.reduce((acc, site) => {
      const wilayaName = site.wilaya?.nom || 'Non définie';
      if (!acc[wilayaName]) acc[wilayaName] = [];
      acc[wilayaName].push(site);
      return acc;
    }, {} as Record<string, Lieu[]>);
  }

  /**
   * Vérifier si un site est ouvert maintenant
   */
  static isOpenNow(detailLieu?: DetailLieu): boolean | null {
    if (!detailLieu?.horaires) return null;
    
    const now = new Date();
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const currentDay = dayNames[now.getDay()];
    
    // Chercher les horaires du jour actuel dans le texte
    const horairesLower = detailLieu.horaires.toLowerCase();
    
    // Logique simplifiée - à adapter selon le format réel
    if (horairesLower.includes('fermé') && horairesLower.includes(currentDay)) {
      return false;
    }
    
    // Par défaut on ne sait pas
    return null;
  }

  /**
   * Créer un résumé du site
   */
  static getSummary(lieu: Lieu): string {
    const parts = [];
    
    if (lieu.typeLieu) {
      parts.push(this.getTypeIcon(lieu.typeLieu) + ' ' + lieu.typeLieu);
    }
    
    if (lieu.wilaya) {
      parts.push(lieu.wilaya.nom);
    }
    
    if (lieu.detailLieu?.noteMoyenne) {
      parts.push(`★ ${lieu.detailLieu.noteMoyenne.toFixed(1)}/5`);
    }
    
    if (lieu.detailLieu?.monuments?.length) {
      parts.push(`${lieu.detailLieu.monuments.length} monument(s)`);
    }
    
    if (lieu.detailLieu?.vestiges?.length) {
      parts.push(`${lieu.detailLieu.vestiges.length} vestige(s)`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Obtenir les périodes historiques d'un site
   */
  static getHistoricalPeriods(lieu: Lieu): string[] {
    if (!lieu.detailLieu?.histoire) return [];
    
    const periods = [
      'Préhistoire',
      'Période berbère',
      'Période romaine',
      'Conquête arabe',
      'Période ottomane',
      'Période coloniale',
      'Indépendance'
    ];
    
    const histoire = lieu.detailLieu.histoire.toLowerCase();
    return periods.filter(period => histoire.includes(period.toLowerCase()));
  }

  /**
   * Générer une URL Google Maps
   */
  static getGoogleMapsUrl(lieu: Lieu): string {
    return `https://www.google.com/maps/search/?api=1&query=${lieu.latitude},${lieu.longitude}`;
  }

  /**
   * Exporter en KML pour Google Earth
   */
  static exportToKML(sites: Lieu[]): string {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Sites Patrimoniaux Algérie</name>
    <description>Export des sites culturels et patrimoniaux</description>`;
    
    const kmlPlacemarks = sites.map(site => `
    <Placemark>
      <name>${this.escapeXml(site.nom)}</name>
      <description>${this.escapeXml(site.detailLieu?.description || '')}</description>
      <Point>
        <coordinates>${site.longitude},${site.latitude},0</coordinates>
      </Point>
    </Placemark>`).join('');
    
    const kmlFooter = `
  </Document>
</kml>`;
    
    return kmlHeader + kmlPlacemarks + kmlFooter;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default PatrimoineService;