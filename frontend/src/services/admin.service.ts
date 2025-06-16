// services/admin.service.ts - VERSION COMPLÈTE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { httpClient } from './httpClient';
import type { CurrentUser } from './auth.service';
import type { Oeuvre } from './oeuvre.service';
import type { Evenement } from './evenement.service';

// Types pour le dashboard admin
interface OverviewStats {
  users: {
    total: number;
    nouveaux_mois: number;
    actifs_jour: number;
    en_attente_validation: number;
  };
  content: {
    oeuvres_total: number;
    oeuvres_en_attente: number;
    evenements_total: number;
    evenements_actifs: number;
    sites_patrimoine: number;
    artisanats_total: number;
  };
  activity: {
    actions_jour: number;
    signalements_ouverts: number;
    commentaires_moderer: number;
  };
  growth: {
    users_growth_percent: number;
    content_growth_percent: number;
    engagement_growth_percent: number;
  };
}

interface DashboardStats {
  periode: string;
  stats: {
    total_users: number;
    new_users: number;
    active_users: number;
    total_content: number;
    pending_validations: number;
    total_reports: number;
  };
  charts: {
    users_by_day: Array<{ date: string; count: number }>;
    content_by_type: Record<string, number>;
    activity_heatmap: Array<{ hour: number; day: number; value: number }>;
  };
}

interface PatrimoineStats {
  total_sites: number;
  sites_par_type: Record<string, number>;
  sites_par_wilaya: Array<{ wilaya: string; count: number }>;
  sites_unesco: number;
  visites_mois: number;
}

interface QRStats {
  total_scans: number;
  scans_by_site: Array<{ site_id: number; site_name: string; scans: number }>;
  scans_by_day: Array<{ date: string; count: number }>;
  unique_visitors: number;
}

interface PendingUser {
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  id_type_user: number;
  date_inscription: string;
  biographie?: string;
  specialites?: string[];
  portfolio?: string[];
  statut?: string;
  statut_validation?: string;
  telephone?: string;
  entreprise?: string;
  site_web?: string;
  wilaya_residence?: number;
}

interface PendingOeuvre {
  id_oeuvre: number;
  titre: string;
  description: string;
  type_oeuvre: string;
  auteur: {
    id: number;
    nom: string;
    prenom: string;
  };
  date_creation: string;
  medias?: Array<{ url: string }>;
}

interface UserStats {
  total: number;
  par_type: Record<string, number>;
  par_statut: Record<string, number>;
  nouvelles_inscriptions: Array<{ date: string; count: number }>;
  taux_retention: number;
}

interface GeographicDistribution {
  par_wilaya: Array<{
    wilaya_id: number;
    wilaya_nom: string;
    nombre_users: number;
    pourcentage: number;
  }>;
  top_villes: Array<{
    ville: string;
    count: number;
  }>;
}

interface ContentStats {
  oeuvres: {
    total: number;
    par_type: Record<string, number>;
    par_statut: Record<string, number>;
  };
  evenements: {
    total: number;
    actifs: number;
    participants_total: number;
  };
  patrimoine: {
    total: number;
    par_classement: Record<string, number>;
  };
}

interface TopContributor {
  user_id: number;
  nom: string;
  prenom: string;
  id_type_user: number;
  stats: {
    oeuvres: number;
    evenements: number;
    note_moyenne: number;
  };
}

interface ModerationItem {
  id: number;
  type: 'commentaire' | 'oeuvre' | 'evenement' | 'user';
  entity_id: number;
  entity_title: string;
  reason: string;
  reported_by: {
    id: number;
    nom: string;
  };
  date_signalement: string;
  status: 'pending' | 'reviewed' | 'resolved';
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
  timestamp: string;
}

interface Alert {
  id: number;
  type: 'security' | 'performance' | 'content' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  created_at: string;
  resolved: boolean;
}

