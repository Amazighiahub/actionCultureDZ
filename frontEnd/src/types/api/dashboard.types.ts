// types/api/dashboard.types.ts
// Types pour les réponses API du dashboard

import type { TranslatableValue } from '../common/multilingual.types';

// ============================================
// RÉSUMÉS (utilisés dans les listes)
// ============================================

export interface PatrimoineSiteSummary {
  id: number;
  nom: TranslatableValue | string;
  type: string;
  wilaya: string;
  image_url: string | null;
  date_ajout: string;
}

export interface DashboardUserSummary {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface DashboardContentSummary {
  id: number;
  titre: TranslatableValue | string;
  type: string;
  date_creation: string;
}

export interface CreatorMetrics {
  oeuvres_count: number;
  views_total: number;
  avg_rating: number;
}

export interface EngagementMetric {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface TopContributor {
  user: DashboardUserSummary;
  oeuvres_count: number;
  total_views: number;
}

export interface ModerationItem {
  id: number;
  type: string;
  entity_type: string;
  entity_id: number;
  title: string;
  reporter: DashboardUserSummary | null;
  date: string;
  status: string;
}

export interface BulkActionResult {
  entity_id: number;
  success: boolean;
  error?: string;
}

// ============================================
// STATS ENDPOINTS
// ============================================

export interface ParcoursStats {
  total: number;
  by_wilaya: Array<{ wilaya: string; count: number }>;
  popular: Array<{ id: number; nom: string; visits: number }>;
  recent_activity: Array<{ date: string; count: number }>;
}

export interface UsersStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  registrations_trend: Array<{ date: string; count: number }>;
}

export interface GeographicDistribution {
  by_wilaya: Array<{ wilaya: string; users: number; content: number }>;
}

export interface ContentStats {
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  creation_trend: Array<{ date: string; count: number }>;
  top_categories: Array<{ category: string; count: number }>;
}

export interface ModerationStats {
  pending: number;
  resolved: number;
  dismissed: number;
  avg_resolution_time: number;
}

// ============================================
// ANALYTICS
// ============================================

export interface RetentionAnalysis {
  cohorts: Array<{ period: string; users: number; retained: number }>;
  retention_rates: Array<{ period: string; rate: number }>;
  churn_rate: number;
}

export interface FunnelAnalysis {
  steps: Array<{ name: string; count: number; drop_rate: number }>;
}

export interface EngagementMetrics {
  daily: Array<{ date: string; value: number }>;
  weekly: Array<{ week: string; value: number }>;
  by_content_type: Record<string, number>;
}

export interface CacheStatus {
  size: number;
  entries: number;
  hit_rate: number;
  last_cleared: string;
}

// ============================================
// ADMIN — réponses API brutes
// ============================================

export interface OverviewApiRawResponse {
  stats: {
    totalUsers: number;
    newUsersToday: number;
    totalOeuvres: number;
    totalEvenements: number;
    sitesPatrimoniaux: number;
    totalArtisanats: number;
    vuesAujourdhui: number;
  };
  pending: {
    professionnelsEnAttente: number;
    oeuvresEnAttente: number;
    signalementsEnAttente: number;
  };
}

export interface BulkUserActionResponse {
  affected: number;
  results: Array<{ user_id: number; success: boolean; error?: string }>;
}
