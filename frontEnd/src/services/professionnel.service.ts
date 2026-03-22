// services/professionnel.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { httpClient } from './httpClient';
import { Oeuvre } from '@/types/models/oeuvre.types';
import { Evenement } from '@/types/models/evenement.types';
import { Artisanat } from '@/types/models/oeuvres-specialisees.types';
import { Notification } from '@/types/models/notification.types';
import type {
  EntityStatsResponse, ProfileUpdateData, ProfileResponse,
  PortfolioMediaResponse, CalendarEventData, FAQItem
} from '@/types/api/professionnel.types';

interface DashboardStats {
  oeuvres: {
    total: number;
    publiees: number;
    en_attente: number;
    vues_total: number;
    top_viewed?: Array<{
      id_oeuvre: number;
      titre: string;
      vues: number;
    }>;
  };
  evenements: {
    total: number;
    a_venir: number;
    participants_total: number;
    taux_remplissage: number;
  };
  artisanats: {
    total: number;
    en_stock: number;
    commandes: number;
    revenus_mois: number;
  };
  engagement: {
    favoris_total: number;
    commentaires_total: number;
    note_moyenne: number;
    evolution_mois: number;
    total_interactions?: number;
  };
  followers_count?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'evenement' | 'programme' | 'deadline';
  start: string;
  end: string;
  color: string;
  data: CalendarEventData;
}

interface AnalyticsOverview {
  period: string;
  metrics: {
    views: number;
    engagement_rate: number;
    new_followers: number;
    conversion_rate: number;
  };
  top_content: Array<{
    type: string;
    id: number;
    title: string;
    views: number;
  }>;
}

interface AnalyticsTrends {
  period: string;
  data: Array<{
    date: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

interface Demographics {
  age_groups: Record<string, number>;
  gender: Record<string, number>;
  locations: Array<{ wilaya: string; count: number; percentage: number }>;
  interests: Array<{ category: string; count: number }>;
}

interface BenchmarkData {
  position: number;
  total_professionals: number;
  metrics: {
    views: { value: number; rank: number; percentile: number };
    engagement: { value: number; rank: number; percentile: number };
    content: { value: number; rank: number; percentile: number };
    rating: { value: number; rank: number; percentile: number };
  };
  similar_profiles: Array<{
    id: number;
    name: string;
    specialties: string[];
    metrics: Record<string, number>;
  }>;
}

interface Recommendation {
  type: 'action' | 'insight' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: {
    label: string;
    url: string;
  };
  impact?: string;
}

interface CollaborationSuggestion {
  user_id: number;
  name: string;
  type_user: string;
  specialties: string[];
  compatibility_score: number;
  common_interests: string[];
  potential_projects: string[];
}

interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  date_debut?: string;
  date_fin?: string;
  include_stats?: boolean;
}

interface SupportTicket {
  sujet: string;
  categorie: 'technique' | 'compte' | 'contenu' | 'paiement' | 'autre';
  message: string;
  urgence: 'basse' | 'normale' | 'haute';
  pieces_jointes?: File[];
}

// Helper pour convertir ExportOptions en query string params
function exportOptionsToParams(options: ExportOptions): Record<string, string> {
  const params: Record<string, string> = { format: options.format };
  if (options.date_debut) params.date_debut = options.date_debut;
  if (options.date_fin) params.date_fin = options.date_fin;
  if (options.include_stats !== undefined) params.include_stats = String(options.include_stats);
  return params;
}

class ProfessionnelService {
  // Dashboard
  async getDashboard(): Promise<ApiResponse<DashboardStats>> {
    return httpClient.get<DashboardStats>(API_ENDPOINTS.professionnel.dashboard);
  }

  async getCalendar(month?: string, year?: number): Promise<ApiResponse<CalendarEvent[]>> {
    const params: FilterParams = {};
    if (month) params.month = month;
    if (year) params.year = year;

    return httpClient.get<CalendarEvent[]>(API_ENDPOINTS.professionnel.calendar, params);
  }

  async getNotifications(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return httpClient.getPaginated<Notification>(API_ENDPOINTS.professionnel.notifications, params);
  }