class AdminService {
  // Vue d'ensemble
  async getOverview(): Promise<ApiResponse<OverviewStats>> {
    const response = await httpClient.get<any>(API_ENDPOINTS.dashboard.overview);
    
    if (response.success && response.data) {
      // Transformer les données de l'API vers le format attendu
      const apiData = response.data;
      const transformedData: OverviewStats = {
        users: {
          total: apiData.stats?.totalUsers || 0,
          nouveaux_mois: apiData.stats?.newUsersToday || 0,
          actifs_jour: apiData.stats?.newUsersToday || 0,
          en_attente_validation: apiData.pending?.professionnelsEnAttente || 0
        },
        content: {
          oeuvres_total: apiData.stats?.totalOeuvres || 0,
          oeuvres_en_attente: apiData.pending?.oeuvresEnAttente || 0,
          evenements_total: apiData.stats?.totalEvenements || 0,
          evenements_actifs: 0,
          sites_patrimoine: apiData.stats?.sitesPatrimoniaux || 0,
          artisanats_total: apiData.stats?.totalArtisanats || 0
        },
        activity: {
          actions_jour: apiData.stats?.vuesAujourdhui || 0,
          signalements_ouverts: apiData.pending?.signalementsEnAttente || 0,
          commentaires_moderer: 0
        },
        growth: {
          users_growth_percent: 0,
          content_growth_percent: 0,
          engagement_growth_percent: 0
        }
      };
      
      return {
        success: true,
        data: transformedData
      };
    }
    
    return response;
  }

  async getStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<DashboardStats>> {
    return httpClient.get<DashboardStats>(API_ENDPOINTS.dashboard.stats, { period });
  }

  // Patrimoine
  async getPatrimoineStats(): Promise<ApiResponse<PatrimoineStats>> {
    return httpClient.get<PatrimoineStats>(API_ENDPOINTS.dashboard.patrimoine);
  }

  async getQRStats(period?: string): Promise<ApiResponse<QRStats>> {
    return httpClient.get<QRStats>(API_ENDPOINTS.dashboard.qrStats, { period });
  }

