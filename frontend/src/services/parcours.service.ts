// services/parcours.service.ts - Service de gestion des parcours touristiques

import ApiService from './api.service';
import { 
  API_ENDPOINTS,
  ApiResponse, 
  PaginatedApiResponse,
  FilterParams 
} from '../config/api';
import { Parcours, ParcoursLieu } from '../types/Evenement.types';
import { Lieu } from '../types/Geographie.types';

export interface ParcoursFilters extends FilterParams {
  theme?: string;
  difficulte?: 'facile' | 'moyen' | 'difficile';
  dureeMin?: number;
  dureeMax?: number;
  distanceMax?: number;
  statut?: 'actif' | 'inactif' | 'maintenance';
  wilayaId?: number;
}

export interface CreateParcoursData {
  nomParcours: string;
  description?: string;
  theme?: string;
  difficulte?: 'facile' | 'moyen' | 'difficile';
  lieux: Array<{
    idLieu: number;
    ordre: number;
    dureeEstimee?: number;
    notes?: string;
    transportMode?: 'marche' | 'velo' | 'voiture' | 'transport_public';
  }>;
  pointDepart?: string;
  pointArrivee?: string;
}

export interface ParcoursPersonnaliseParams {
  depart: { lat: number; lng: number } | { lieuId: number };
  arrivee?: { lat: number; lng: number } | { lieuId: number };
  themes?: string[];
  dureeMax?: number; // en minutes
  distanceMax?: number; // en km
  difficulte?: 'facile' | 'moyen' | 'difficile';
  inclureMonuments?: boolean;
  inclureVestiges?: boolean;
  moyenTransport?: 'marche' | 'velo' | 'voiture' | 'transport_public';
}

export interface ParcoursStats {
  distanceKm: number;
  dureeEstimee: number;
  nombreLieux: number;
  denivele?: number;
  caloriesBrulees?: number; // pour marche/vélo
}

export interface ParcoursPopulaire {
  parcours: Parcours;
  nombreUtilisations: number;
  noteMoyenne: number;
  dernierUsage: Date;
}

export class ParcoursService {
  /**
   * RÉCUPÉRATION DES PARCOURS
   */

  /**
   * Récupérer les parcours d'un événement
   */
  static async getByEvenement(evenementId: number): Promise<ApiResponse<Parcours[]>> {
    return ApiService.get<ApiResponse<Parcours[]>>(
      API_ENDPOINTS.parcours.evenement(evenementId)
    );
  }

  /**
   * Récupérer les parcours populaires d'une wilaya
   */
  static async getPopulaires(
    wilayaId: number, 
    limit = 10
  ): Promise<ApiResponse<ParcoursPopulaire[]>> {
    return ApiService.get<ApiResponse<ParcoursPopulaire[]>>(
      API_ENDPOINTS.parcours.populaires(wilayaId),
      { limit }
    );
  }

  /**
   * CRÉATION DE PARCOURS
   */

  /**
   * Créer un parcours personnalisé
   */
  static async createPersonnalise(
    params: ParcoursPersonnaliseParams
  ): Promise<ApiResponse<Parcours>> {
    return ApiService.post<ApiResponse<Parcours>>(
      API_ENDPOINTS.parcours.personnalise,
      params
    );
  }

  /**
   * HELPERS ET UTILITAIRES
   */

