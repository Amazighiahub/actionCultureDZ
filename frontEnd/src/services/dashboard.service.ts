// services/dashboard.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { httpClient } from './httpClient';


interface OverviewStats {
  users: {
    total: number;
    new_today: number;
    new_week: number;
    active_month: number;
    by_type: Record<string, number>;
  };
  content: {
    oeuvres_total: number;
    evenements_total: number;
    sites_patrimoine: number;
    pending_validation: number;
  };
  engagement: {
    views_today: number;
    interactions_week: number;
    average_session: number;
    bounce_rate: number;
  };
  system: {
    server_status: 'healthy' | 'warning' | 'error';
    api_response_time: number;
    error_rate: number;
    disk_usage: number;
  };
}

interface DetailedStats {
  period: string;
  metrics: {
    users: Array<{ date: string; count: number; type: string }>;
    content: Array<{ date: string; count: number; type: string }>;
    engagement: Array<{ date: string; views: number; interactions: number }>;
  };
  comparisons: {
    vs_last_period: Record<string, number>;
    growth_rate: Record<string, number>;
  };
}

interface PatrimoineStats {
  total_sites: number;
  sites_by_type: Record<string, number>;
  sites_by_wilaya: Array<{ wilaya: string; count: number }>;
  recent_additions: Array<any>;
  popular_sites: Array<any>;
}

interface QRStats {
  total_scans: number;
  scans_by_day: Array<{ date: string; count: number }>;
  top_scanned_sites: Array<{ site: string; scans: number }>;
  scan_locations: Array<{ wilaya: string; count: number }>;
}

interface PendingUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  type_user: string;
  date_demande: string;
  documents?: string[];
}

interface PendingOeuvre {
  id: number;
  titre: string;
  type: string;
  auteur: { id: number; nom: string; prenom: string };
  date_soumission: string;
  medias?: string[];
}

interface Signalement {
  id: number;
  type: string;
  entity_type: string;
  entity_id: number;
  entity_title: string;
  motif: string;
  description: string;
  reporter: { id: number; nom: string };
  date_signalement: string;
  statut: string;
  priorite: string;
}

interface ModerationAction {
  action: 'approve' | 'reject' | 'suspend' | 'delete';
  entity_type: 'user' | 'oeuvre' | 'commentaire' | 'evenement';
  entity_ids: number[];
  reason?: string;
  duration?: number; // Pour suspension
  notify_user?: boolean;
}

interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  details: any;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

interface AdvancedAnalytics {
  user_behavior: {
    avg_session_duration: number;
    pages_per_session: number;
    most_visited_sections: Array<{ section: string; visits: number }>;
    user_flow: Array<{ from: string; to: string; count: number }>;
  };
  content_performance: {
    top_creators: Array<{ user: any; metrics: any }>;
    viral_content: Array<{ content: any; shares: number; reach: number }>;
    engagement_by_type: Record<string, any>;
  };
  geographic_insights: {
    active_regions: Array<{ wilaya: string; users: number; content: number }>;
    growth_regions: Array<{ wilaya: string; growth_rate: number }>;
  };
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    database: { status: string; latency: number };
    redis: { status: string; memory_usage: number };
    storage: { status: string; available_space: number };
    api: { status: string; response_time: number };
  };
  recent_errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    count: number;
  }>;
}

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

class DashboardService {
  // Vue d'ensemble
  async getOverview(): Promise<ApiResponse<OverviewStats>> {
    return httpClient.get<OverviewStats>(API_ENDPOINTS.dashboard.overview);
  }

  async getStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<DetailedStats>> {
    return httpClient.get<DetailedStats>(API_ENDPOINTS.dashboard.stats, { period });
  }

  // Patrimoine
  async getPatrimoineStats(): Promise<ApiResponse<PatrimoineStats>> {
    return httpClient.get<PatrimoineStats>(API_ENDPOINTS.dashboard.patrimoine.statistics);
  }

  async getQRStats(period?: string): Promise<ApiResponse<QRStats>> {
    return httpClient.get<QRStats>(
      API_ENDPOINTS.dashboard.qrStats, 
      period ? { period } : undefined
    );
  }

