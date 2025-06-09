// services/lieu.service.ts - Service de gestion des lieux culturels corrigé

import { apiService, ApiResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { Lieu, DetailLieu, Service, LieuMedia } from '../types/Geographie.types';

export interface LieuFilters {
  typeLieu?: 'Wilaya' | 'Daira' | 'Commune';
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  avecMonuments?: boolean;
  avecVestiges?: boolean;
  noteMoyenneMin?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProximiteParams {
  lat: number;
  lng: number;
  radius?: number; // en km, par défaut 5
  typeLieu?: string;
  limit?: number;
}

export interface LieuStatistiques {
  total: number;
  parType: Record<string, number>;
  parWilaya: Record<number, number>;
  avecMonuments: number;
  avecVestiges: number;
  noteMoyenne: number;
  plusVisites: Array<{
    lieu: Lieu;
    visites: number;
  }>;
}

export interface CreateLieuData {
  typeLieu: 'Wilaya' | 'Daira' | 'Commune';
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  description?: string;
  horaires?: string;
  histoire?: string;
  referencesHistoriques?: string;
}

export class LieuService {
  /**
   * RÉCUPÉRATION DES LIEUX
   */

  /**
   * Récupérer la liste des lieux
   */
  static async getList(filters?: LieuFilters): Promise<ApiResponse<Lieu[]>> {
    return apiService.get<Lieu[]>(API_ENDPOINTS.lieux.list, filters);
  }

  /**
   * Récupérer les lieux à proximité
   */
  static async getProximite(params: ProximiteParams): Promise<ApiResponse<Lieu[]>> {
    const { lat, lng, radius = 5, ...otherParams } = params;
    
    return apiService.get<Lieu[]>(
      API_ENDPOINTS.lieux.proximite,
      { lat, lng, radius, ...otherParams }
    );
  }

  /**
   * Récupérer les statistiques des lieux
   */
  static async getStatistiques(): Promise<ApiResponse<LieuStatistiques>> {
    return apiService.get<LieuStatistiques>(
      API_ENDPOINTS.lieux.statistiques
    );
  }

  /**
   * Récupérer le détail d'un lieu
   */
  static async getDetail(id: number): Promise<ApiResponse<Lieu>> {
    return apiService.get<Lieu>(
      API_ENDPOINTS.lieux.detail(id)
    );
  }

  /**
   * CRÉATION ET GESTION
   */

  /**
   * Créer un nouveau lieu
   */
  static async create(data: CreateLieuData): Promise<ApiResponse<Lieu>> {
    return apiService.post<Lieu>(
      API_ENDPOINTS.lieux.create,
      data
    );
  }

  /**
   * HELPERS ET UTILITAIRES
   */

  /**
   * Calculer la distance entre deux points
   */
  static calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRad(value: number): number {
    return value * Math.PI / 180;
  }

  /**
   * Formater l'adresse complète d'un lieu
   */
  static formatAdresse(lieu: Lieu): string {
    const parts = [lieu.adresse];
    
    if (lieu.localite) {
      parts.push(lieu.localite.nom);
    }
    
    if (lieu.commune) {
      parts.push(lieu.commune.nom);
    }
    
    if (lieu.daira && lieu.daira.nom !== lieu.commune?.nom) {
      parts.push(lieu.daira.nom);
    }
    
    if (lieu.wilaya) {
      parts.push(lieu.wilaya.nom);
    }
    
    return parts.filter(Boolean).join(', ');
  }

  /**
   * Obtenir l'icône selon le type de lieu
   */
  static getTypeIcon(typeLieu: string): string {
    const icons: Record<string, string> = {
      'Wilaya': '🏛️',
      'Daira': '🏘️',
      'Commune': '🏡',
      'Monument': '🕌',
      'Vestige': '🏺',
      'Musée': '🏛️',
      'Site': '📍'
    };
    return icons[typeLieu] || '📍';
  }

  /**
   * Grouper les lieux par type
   */
  static groupByType(lieux: Lieu[]): Record<string, Lieu[]> {
    return lieux.reduce((acc, lieu) => {
      const type = lieu.typeLieu;
      if (!acc[type]) acc[type] = [];
      acc[type].push(lieu);
      return acc;
    }, {} as Record<string, Lieu[]>);
  }

  /**
   * Grouper les lieux par wilaya
   */
  static groupByWilaya(lieux: Lieu[]): Record<string, Lieu[]> {
    return lieux.reduce((acc, lieu) => {
      const wilayaName = lieu.wilaya?.nom || 'Inconnu';
      if (!acc[wilayaName]) acc[wilayaName] = [];
      acc[wilayaName].push(lieu);
      return acc;
    }, {} as Record<string, Lieu[]>);
  }

  /**
   * Filtrer les lieux avec monuments
   */
  static filterWithMonuments(lieux: Lieu[]): Lieu[] {
    return lieux.filter(lieu => 
      lieu.detailLieu?.monuments && lieu.detailLieu.monuments.length > 0
    );
  }

  /**
   * Filtrer les lieux avec vestiges
   */
  static filterWithVestiges(lieux: Lieu[]): Lieu[] {
    return lieux.filter(lieu => 
      lieu.detailLieu?.vestiges && lieu.detailLieu.vestiges.length > 0
    );
  }

  /**
   * Trier les lieux par distance
   */
  static sortByDistance(
    lieux: Lieu[], 
    centerLat: number, 
    centerLng: number
  ): Lieu[] {
    return [...lieux].sort((a, b) => {
      const distA = this.calculateDistance(centerLat, centerLng, a.latitude, a.longitude);
      const distB = this.calculateDistance(centerLat, centerLng, b.latitude, b.longitude);
      return distA - distB;
    });
  }

  /**
   * Créer une URL Google Maps
   */
  static getGoogleMapsUrl(lieu: Lieu): string {
    return `https://www.google.com/maps/search/?api=1&query=${lieu.latitude},${lieu.longitude}`;
  }

  /**
   * Créer une URL de navigation
   */
  static getNavigationUrl(
    fromLat: number, 
    fromLng: number, 
    lieu: Lieu
  ): string {
    return `https://www.google.com/maps/dir/${fromLat},${fromLng}/${lieu.latitude},${lieu.longitude}`;
  }

  /**
   * Vérifier si un lieu est ouvert
   */
  static isOpen(lieu: Lieu, date: Date = new Date()): boolean | null {
    if (!lieu.detailLieu?.horaires) return null;
    
    // Parser les horaires (format attendu: "Lun-Ven: 9h-17h, Sam: 9h-12h")
    // Cette fonction est simplifiée, une vraie implémentation serait plus complexe
    const day = date.getDay();
    const hour = date.getHours();
    
    // Logique simplifiée - à adapter selon le format réel des horaires
    const horaires = lieu.detailLieu.horaires.toLowerCase();
    
    // Vérifier si fermé
    if (horaires.includes('fermé')) {
      return false;
    }
    
    // Par défaut, on ne sait pas
    return null;
  }

  /**
   * Obtenir les services disponibles
   */
  static getServices(lieu: Lieu): string[] {
    if (!lieu.services) return [];
    return lieu.services.map(s => s.nom);
  }

  /**
   * Vérifier si un lieu a un service spécifique
   */
  static hasService(lieu: Lieu, serviceName: string): boolean {
    return this.getServices(lieu).some(s => 
      s.toLowerCase().includes(serviceName.toLowerCase())
    );
  }

  /**
   * Obtenir la note moyenne formatée
   */
  static getFormattedRating(lieu: Lieu): string {
    if (!lieu.detailLieu?.noteMoyenne) return 'Non noté';
    
    const rating = lieu.detailLieu.noteMoyenne;
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    
    return `${stars} (${rating.toFixed(1)}/5)`;
  }

  /**
   * Créer un résumé du lieu
   */
  static getSummary(lieu: Lieu): string {
    const parts = [];
    
    if (lieu.detailLieu?.monuments?.length) {
      parts.push(`${lieu.detailLieu.monuments.length} monument(s)`);
    }
    
    if (lieu.detailLieu?.vestiges?.length) {
      parts.push(`${lieu.detailLieu.vestiges.length} vestige(s)`);
    }
    
    if (lieu.services?.length) {
      parts.push(`${lieu.services.length} service(s)`);
    }
    
    if (lieu.detailLieu?.noteMoyenne) {
      parts.push(`Note: ${lieu.detailLieu.noteMoyenne.toFixed(1)}/5`);
    }
    
    return parts.join(' • ') || 'Aucune information';
  }

  /**
   * Exporter les lieux en KML pour Google Earth
   */
  static exportToKML(lieux: Lieu[]): string {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <n>Lieux Culturels Algérie</n>
    <description>Export des lieux culturels</description>`;
    
    const kmlPlacemarks = lieux.map(lieu => `
    <Placemark>
      <n>${this.escapeXml(lieu.nom)}</n>
      <description>${this.escapeXml(lieu.detailLieu?.description || '')}</description>
      <Point>
        <coordinates>${lieu.longitude},${lieu.latitude},0</coordinates>
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

  /**
   * Obtenir les périodes historiques d'un lieu
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
}

export default LieuService;