  /**
   * Calculer les statistiques d'un parcours
   */
  static calculateStats(parcours: Parcours): ParcoursStats {
    let distanceKm = parcours.distanceKm || 0;
    let dureeEstimee = parcours.dureeEstimee || 0;
    
    // Si on a les détails des lieux
    if (parcours.parcoursLieux && parcours.parcoursLieux.length > 0) {
      // Calculer la durée totale
      dureeEstimee = parcours.parcoursLieux.reduce((total, pl) => {
        return total + (pl.dureeEstimee || 0) + (pl.tempsTrajet || 0);
      }, 0);
      
      // Calculer la distance si on a les coordonnées des lieux
      if (parcours.lieux && parcours.lieux.length > 1) {
        distanceKm = 0;
        for (let i = 1; i < parcours.lieux.length; i++) {
          const lieu1 = parcours.lieux[i - 1];
          const lieu2 = parcours.lieux[i];
          distanceKm += this.calculateDistance(
            lieu1.latitude, 
            lieu1.longitude,
            lieu2.latitude,
            lieu2.longitude
          );
        }
      }
    }
    
    // Estimation des calories (approximatif)
    let caloriesBrulees = 0;
    if (parcours.parcoursLieux?.[0]?.transportMode === 'marche') {
      caloriesBrulees = Math.round(distanceKm * 60); // ~60 cal/km marche
    } else if (parcours.parcoursLieux?.[0]?.transportMode === 'velo') {
      caloriesBrulees = Math.round(distanceKm * 30); // ~30 cal/km vélo
    }
    
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      dureeEstimee,
      nombreLieux: parcours.lieux?.length || 0,
      caloriesBrulees
    };
  }

  /**
   * Calculer la distance entre deux points
   */
  private static calculateDistance(
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
   * Formater la durée en format lisible
   */
  static formatDuree(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${heures}h`;
    }
    
    return `${heures}h${mins}`;
  }

  /**
   * Obtenir l'icône selon la difficulté
   */
  static getDifficulteIcon(difficulte?: string): string {
    const icons = {
      'facile': '🟢',
      'moyen': '🟡',
      'difficile': '🔴'
    };
    return icons[difficulte as keyof typeof icons] || '⚪';
  }

  /**
   * Obtenir la couleur selon la difficulté
   */
  static getDifficulteColor(difficulte?: string): string {
    const colors = {
      'facile': '#4caf50',
      'moyen': '#ff9800',
      'difficile': '#f44336'
    };
    return colors[difficulte as keyof typeof colors] || '#9e9e9e';
  }

  /**
   * Obtenir l'icône du moyen de transport
   */
  static getTransportIcon(mode?: string): string {
    const icons = {
      'marche': '🚶',
      'velo': '🚴',
      'voiture': '🚗',
      'transport_public': '🚌'
    };
    return icons[mode as keyof typeof icons] || '🚶';
  }

  /**
   * Générer un résumé du parcours
   */
  static getSummary(parcours: Parcours): string {
    const stats = this.calculateStats(parcours);
    const parts = [];
    
    if (stats.nombreLieux) {
      parts.push(`${stats.nombreLieux} étapes`);
    }
    
    if (stats.distanceKm) {
      parts.push(`${stats.distanceKm} km`);
    }
    
    if (stats.dureeEstimee) {
      parts.push(this.formatDuree(stats.dureeEstimee));
    }
    
    if (parcours.difficulte) {
      parts.push(`Difficulté: ${parcours.difficulte}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Ordonner les lieux d'un parcours
   */
  static orderLieux(parcours: Parcours): Lieu[] {
    if (!parcours.parcoursLieux || !parcours.lieux) return [];
    
    // Créer une map pour un accès rapide
    const lieuMap = new Map<number, Lieu>();
    parcours.lieux.forEach(lieu => {
      lieuMap.set(lieu.idLieu, lieu);
    });
    
    // Trier par ordre et retourner les lieux
    return parcours.parcoursLieux
      .sort((a, b) => a.ordre - b.ordre)
      .map(pl => lieuMap.get(pl.idLieu))
      .filter((lieu): lieu is Lieu => lieu !== undefined);
  }

  /**
   * Vérifier si un parcours est réalisable
   */
  static isRealisable(parcours: Parcours): {
    realisable: boolean;
    raisons: string[];
  } {
    const raisons: string[] = [];
    
    // Vérifier le statut
    if (parcours.statut !== 'actif') {
      raisons.push('Le parcours n\'est pas actif');
    }
    
    // Vérifier qu'il y a au moins 2 lieux
    if (!parcours.lieux || parcours.lieux.length < 2) {
      raisons.push('Le parcours doit contenir au moins 2 lieux');
    }
    
    // Vérifier la cohérence des données
    if (parcours.parcoursLieux) {
      const ordres = parcours.parcoursLieux.map(pl => pl.ordre);
      const uniqueOrdres = new Set(ordres);
      if (uniqueOrdres.size !== ordres.length) {
        raisons.push('L\'ordre des étapes n\'est pas unique');
      }
    }
    
    return {
      realisable: raisons.length === 0,
      raisons
    };
  }

  /**
   * Générer une URL Google Maps pour le parcours
   */
  static getGoogleMapsUrl(parcours: Parcours): string {
    const lieux = this.orderLieux(parcours);
    if (lieux.length < 2) return '';
    
    const waypoints = lieux.slice(1, -1).map(lieu => 
      `${lieu.latitude},${lieu.longitude}`
    ).join('|');
    
    const origin = `${lieux[0].latitude},${lieux[0].longitude}`;
    const destination = `${lieux[lieux.length - 1].latitude},${lieux[lieux.length - 1].longitude}`;
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    
    // Mode de transport
    const transportMode = parcours.parcoursLieux?.[0]?.transportMode;
    const modeMap = {
      'marche': 'walking',
      'velo': 'bicycling',
      'voiture': 'driving',
      'transport_public': 'transit'
    };
    
    if (transportMode && modeMap[transportMode]) {
      url += `&travelmode=${modeMap[transportMode]}`;
    }
    
    return url;
  }

  /**
   * Exporter un parcours en GPX
   */
  static exportToGPX(parcours: Parcours): string {
    const lieux = this.orderLieux(parcours);
    
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Action Culture Algérie"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <n>${this.escapeXml(parcours.nomParcours)}</n>
    <desc>${this.escapeXml(parcours.description || '')}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;
    
    const gpxWaypoints = lieux.map((lieu, index) => `
  <wpt lat="${lieu.latitude}" lon="${lieu.longitude}">
    <ele>0</ele>
    <n>${this.escapeXml(lieu.nom)}</n>
    <desc>Étape ${index + 1}</desc>
  </wpt>`).join('');
    
    const gpxRoute = `
  <rte>
    <n>${this.escapeXml(parcours.nomParcours)}</n>
    ${lieux.map(lieu => `
    <rtept lat="${lieu.latitude}" lon="${lieu.longitude}">
      <ele>0</ele>
      <n>${this.escapeXml(lieu.nom)}</n>
    </rtept>`).join('')}
  </rte>`;
    
    const gpxFooter = `
</gpx>`;
    
    return gpxHeader + gpxWaypoints + gpxRoute + gpxFooter;
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
   * Estimer le coût du parcours
   */
  static estimateCost(parcours: Parcours): {
    carburant?: number;
    transportPublic?: number;
    total: number;
  } {
    const stats = this.calculateStats(parcours);
    const transportMode = parcours.parcoursLieux?.[0]?.transportMode;
    
    let carburant = 0;
    let transportPublic = 0;
    
    if (transportMode === 'voiture') {
      // Estimation: 7L/100km, 200 DA/L
      carburant = Math.round(stats.distanceKm * 0.07 * 200);
    } else if (transportMode === 'transport_public') {
      // Estimation forfaitaire
      transportPublic = stats.nombreLieux * 50; // 50 DA par trajet
    }
    
    return {
      carburant: carburant || undefined,
      transportPublic: transportPublic || undefined,
      total: carburant + transportPublic
    };
  }

  /**
   * Obtenir les recommandations pour le parcours
   */
  static getRecommendations(parcours: Parcours): string[] {
    const recommendations: string[] = [];
    const stats = this.calculateStats(parcours);
    
    // Selon la difficulté
    if (parcours.difficulte === 'difficile') {
      recommendations.push('Prévoir de l\'eau et des collations');
      recommendations.push('Porter des chaussures confortables');
    }
    
    // Selon la durée
    if (stats.dureeEstimee > 240) { // Plus de 4h
      recommendations.push('Prévoir un repas');
      recommendations.push('Commencer tôt le matin');
    }
    
    // Selon le transport
    const transportMode = parcours.parcoursLieux?.[0]?.transportMode;
    if (transportMode === 'marche') {
      recommendations.push('Protection solaire recommandée');
    } else if (transportMode === 'velo') {
      recommendations.push('Vérifier l\'état du vélo avant le départ');
      recommendations.push('Porter un casque');
    }
    
    // Général
    recommendations.push('Charger son téléphone');
    recommendations.push('Informer un proche de votre itinéraire');
    
    return recommendations;
  }
}

export default ParcoursService;