// services/admin.service.ts - VERSION CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { httpClient } from './httpClient';
import type { CurrentUser } from './auth.service';
import { Oeuvre } from '@/types';
import type { Evenement } from './evenement.service';

// Types pour les statistiques
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

interface PendingUser {
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  type_user: string;
  date_inscription: string;
  biographie?: string;
  specialites?: string[];
  statut?: string;
  statut_validation?: string;
  telephone?: string;
  entreprise?: string;
  site_web?: string;
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

interface Alert {
  id: number;
  type: 'security' | 'performance' | 'content' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  created_at: string;
  resolved: boolean;
}

// Types pour les filtres
interface OeuvreFilters extends FilterParams {
  type_oeuvre?: string;
  auteur_id?: number;
  statut?: string;
  wilaya?: string;
  prix_min?: number;
  prix_max?: number;
}

interface EvenementFilters extends FilterParams {
  type_evenement?: string;
  organisateur_id?: number;
  statut?: string;
  wilaya?: string;
  date_debut?: string;
  date_fin?: string;
}

interface PatrimoineFilters extends FilterParams {
  type_patrimoine?: string;
  wilaya?: string;
  classement?: string;
}

interface ServiceFilters extends FilterParams {
  type_service?: string;
  prestataire_id?: number;
  wilaya?: string;
  prix_min?: number;
  prix_max?: number;
  statut?: string;
}

class AdminService {
  // ========================================
  // VUE D'ENSEMBLE ET STATISTIQUES
  // ========================================

  async getOverview(): Promise<ApiResponse<OverviewStats>> {
    const response = await httpClient.get<any>(API_ENDPOINTS.dashboard.overview);

    if (response.success && response.data) {
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

  async getPatrimoineStats(): Promise<ApiResponse<PatrimoineStats>> {
    return httpClient.get<PatrimoineStats>(API_ENDPOINTS.dashboard.patrimoine.statistics);
  }

  async getOeuvres(params?: OeuvreFilters): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.getPaginated<any>('/admin/oeuvres', params);
  }

  async getOeuvreDetails(oeuvreId: number): Promise<ApiResponse<any>> {
    return httpClient.get<any>(`/admin/oeuvres/${oeuvreId}`);
  }

  async updateOeuvre(oeuvreId: number, data: Partial<any>): Promise<ApiResponse<any>> {
    return httpClient.put<any>(`/admin/oeuvres/${oeuvreId}`, data);
  }

  async deleteOeuvre(oeuvreId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/admin/oeuvres/${oeuvreId}`);
  }

  // Événements
  async getEvenements(params?: EvenementFilters): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.getPaginated<any>('/admin/evenements', params);
  }

  async getEvenementDetails(evenementId: number): Promise<ApiResponse<any>> {
    return httpClient.get<any>(`/admin/evenements/${evenementId}`);
  }

  async updateEvenement(evenementId: number, data: Partial<any>): Promise<ApiResponse<any>> {
    return httpClient.put<any>(`/admin/evenements/${evenementId}`, data);
  }

  async deleteEvenement(evenementId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/admin/evenements/${evenementId}`);
  }

  // Patrimoine
  async getPatrimoineItems(params?: PatrimoineFilters): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.getPaginated<any>('/admin/patrimoine', params);
  }

  async updatePatrimoine(patrimoineId: number, data: Partial<any>): Promise<ApiResponse<any>> {
    return httpClient.put<any>(`/admin/patrimoine/${patrimoineId}`, data);
  }

