// services/professionnel.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { httpClient } from './httpClient';
import { Evenement } from '@/types/models/evenement.types';
import { Artisanat } from '@/types/models/oeuvres-specialisees.types';
import { Notification } from '@/types/models/notification.types';
import type { EntityStatsResponse, CalendarEventData } from '@/types/api/professionnel.types';

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


class ProfessionnelService {
  // Dashboard
  async getDashboard(): Promise<ApiResponse<DashboardStats>> {
    return httpClient.get<DashboardStats>(API_ENDPOINTS.professionnel.dashboard);
  }

  async getNotifications(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return httpClient.getPaginated<Notification>(API_ENDPOINTS.professionnel.notifications, params);
  }

  async getOeuvreStats(id: number): Promise<ApiResponse<EntityStatsResponse>> {
    return httpClient.get<EntityStatsResponse>(API_ENDPOINTS.professionnel.oeuvreStats(id));
  }

  // Artisanats
  async getArtisanats(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Artisanat>>> {
    return httpClient.getPaginated<Artisanat>(API_ENDPOINTS.professionnel.artisanats, params);
  }

  // Événements
  async getEvenements(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Evenement>>> {
    return httpClient.getPaginated<Evenement>(API_ENDPOINTS.professionnel.evenements, params);
  }

  async getEvenementStats(id: number): Promise<ApiResponse<EntityStatsResponse>> {
    return httpClient.get<EntityStatsResponse>(API_ENDPOINTS.professionnel.evenementStats(id));
  }

  async exportParticipants(evenementId: number, format: 'excel' | 'csv' = 'excel'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      API_ENDPOINTS.professionnel.exportParticipants(evenementId) + `?format=${format}`,
      `participants_evenement_${evenementId}.${format === 'excel' ? 'xlsx' : 'csv'}`
    );
  }
}

export const professionnelService = new ProfessionnelService();
export type {
  DashboardStats, CalendarEvent, AnalyticsOverview, AnalyticsTrends,
  Demographics, BenchmarkData, Recommendation, CollaborationSuggestion,
  ExportOptions, SupportTicket
};