  async getParcoursStats(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.parcours);
  }

  // Utilisateurs
  async getPendingUsers(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingUser>>> {
    return httpClient.getPaginated<PendingUser>(API_ENDPOINTS.dashboard.pendingUsers, params);
  }

  async getUsersStats(): Promise<ApiResponse<UserStats>> {
    return httpClient.get<UserStats>(API_ENDPOINTS.dashboard.usersStats);
  }

  async getGeographicDistribution(): Promise<ApiResponse<GeographicDistribution>> {
    return httpClient.get<GeographicDistribution>(API_ENDPOINTS.dashboard.geographic);
  }

  // Contenu
  async getPendingOeuvres(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingOeuvre>>> {
    return httpClient.getPaginated<PendingOeuvre>(API_ENDPOINTS.dashboard.pendingOeuvres, params);
  }

  async getContentStats(): Promise<ApiResponse<ContentStats>> {
    return httpClient.get<ContentStats>(API_ENDPOINTS.dashboard.contentStats);
  }

  async getTopContributors(limit: number = 10): Promise<ApiResponse<TopContributor[]>> {
    return httpClient.get<TopContributor[]>(API_ENDPOINTS.dashboard.topContributors, { limit });
  }

  // Modération
  async getModerationQueue(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<ModerationItem>>> {
    return httpClient.getPaginated<ModerationItem>(API_ENDPOINTS.dashboard.moderationQueue, params);
  }

  async getSignalements(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<ModerationItem>>> {
    return httpClient.getPaginated<ModerationItem>(API_ENDPOINTS.dashboard.signalements, params);
  }

  async getModerationStats(): Promise<ApiResponse<{
    total_pending: number;
    by_type: Record<string, number>;
    response_time_avg: number;
    resolution_rate: number;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.moderationStats);
  }

  // Actions
  async performAction(action: string, data: any): Promise<ApiResponse<any>> {
    return httpClient.post<any>(API_ENDPOINTS.dashboard.performAction, { action, ...data });
  }

  async bulkActions(actions: Array<{ action: string; entity_type: string; entity_ids: number[] }>): Promise<ApiResponse<{
    successful: number;
    failed: number;
    errors: Array<{ entity_id: number; error: string }>;
  }>> {
    return httpClient.post<any>(API_ENDPOINTS.dashboard.bulkActions, { actions });
  }

  // Validation utilisateur avec PATCH
  async validateUser(userId: number, validated: boolean, comment?: string): Promise<ApiResponse<CurrentUser>> {
    return httpClient.patch<CurrentUser>(`/dashboard/users/${userId}/validate`, {
      valide: validated,
      raison: comment
    });
  }

  async validateOeuvre(oeuvreId: number, validated: boolean, comment?: string): Promise<ApiResponse<Oeuvre>> {
    return httpClient.post<Oeuvre>(API_ENDPOINTS.dashboard.validateOeuvre(oeuvreId), {
      approved: validated,
      comment
    });
  }

  async moderateSignalement(signalementId: number, action: 'approve' | 'reject' | 'warn', comment?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.moderateSignalement(signalementId), {
      action,
      comment
    });
  }

  // ========================================
  // NOUVELLES MÉTHODES POUR EDIT/DELETE
  // ========================================

  // Obtenir les détails d'un utilisateur
  async getUserDetails(userId: number): Promise<ApiResponse<PendingUser>> {
    return httpClient.get<PendingUser>(`/dashboard/users/${userId}`);
  }

  // Mettre à jour un utilisateur
  async updateUser(userId: number, data: Partial<PendingUser>): Promise<ApiResponse<PendingUser>> {
    return httpClient.put<PendingUser>(`/dashboard/users/${userId}`, data);
  }

  // Supprimer un utilisateur
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/dashboard/users/${userId}`);
  }

  // Suspendre temporairement un utilisateur
  async suspendUser(userId: number, duration: number, reason: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/dashboard/users/${userId}/suspend`, {
      duree: duration,
      raison: reason
    });
  }

  // Réactiver un utilisateur suspendu
  async reactivateUser(userId: number): Promise<ApiResponse<PendingUser>> {
    return httpClient.post<PendingUser>(`/dashboard/users/${userId}/reactivate`, {});
  }

  // Changer le rôle d'un utilisateur
  async changeUserRole(userId: number, roleId: number): Promise<ApiResponse<PendingUser>> {
    return httpClient.put<PendingUser>(`/dashboard/users/${userId}/role`, {
      role_id: roleId
    });
  }

  // Réinitialiser le mot de passe d'un utilisateur
  async resetUserPassword(userId: number): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return httpClient.post<{ temporaryPassword: string }>(`/dashboard/users/${userId}/reset-password`, {});
  }

  // Rechercher des utilisateurs
  async searchUsers(query: string, type: 'nom' | 'email' | 'telephone' = 'nom'): Promise<ApiResponse<PendingUser[]>> {
    return httpClient.get<PendingUser[]>('/dashboard/users/search', { q: query, type });
  }

  // Actions en masse
  async bulkUserAction(userIds: number[], action: 'activate' | 'deactivate' | 'delete' | 'change_role', roleId?: number): Promise<ApiResponse<any>> {
    return httpClient.post<any>('/dashboard/users/bulk-action', {
      user_ids: userIds,
      action,
      role_id: roleId
    });
  }

  // Export des utilisateurs
  async exportUsers(format: 'csv' | 'excel' = 'excel', filters?: {
    id_type_user?: number;
    statut?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<Blob>> {
    const params = { format, ...filters };
    return httpClient.download(
      `/dashboard/users/export?${new URLSearchParams(params as any).toString()}`,
      `users_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
    );
  }

  // Analytics avancées
  async getAdvancedAnalytics(params?: {
    metrics: string[];
    period: string;
    breakdown?: string;
  }): Promise<ApiResponse<any>> {
    if (!params) {
      return httpClient.get<any>(API_ENDPOINTS.dashboard.advancedAnalytics);
    }
    
    const filterParams: FilterParams = {
      metrics: params.metrics.join(','),
      period: params.period,
      ...(params.breakdown && { breakdown: params.breakdown })
    };
    
    return httpClient.get<any>(API_ENDPOINTS.dashboard.advancedAnalytics, filterParams);
  }

  async getRetentionAnalysis(cohort_period: 'day' | 'week' | 'month' = 'month'): Promise<ApiResponse<{
    cohorts: Array<{
      period: string;
      users: number;
      retention_by_period: number[];
    }>;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.retention, { cohort_period });
  }

  async getFunnelAnalysis(funnel_type: 'registration' | 'content_creation' | 'event_participation'): Promise<ApiResponse<{
    steps: Array<{
      name: string;
      users: number;
      conversion_rate: number;
    }>;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.funnel, { funnel_type });
  }

  async getEngagementMetrics(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.engagement);
  }

  // Audit et logs
  async getAuditLogs(params?: FilterParams & {
    user_id?: number;
    action?: string;
    entity_type?: string;
  }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    return httpClient.getPaginated<AuditLog>(API_ENDPOINTS.dashboard.auditLogs, params);
  }

  async getUserAudit(userId: number): Promise<ApiResponse<AuditLog[]>> {
    return httpClient.get<AuditLog[]>(API_ENDPOINTS.dashboard.userAudit(userId));
  }

  // Rapports
  async getActivityReport(period: string): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.dashboard.activityReport}?period=${period}`,
      `rapport_activite_${period}.pdf`
    );
  }

  async getModerationReport(period: string): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.dashboard.moderationReport}?period=${period}`,
      `rapport_moderation_${period}.pdf`
    );
  }

  async getPatrimoineReport(): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      API_ENDPOINTS.dashboard.patrimoineReport,
      `rapport_patrimoine.pdf`
    );
  }

  // Configuration
  async getPermissions(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.permissions);
  }

  async updatePermissions(permissions: any): Promise<ApiResponse<any>> {
    return httpClient.put<any>(API_ENDPOINTS.dashboard.permissions, permissions);
  }

  async getMetrics(): Promise<ApiResponse<any>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.metrics);
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return httpClient.get<any[]>(API_ENDPOINTS.dashboard.notifications);
  }

  async broadcastNotification(data: {
    title: string;
    message: string;
    target: 'all' | 'professionals' | 'visitors' | number[];
    type: string;
  }): Promise<ApiResponse<{ sent_count: number }>> {
    return httpClient.post<any>(API_ENDPOINTS.dashboard.broadcastNotification, data);
  }

  // Monitoring
  async getHealthStatus(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; latency: number }>;
    database: { connected: boolean; latency: number };
    storage: { available: boolean; usage_percent: number };
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.monitoring.health);
  }

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    return httpClient.get<Alert[]>(API_ENDPOINTS.dashboard.monitoring.alerts);
  }

  // Cache
  async clearCache(type?: 'all' | 'users' | 'content' | 'metadata'): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.cache.clear, { type });
  }

  async getCacheStatus(): Promise<ApiResponse<{
    size: number;
    entries: number;
    hit_rate: number;
    by_type: Record<string, { size: number; entries: number }>;
  }>> {
    return httpClient.get<any>(API_ENDPOINTS.dashboard.cache.status);
  }
}

export const adminService = new AdminService();
export type {
  OverviewStats,
  DashboardStats,
  PatrimoineStats,
  QRStats,
  PendingUser,
  PendingOeuvre,
  UserStats,
  GeographicDistribution,
  ContentStats,
  TopContributor,
  ModerationItem,
  AuditLog,
  Alert
};