  async getParcoursStats(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.parcours);
  }

  // Utilisateurs
  async getPendingUsers(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingUser>>> {
    return httpClient.getPaginated<PendingUser>(API_ENDPOINTS.dashboard.pendingUsers, params);
  }

  async getUsersStats(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.usersStats);
  }

  async getGeographicDistribution(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.geographic);
  }

  // Contenu
  async getPendingOeuvres(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingOeuvre>>> {
    return httpClient.getPaginated<PendingOeuvre>(API_ENDPOINTS.dashboard.pendingOeuvres, params);
  }

  async getContentStats(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.contentStats);
  }

  async getTopContributors(limit: number = 10): Promise<ApiResponse<any[]>> {
    return httpClient.get<any[]>(API_ENDPOINTS.dashboard.topContributors, { limit });
  }

  // Modération
  async getModerationQueue(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.getPaginated<any>(API_ENDPOINTS.dashboard.moderationQueue, params);
  }

  async getSignalements(params?: FilterParams & { priorite?: string }): Promise<ApiResponse<PaginatedResponse<Signalement>>> {
    return httpClient.getPaginated<Signalement>(API_ENDPOINTS.dashboard.signalements, params);
  }

  async getModerationStats(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.moderationStats);
  }

  // Actions
  async performAction(action: ModerationAction): Promise<ApiResponse<{ affected: number }>> {
    return httpClient.post<any>(API_ENDPOINTS.dashboard.performAction, action);
  }

  async performBulkActions(actions: ModerationAction[]): Promise<ApiResponse<{ total_affected: number; results: any[] }>> {
    return httpClient.post<any>(API_ENDPOINTS.dashboard.bulkActions, { actions });
  }

  async validateUser(id: number, approved: boolean, comment?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.validateUser(id), {
      approved,
      comment
    });
  }

  async validateOeuvre(id: number, approved: boolean, comment?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.validateOeuvre(id), {
      approved,
      comment
    });
  }

  async moderateSignalement(id: number, action: 'resolve' | 'escalate' | 'dismiss', notes?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.moderateSignalement(id), {
      action,
      notes
    });
  }

  async suspendUser(id: number, duration: number, reason: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.suspendUser(id), {
      duration_days: duration,
      reason
    });
  }

  // Analytics avancées
  async getAdvancedAnalytics(section?: string): Promise<ApiResponse<AdvancedAnalytics>> {
    return httpClient.get<AdvancedAnalytics>(
      API_ENDPOINTS.dashboard.advancedAnalytics, 
      section ? { section } : undefined
    );
  }

  async getRetentionAnalysis(cohort?: string): Promise<ApiResponse<any>> {
    return httpClient.get<any>(
      API_ENDPOINTS.dashboard.retention, 
      cohort ? { cohort } : undefined
    );
  }

  async getFunnelAnalysis(funnel_type: string): Promise<ApiResponse<any>> {
    return httpClient.get<any>(
      API_ENDPOINTS.dashboard.funnel, 
      { type: funnel_type }
    );
  }

  async getEngagementMetrics(period?: string): Promise<ApiResponse<any>> {
    return httpClient.get<any>(
      API_ENDPOINTS.dashboard.engagement, 
      period ? { period } : undefined
    );
  }

  // Audit
  async getAuditLogs(params?: FilterParams & { user_id?: number; action?: string }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    return httpClient.getPaginated<AuditLog>(API_ENDPOINTS.dashboard.auditLogs, params);
  }

  async getUserAudit(userId: number, params?: FilterParams): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    return httpClient.getPaginated<AuditLog>(API_ENDPOINTS.dashboard.userAudit(userId), params);
  }

  // Rapports
  async generateActivityReport(period: string, format: 'pdf' | 'excel' = 'pdf'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.dashboard.activityReport}?period=${period}&format=${format}`,
      `activity_report_${period}.${format}`
    );
  }

  async generateModerationReport(period: string, format: 'pdf' | 'excel' = 'pdf'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.dashboard.moderationReport}?period=${period}&format=${format}`,
      `moderation_report_${period}.${format}`
    );
  }

  async generatePatrimoineReport(format: 'pdf' | 'excel' = 'pdf'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.dashboard.patrimoineReport}?format=${format}`,
      `patrimoine_report.${format}`
    );
  }

  // Configuration
  

 

 

  // Monitoring
  

  async getAlerts(active_only: boolean = true): Promise<ApiResponse<Alert[]>> {

    return httpClient.get<Alert[]>(API_ENDPOINTS.dashboard.monitoring?.alerts || API_ENDPOINTS.dashboard.signalements, { active_only });
  }

  // Cache
  async clearCache(type?: 'all' | 'users' | 'content' | 'static'): Promise<ApiResponse<{ cleared: string[] }>> {
   
    return httpClient.post<any>(API_ENDPOINTS.dashboard.cache.clear, { type: type || 'all' });
  }

  async getCacheStatus(): Promise<ApiResponse<{
    size: number;
    entries: number;
    hit_rate: number;
    last_cleared: string;
  }>> {
   
    return httpClient.get<any>(API_ENDPOINTS.dashboard.cache.status);
  }
}

export const dashboardService = new DashboardService();
export type { 
  OverviewStats, DetailedStats, PatrimoineStats, QRStats, 
  PendingUser, PendingOeuvre, Signalement, ModerationAction, 
  AuditLog, AdvancedAnalytics, SystemHealth, Alert 
};