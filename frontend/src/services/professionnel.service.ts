import { PaginatedApiResponse } from './../types/api.types';
// services/professionnel.service.ts - Service de l'espace professionnel complet

import ApiService from './api.service';
import { 
  API_ENDPOINTS,
  ApiResponse, 

  FilterParams 
} from '../config/api';
import { User } from '../types/User.types';
import { Oeuvre } from '../types/Oeuvre.types';
import { Artisanat } from '../types/Oeuvre.types';
import { Evenement, EvenementUser } from '../types/Evenement.types';
import { Media } from '../types/Media.types';

// Types spécifiques à l'espace professionnel
export interface DashboardData {
  stats: {
    oeuvres: {
      total: number;
      enAttente: number;
      validees: number;
      vuesTotal: number;
    };
    evenements: {
      total: number;
      aVenir: number;
      participants: number;
      tauxRemplissage: number;
    };
    artisanats: {
      total: number;
      vendus: number;
      chiffreAffaires: number;
      notesMoyenne: number;
    };
  };
  activiteRecente: Array<{
    type: 'oeuvre' | 'evenement' | 'artisanat' | 'commentaire';
    action: string;
    date: Date;
    details: any;
  }>;
  notifications: Array<{
    type: string;
    message: string;
    date: Date;
    lu: boolean;
  }>;
  graphiques: {
    vuesParJour: Array<{ date: string; vues: number }>;
    participantsParEvenement: Array<{ evenement: string; participants: number }>;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'evenement' | 'deadline' | 'rappel';
  color: string;
  details: any;
}

export interface ParticipantManagement {
  participant: User;
  statut: string;
  dateInscription: Date;
  presence?: boolean;
  notes?: string;
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  dateDebut?: string;
  dateFin?: string;
  includeStats?: boolean;
  includeDetails?: boolean;
}

export interface AnalyticsOverview {
  periode: string;
  metriques: {
    visites: number;
    visitesUniques: number;
    dureeeMoyenne: number;
    tauxRebond: number;
    nouveauxVisiteurs: number;
  };
  topContent: Array<{
    type: string;
    titre: string;
    vues: number;
    engagement: number;
  }>;
  sources: Array<{
    source: string;
    visites: number;
    pourcentage: number;
  }>;
}

export interface AnalyticsTrends {
  periode: string;
  tendances: Array<{
    metrique: string;
    valeurs: Array<{ date: string; valeur: number }>;
    evolution: number; // pourcentage
  }>;
  predictions?: Array<{
    metrique: string;
    previsions: Array<{ date: string; valeur: number }>;
  }>;
}

export interface AnalyticsDemographics {
  age: Array<{ tranche: string; pourcentage: number }>;
  genre: Array<{ genre: string; pourcentage: number }>;
  localisation: Array<{
    wilaya: string;
    visiteurs: number;
    pourcentage: number;
  }>;
  langues: Array<{ langue: string; pourcentage: number }>;
  appareils: Array<{ type: string; pourcentage: number }>;
}

export interface BenchmarkData {
  position: number;
  total: number;
  percentile: number;
  comparaisons: Array<{
    metrique: string;
    votreScore: number;
    moyenneSecteur: number;
    topPerformers: number;
  }>;
  evolution: Array<{
    mois: string;
    position: number;
    score: number;
  }>;
}

export interface RecommendationData {
  type: 'contenu' | 'evenement' | 'collaboration' | 'optimisation';
  titre: string;
  description: string;
  impact: 'faible' | 'moyen' | 'eleve';
  actions: string[];
  benefices: string[];
}

export interface CollaborationSuggestion {
  professionnelId: number;
  professionnel: User;
  raison: string;
  affinite: number; // 0-100
  domainesCommuns: string[];
  collaborationsPrecedentes: number;
}

export interface SupportTicket {
  id?: number;
  sujet: string;
  categorie: 'technique' | 'facturation' | 'contenu' | 'autre';
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  message: string;
  pieceJointes?: File[];
}

export interface FAQItem {
  id: number;
  question: string;
  reponse: string;
  categorie: string;
  votes: number;
}

export class ProfessionnelService {
  /**
   * DASHBOARD
   */