  // Œuvres
  async getOeuvres(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Oeuvre>>> {
    return httpClient.getPaginated<Oeuvre>(API_ENDPOINTS.professionnel.oeuvres, params);
  }

  async getOeuvreStats(id: number): Promise<ApiResponse<EntityStatsResponse>> {
    return httpClient.get<EntityStatsResponse>(API_ENDPOINTS.professionnel.oeuvreStats(id));
  }

  // Artisanats
  async getArtisanats(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Artisanat>>> {
    return httpClient.getPaginated<Artisanat>(API_ENDPOINTS.professionnel.artisanats, params);
  }

  async getArtisanatStats(id: number): Promise<ApiResponse<EntityStatsResponse>> {
    return httpClient.get<EntityStatsResponse>(API_ENDPOINTS.professionnel.artisanatStats(id));
  }

  // Événements
  async getEvenements(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Evenement>>> {
    return httpClient.getPaginated<Evenement>(API_ENDPOINTS.professionnel.evenements, params);
  }

  async getEvenementStats(id: number): Promise<ApiResponse<EntityStatsResponse>> {
    return httpClient.get<EntityStatsResponse>(API_ENDPOINTS.professionnel.evenementStats(id));
  }

  async manageParticipants(
    eventId: number,
    action: 'confirmer' | 'rejeter' | 'marquer_present' | 'marquer_absent',
    userId: number,
    notes?: string
  ): Promise<ApiResponse<void>> {
    return httpClient.post<void>(
      API_ENDPOINTS.professionnel.manageParticipants(eventId),
      { action, userId, notes }
    );
  }

  // Profil & Portfolio
  async updateProfile(data: ProfileUpdateData): Promise<ApiResponse<ProfileResponse>> {
    return httpClient.put<ProfileResponse>(API_ENDPOINTS.professionnel.updateProfile, data);
  }

  async uploadPortfolioMedia(files: File[]): Promise<ApiResponse<PortfolioMediaResponse[]>> {
    try {
      const uploads = await Promise.all(
        files.map((file) =>
          httpClient.uploadFile<PortfolioMediaResponse>(API_ENDPOINTS.professionnel.portfolioUpload, file, {
            fieldName: 'medias'
          })
        )
      );

      const failed = uploads.find((item) => !item.success);
      if (failed) {
        return {
          success: false,
          error: failed.error || 'Échec de l\'upload du portfolio'
        };
      }

      return {
        success: true,
        data: uploads.map((item) => item.data).filter((d): d is PortfolioMediaResponse => d !== undefined)
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload du portfolio'
      };
    }
  }

  async deletePortfolioMedia(mediaId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.professionnel.deletePortfolioMedia(mediaId));
  }

  async updatePortfolioMedia(
    mediaId: number,
    data: { titre?: string; description?: string; ordre?: number }
  ): Promise<ApiResponse<PortfolioMediaResponse>> {
    return httpClient.put<PortfolioMediaResponse>(API_ENDPOINTS.professionnel.updatePortfolioMedia(mediaId), data);
  }

  // Analytics
  async getAnalyticsOverview(period: 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<AnalyticsOverview>> {
    return httpClient.get<AnalyticsOverview>(API_ENDPOINTS.professionnel.analyticsOverview, { period });
  }

  async getAnalyticsTrends(
    period: 'week' | 'month' | 'year' = 'month',
    metric?: 'views' | 'engagement' | 'all'
  ): Promise<ApiResponse<AnalyticsTrends>> {
    const params: FilterParams = { period };
    if (metric) {
      params.metric = metric;
    }
    return httpClient.get<AnalyticsTrends>(API_ENDPOINTS.professionnel.analyticsTrends, params);
  }

  async getAnalyticsDemographics(): Promise<ApiResponse<Demographics>> {
    return httpClient.get<Demographics>(API_ENDPOINTS.professionnel.analyticsDemographics);
  }

  // Fonctionnalités avancées
  async getBenchmark(): Promise<ApiResponse<BenchmarkData>> {
    return httpClient.get<BenchmarkData>(API_ENDPOINTS.professionnel.benchmark);
  }

  async getRecommendations(): Promise<ApiResponse<Recommendation[]>> {
    return httpClient.get<Recommendation[]>(API_ENDPOINTS.professionnel.recommendations);
  }

  async getCollaborationSuggestions(): Promise<ApiResponse<CollaborationSuggestion[]>> {
    return httpClient.get<CollaborationSuggestion[]>(API_ENDPOINTS.professionnel.collaborationSuggestions);
  }

  // Export
  async exportData(options: ExportOptions): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.professionnel.export}?${new URLSearchParams(exportOptionsToParams(options))}`,
      `export_professionnel.${options.format}`
    );
  }

  async exportOeuvres(options: ExportOptions): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.professionnel.exportOeuvres}?${new URLSearchParams(exportOptionsToParams(options))}`,
      `export_oeuvres.${options.format}`
    );
  }

  async exportEvenements(options: ExportOptions): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.professionnel.exportEvenements}?${new URLSearchParams(exportOptionsToParams(options))}`,
      `export_evenements.${options.format}`
    );
  }

  async exportArtisanats(options: ExportOptions): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.professionnel.exportArtisanats}?${new URLSearchParams(exportOptionsToParams(options))}`,
      `export_artisanats.${options.format}`
    );
  }

  async exportParticipants(evenementId: number, format: 'excel' | 'csv' = 'excel'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      API_ENDPOINTS.professionnel.exportParticipants(evenementId) + `?format=${format}`,
      `participants_event_${evenementId}.${format}`
    );
  }

  // Support
  async createTicket(ticket: SupportTicket): Promise<ApiResponse<{ ticket_id: string }>> {
    const formData = new FormData();
    formData.append('sujet', ticket.sujet);
    formData.append('categorie', ticket.categorie);
    formData.append('message', ticket.message);
    formData.append('urgence', ticket.urgence);

    if (ticket.pieces_jointes) {
      ticket.pieces_jointes.forEach((file, index) => {
        formData.append(`pieces_jointes[${index}]`, file);
      });
    }

    return httpClient.postFormData<{ ticket_id: string }>(API_ENDPOINTS.professionnel.createTicket, formData);
  }

  async getHelpFAQ(category?: string): Promise<ApiResponse<FAQItem[]>> {
    const params: FilterParams = {};
    if (category) {
      params.category = category;
    }
    return httpClient.get<FAQItem[]>(API_ENDPOINTS.professionnel.helpFaq, params);
  }
}

export const professionnelService = new ProfessionnelService();
export type {
  DashboardStats, CalendarEvent, AnalyticsOverview, AnalyticsTrends,
  Demographics, BenchmarkData, Recommendation, CollaborationSuggestion,
  ExportOptions, SupportTicket
};