  async deletePatrimoine(patrimoineId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/admin/patrimoine/${patrimoineId}`);
  }

  // Services
  async getServices(params?: ServiceFilters): Promise<ApiResponse<PaginatedResponse<any>>> {
    return httpClient.getPaginated<any>('/admin/services', params);
  }

  async getServiceDetails(serviceId: number): Promise<ApiResponse<any>> {
    return httpClient.get<any>(`/admin/services/${serviceId}`);
  }

  async updateService(serviceId: number, data: Partial<any>): Promise<ApiResponse<any>> {
    return httpClient.put<any>(`/admin/services/${serviceId}`, data);
  }

  async deleteService(serviceId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/admin/services/${serviceId}`);
  }

  // ========================================
  // GESTION DES UTILISATEURS
  // ========================================

  async getPendingUsers(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingUser>>> {
    return httpClient.getPaginated<PendingUser>(API_ENDPOINTS.dashboard.pendingUsers, params);
  }

  /**
   * ✅ CORRIGÉ: Validation d'un utilisateur
   * Utilise PATCH /dashboard/users/:id/validate
   */
  async validateUser(userId: number, validated: boolean, reason?: string): Promise<ApiResponse<any>> {
    console.log('🔄 AdminService.validateUser appelé:', { userId, validated, reason });
    
    // La route backend attend: { valide: boolean, raison?: string }
    return httpClient.patch<any>(`/dashboard/users/${userId}/validate`, {
      valide: validated,
      raison: reason
    });
  }

  async updateUser(userId: number, data: Partial<PendingUser>): Promise<ApiResponse<PendingUser>> {
    return httpClient.put<PendingUser>(`/dashboard/users/${userId}`, data);
  }

  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/dashboard/users/${userId}`);
  }

  async suspendUser(userId: number, duration: number, reason: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(`/dashboard/users/${userId}/suspend`, {
      duree: duration,
      raison: reason
    });
  }

  async reactivateUser(userId: number): Promise<ApiResponse<PendingUser>> {
    return httpClient.post<PendingUser>(`/dashboard/users/${userId}/reactivate`, {});
  }

  async resetUserPassword(userId: number): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return httpClient.post<{ temporaryPassword: string }>(`/dashboard/users/${userId}/reset-password`, {});
  }

  async bulkUserAction(userIds: number[], action: 'activate' | 'deactivate' | 'delete' | 'change_role', roleId?: number): Promise<ApiResponse<any>> {
    return httpClient.post<any>('/dashboard/users/bulk-action', {
      user_ids: userIds,
      action,
      role_id: roleId
    });
  }

  async exportUsers(format: 'csv' | 'excel' = 'excel', filters?: any): Promise<ApiResponse<Blob>> {
    const params = { format, ...filters };
    return httpClient.download(
      `/dashboard/users/export?${new URLSearchParams(params as any).toString()}`,
      `users_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
    );
  }

  // ========================================
  // GESTION DES ŒUVRES EN ATTENTE
  // ========================================

  async getPendingOeuvres(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<PendingOeuvre>>> {
    return httpClient.getPaginated<PendingOeuvre>(API_ENDPOINTS.dashboard.pendingOeuvres, params);
  }

  async validateOeuvre(oeuvreId: number, validated: boolean, comment?: string): Promise<ApiResponse<Oeuvre>> {
    return httpClient.post<Oeuvre>(API_ENDPOINTS.dashboard.validateOeuvre(oeuvreId), {
      approved: validated,
      comment
    });
  }

  // ========================================
  // MODÉRATION
  // ========================================

  async getModerationQueue(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<ModerationItem>>> {
    return httpClient.getPaginated<ModerationItem>(API_ENDPOINTS.dashboard.moderationQueue, params);
  }

  async moderateSignalement(signalementId: number, action: 'approve' | 'reject' | 'warn', comment?: string): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.moderateSignalement(signalementId), {
      action,
      comment
    });
  }

  // ========================================
  // ALERTES ET MONITORING
  // ========================================

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    return httpClient.get<Alert[]>(API_ENDPOINTS.dashboard.monitoring.alerts);
  }

  // ========================================
  // RAPPORTS
  // ========================================

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

  // ========================================
  // CACHE
  // ========================================

  async clearCache(type?: 'all' | 'users' | 'content' | 'metadata'): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.dashboard.cache.clear, { type });
  }
}

export const adminService = new AdminService();
export type {
  OverviewStats,
  DashboardStats,
  PatrimoineStats,
  PendingUser,
  PendingOeuvre,
  ModerationItem,
  Alert,
  OeuvreFilters,
  EvenementFilters,
  PatrimoineFilters,
  ServiceFilters
};