  /**
   * Récupérer les données du dashboard
   */
  static async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return ApiService.get<ApiResponse<DashboardData>>(
      API_ENDPOINTS.professionnel.dashboard
    );
  }

  /**
   * GESTION DES ŒUVRES
   */

  /**
   * Récupérer mes œuvres
   */
  static async getOeuvres(filters?: FilterParams): Promise<PaginatedApiResponse<Oeuvre>> {
    return ApiService.getPaginated<Oeuvre>(
      API_ENDPOINTS.professionnel.oeuvres,
      filters
    );
  }

  /**
   * Récupérer les statistiques d'une œuvre
   */
  static async getOeuvreStats(id: number): Promise<ApiResponse<{
    vues: number;
    vuesUniques: number;
    commentaires: number;
    noteMoyenne: number;
    favoris: number;
    partages: number;
    evolution: {
      vues: Array<{ date: string; count: number }>;
      engagement: Array<{ date: string; count: number }>;
    };
  }>> {
    return ApiService.get<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.oeuvreStats(id)
    );
  }

  /**
   * GESTION DES ARTISANATS
   */

  /**
   * Récupérer mes produits artisanaux
   */
  static async getArtisanats(filters?: FilterParams): Promise<PaginatedApiResponse<Artisanat>> {
    return ApiService.getPaginated<Artisanat>(
      API_ENDPOINTS.professionnel.artisanats,
      filters
    );
  }

  /**
   * Récupérer les statistiques d'un artisanat
   */
  static async getArtisanatStats(id: number): Promise<ApiResponse<{
    vues: number;
    commandes: number;
    revenus: number;
    stock: number;
    noteMoyenne: number;
    evolution: {
      ventes: Array<{ date: string; montant: number }>;
      stock: Array<{ date: string; quantite: number }>;
    };
  }>> {
    return ApiService.get<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.artisanatStats(id)
    );
  }

  /**
   * GESTION DES ÉVÉNEMENTS
   */

  /**
   * Récupérer mes événements
   */
  static async getEvenements(filters?: FilterParams): Promise<PaginatedApiResponse<Evenement>> {
    return ApiService.getPaginated<Evenement>(
      API_ENDPOINTS.professionnel.evenements,
      filters
    );
  }

  /**
   * Récupérer les statistiques d'un événement
   */
  static async getEvenementStats(id: number): Promise<ApiResponse<{
    inscrits: number;
    participants: number;
    tauxPresence: number;
    satisfaction: number;
    revenus: number;
    demographiques: {
      age: Array<{ tranche: string; count: number }>;
      genre: Array<{ genre: string; count: number }>;
      origine: Array<{ wilaya: string; count: number }>;
    };
    evolution: {
      inscriptions: Array<{ date: string; count: number }>;
    };
  }>> {
    return ApiService.get<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.evenementStats(id)
    );
  }

  /**
   * Gérer les participants d'un événement
   */
  static async manageParticipants(
    id: number,
    data: {
      action: 'valider' | 'refuser' | 'marquer_present' | 'envoyer_rappel';
      participantIds: number[];
      message?: string;
    }
  ): Promise<ApiResponse> {
    return ApiService.post<ApiResponse>(
      API_ENDPOINTS.professionnel.manageParticipants(id),
      data
    );
  }

  /**
   * CALENDRIER
   */

  /**
   * Récupérer les événements du calendrier
   */
  static async getCalendar(params?: {
    dateDebut: string;
    dateFin: string;
    types?: string[];
  }): Promise<ApiResponse<CalendarEvent[]>> {
    return ApiService.get<ApiResponse<CalendarEvent[]>>(
      API_ENDPOINTS.professionnel.calendar,
      params
    );
  }

  /**
   * PROFIL ET PORTFOLIO
   */

  /**
   * Mettre à jour le profil professionnel
   */
  static async updateProfile(data: {
    biographie?: string;
    specialites?: string[];
    certifications?: any[];
    reseauxSociaux?: Record<string, string>;
    siteWeb?: string;
    tarifHoraire?: number;
    disponibilites?: any;
  }): Promise<ApiResponse<User>> {
    return ApiService.put<ApiResponse<User>>(
      API_ENDPOINTS.professionnel.updateProfile,
      data
    );
  }

  /**
   * Uploader des éléments de portfolio
   */
  static async uploadPortfolio(files: File[]): Promise<ApiResponse<{
    uploaded: Array<{ filename: string; url: string }>;
    failed: Array<{ filename: string; error: string }>;
  }>> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    return ApiService.request<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.portfolioUpload,
      { method: 'POST', body: formData }
    );
  }

  /**
   * Supprimer un média du portfolio
   */
  static async deletePortfolioMedia(mediaId: number): Promise<ApiResponse> {
    return ApiService.delete<ApiResponse>(
      API_ENDPOINTS.professionnel.deletePortfolioMedia(mediaId)
    );
  }

  /**
   * Mettre à jour un média du portfolio
   */
  static async updatePortfolioMedia(
    mediaId: number,
    data: {
      titre?: string;
      description?: string;
      ordre?: number;
      visible?: boolean;
    }
  ): Promise<ApiResponse<Media>> {
    return ApiService.put<ApiResponse<Media>>(
      API_ENDPOINTS.professionnel.updatePortfolioMedia(mediaId),
      data
    );
  }

  /**
   * EXPORTS
   */

  /**
   * Exporter toutes les données
   */
  static async export(options?: ExportOptions): Promise<void> {
    const params = new URLSearchParams(options as any).toString();
    return ApiService.download(
      `${API_ENDPOINTS.professionnel.export}?${params}`,
      `export-professionnel.${options?.format || 'excel'}`
    );
  }

  /**
   * Exporter les œuvres
   */
  static async exportOeuvres(options?: ExportOptions): Promise<void> {
    const params = new URLSearchParams(options as any).toString();
    return ApiService.download(
      `${API_ENDPOINTS.professionnel.exportOeuvres}?${params}`,
      `export-oeuvres.${options?.format || 'excel'}`
    );
  }

  /**
   * Exporter les événements
   */
  static async exportEvenements(options?: ExportOptions): Promise<void> {
    const params = new URLSearchParams(options as any).toString();
    return ApiService.download(
      `${API_ENDPOINTS.professionnel.exportEvenements}?${params}`,
      `export-evenements.${options?.format || 'excel'}`
    );
  }

  /**
   * Exporter les artisanats
   */
  static async exportArtisanats(options?: ExportOptions): Promise<void> {
    const params = new URLSearchParams(options as any).toString();
    return ApiService.download(
      `${API_ENDPOINTS.professionnel.exportArtisanats}?${params}`,
      `export-artisanats.${options?.format || 'excel'}`
    );
  }

  /**
   * Exporter les participants d'un événement
   */
  static async exportParticipants(
    evenementId: number,
    options?: {
      format?: 'excel' | 'pdf' | 'csv';
      includeContacts?: boolean;
      includePresence?: boolean;
    }
  ): Promise<void> {
    const params = new URLSearchParams(options as any).toString();
    return ApiService.download(
      `${API_ENDPOINTS.professionnel.exportParticipants(evenementId)}?${params}`,
      `participants-evenement-${evenementId}.${options?.format || 'excel'}`
    );
  }

  /**
   * NOTIFICATIONS
   */

  /**
   * Récupérer les notifications professionnelles
   */
  static async getNotifications(params?: {
    type?: string;
    lu?: boolean;
    limit?: number;
  }): Promise<ApiResponse<Array<{
    id: number;
    type: string;
    titre: string;
    message: string;
    date: Date;
    lu: boolean;
    action?: string;
  }>>> {
    return ApiService.get<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.notifications,
      params
    );
  }

  /**
   * ANALYTICS
   */

  /**
   * Récupérer la vue d'ensemble des analytics
   */
  static async getAnalyticsOverview(params?: {
    periode?: 'jour' | 'semaine' | 'mois' | 'annee';
    dateDebut?: string;
    dateFin?: string;
  }): Promise<ApiResponse<AnalyticsOverview>> {
    return ApiService.get<ApiResponse<AnalyticsOverview>>(
      API_ENDPOINTS.professionnel.analyticsOverview,
      params
    );
  }

  /**
   * Récupérer les tendances
   */
  static async getAnalyticsTrends(params?: {
    metriques: string[];
    periode: string;
    comparerAvec?: string;
  }): Promise<ApiResponse<AnalyticsTrends>> {
    return ApiService.get<ApiResponse<AnalyticsTrends>>(
      API_ENDPOINTS.professionnel.analyticsTrends,
      params
    );
  }

  /**
   * Récupérer les données démographiques
   */
  static async getAnalyticsDemographics(params?: {
    periode?: string;
    type?: 'visiteurs' | 'participants' | 'acheteurs';
  }): Promise<ApiResponse<AnalyticsDemographics>> {
    return ApiService.get<ApiResponse<AnalyticsDemographics>>(
      API_ENDPOINTS.professionnel.analyticsDemographics,
      params
    );
  }

  /**
   * FONCTIONNALITÉS AVANCÉES
   */

  /**
   * Récupérer les données de benchmark
   */
  static async getBenchmark(params?: {
    metriques?: string[];
    periode?: string;
    secteur?: string;
  }): Promise<ApiResponse<BenchmarkData>> {
    return ApiService.get<ApiResponse<BenchmarkData>>(
      API_ENDPOINTS.professionnel.benchmark,
      params
    );
  }

  /**
   * Récupérer les recommandations personnalisées
   */
  static async getRecommendations(params?: {
    types?: string[];
    limit?: number;
  }): Promise<ApiResponse<RecommendationData[]>> {
    return ApiService.get<ApiResponse<RecommendationData[]>>(
      API_ENDPOINTS.professionnel.recommendations,
      params
    );
  }

  /**
   * Récupérer les suggestions de collaboration
   */
  static async getCollaborationSuggestions(params?: {
    domaines?: string[];
    localisation?: number;
    limit?: number;
  }): Promise<ApiResponse<CollaborationSuggestion[]>> {
    return ApiService.get<ApiResponse<CollaborationSuggestion[]>>(
      API_ENDPOINTS.professionnel.collaborationSuggestions,
      params
    );
  }

  /**
   * SUPPORT
   */

  /**
   * Créer un ticket de support
   */
  static async createTicket(ticket: SupportTicket): Promise<ApiResponse<{ ticketId: number; reference: string }>> {
    const formData = new FormData();
    
    // Ajouter les données du ticket
    Object.entries(ticket).forEach(([key, value]) => {
      if (key !== 'pieceJointes' && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    // Ajouter les pièces jointes
    if (ticket.pieceJointes) {
      ticket.pieceJointes.forEach(file => {
        formData.append('attachments', file);
      });
    }
    
    return ApiService.request<ApiResponse<any>>(
      API_ENDPOINTS.professionnel.createTicket,
      { method: 'POST', body: formData }
    );
  }

  /**
   * Récupérer la FAQ
   */
  static async getHelpFaq(params?: {
    categorie?: string;
    recherche?: string;
  }): Promise<ApiResponse<FAQItem[]>> {
    return ApiService.get<ApiResponse<FAQItem[]>>(
      API_ENDPOINTS.professionnel.helpFaq,
      params
    );
  }

  /**
   * HELPERS
   */

  /**
   * Calculer le taux d'engagement
   */
  static calculateEngagementRate(stats: {
    vues: number;
    interactions: number;
  }): number {
    if (stats.vues === 0) return 0;
    return Math.round((stats.interactions / stats.vues) * 100);
  }

  /**
   * Formater les revenus
   */
  static formatRevenue(amount: number): string {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Obtenir la couleur selon la performance
   */
  static getPerformanceColor(value: number, target: number): string {
    const ratio = value / target;
    if (ratio >= 1) return '#4caf50'; // Vert
    if (ratio >= 0.8) return '#ff9800'; // Orange
    return '#f44336'; // Rouge
  }

  /**
   * Générer des recommandations
   */
  static generateRecommendations(stats: DashboardData): string[] {
    const recommendations: string[] = [];

    // Basé sur les œuvres
    if (stats.stats.oeuvres.enAttente > 5) {
      recommendations.push('Vous avez plusieurs œuvres en attente de validation');
    }

    // Basé sur les événements
    if (stats.stats.evenements.tauxRemplissage < 50) {
      recommendations.push('Promouvoir vos événements pour augmenter les inscriptions');
    }

    // Basé sur l'engagement
    const engagement = stats.graphiques.vuesParJour.slice(-7).reduce((a, b) => a + b.vues, 0);
    if (engagement < 100) {
      recommendations.push('Publier du nouveau contenu pour augmenter l\'engagement');
    }

    return recommendations;
  }

  /**
   * Créer un résumé d'activité
   */
  static createActivitySummary(activities: any[]): {
    parType: Record<string, number>;
    parJour: Record<string, number>;
    plusActive: string;
  } {
    const parType: Record<string, number> = {};
    const parJour: Record<string, number> = {};

    activities.forEach(activity => {
      // Par type
      parType[activity.type] = (parType[activity.type] || 0) + 1;

      // Par jour
      const jour = new Date(activity.date).toISOString().split('T')[0];
      parJour[jour] = (parJour[jour] || 0) + 1;
    });

    // Jour le plus actif
    const plusActive = Object.entries(parJour)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    return { parType, parJour, plusActive };
  }

  /**
   * Exporter le calendrier en iCal
   */
  static exportCalendarToICal(events: CalendarEvent[]): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Action Culture Algérie//Calendrier Pro//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(event => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@actionculture.dz`);
      lines.push(`SUMMARY:${event.title}`);
      lines.push(`DTSTART:${this.formatICalDate(event.start)}`);
      lines.push(`DTEND:${this.formatICalDate(event.end)}`);
      lines.push(`CATEGORIES:${event.type}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    
    return lines.join('\r\n');
  }

  private static formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /**
   * Obtenir le niveau de priorité selon l'impact
   */
  static getImpactLevel(impact: 'faible' | 'moyen' | 'eleve'): {
    color: string;
    icon: string;
    label: string;
  } {
    const levels = {
      faible: { color: '#4caf50', icon: '📊', label: 'Impact faible' },
      moyen: { color: '#ff9800', icon: '📈', label: 'Impact moyen' },
      eleve: { color: '#f44336', icon: '🚀', label: 'Impact élevé' }
    };
    
    return levels[impact];
  }

  /**
   * Calculer le score d'affinité
   */
  static calculateAffinityScore(
    domainesCommuns: string[],
    collaborationsPrecedentes: number,
    distance?: number
  ): number {
    let score = 0;
    
    // Domaines communs (40%)
    score += Math.min(domainesCommuns.length * 10, 40);
    
    // Collaborations précédentes (30%)
    score += Math.min(collaborationsPrecedentes * 10, 30);
    
    // Distance (30%) - plus proche = meilleur score
    if (distance !== undefined) {
      if (distance < 10) score += 30;
      else if (distance < 50) score += 20;
      else if (distance < 100) score += 10;
    }
    
    return Math.min(score, 100);
  }
}

export default ProfessionnelService;