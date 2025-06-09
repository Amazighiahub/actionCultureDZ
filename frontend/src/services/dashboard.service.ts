// src/services/dashboard.service.ts

import { apiService } from './api.service';

// Types pour le dashboard
export interface DashboardStats {
  users: {
    total: number;
    newToday: number;
    activeToday: number;
    pendingValidation: number;
    growth: number;
  };
  content: {
    totalOeuvres: number;
    pendingOeuvres: number;
    totalEvenements: number;
    upcomingEvenements: number;
    totalArtisanat: number;
  };
  activity: {
    visitsToday: number;
    visitsGrowth: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  moderation: {
    pendingReports: number;
    resolvedToday: number;
    avgResponseTime: number;
  };
}

export interface PendingItem {
  id: number;
  type: 'user' | 'oeuvre' | 'evenement';
  title: string;
  author: string;
  date: string;
  status: 'pending' | 'urgent';
}

export interface RecentActivity {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'create' | 'update' | 'delete' | 'moderate';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

class DashboardService {
  // Obtenir les statistiques générales
  async getOverview(): Promise<DashboardStats> {
    const response = await apiService.get<DashboardStats>('/admin/dashboard/overview');
    if (response.success && response.data) {
      return response.data;
    }
    
    // Retourner des données par défaut si l'API n'existe pas encore
    return {
      users: {
        total: 0,
        newToday: 0,
        activeToday: 0,
        pendingValidation: 0,
        growth: 0
      },
      content: {
        totalOeuvres: 0,
        pendingOeuvres: 0,
        totalEvenements: 0,
        upcomingEvenements: 0,
        totalArtisanat: 0
      },
      activity: {
        visitsToday: 0,
        visitsGrowth: 0,
        avgSessionDuration: 0,
        bounceRate: 0
      },
      moderation: {
        pendingReports: 0,
        resolvedToday: 0,
        avgResponseTime: 0
      }
    };
  }

  // Obtenir les éléments en attente
  async getPendingItems(): Promise<PendingItem[]> {
    const response = await apiService.get<PendingItem[]>('/admin/dashboard/pending');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Obtenir l'activité récente
  async getRecentActivity(): Promise<RecentActivity[]> {
    const response = await apiService.get<RecentActivity[]>('/admin/dashboard/activity');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  // Obtenir les données pour les graphiques
  async getChartData(type: 'users' | 'content' | 'visits', days: number = 30): Promise<ChartData> {
    const response = await apiService.get<ChartData>(`/admin/dashboard/charts/${type}?days=${days}`);
    if (response.success && response.data) {
      return response.data;
    }
    
    // Données par défaut
    return {
      labels: [],
      datasets: []
    };
  }

  // Obtenir les utilisateurs en attente de validation
  async getPendingUsers(page: number = 1, limit: number = 10) {
    const response = await apiService.get(`/admin/users/pending?page=${page}&limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { users: [], total: 0 };
  }

  // Valider un utilisateur professionnel
  async validateUser(userId: number, approved: boolean, reason?: string) {
    const response = await apiService.post(`/admin/users/${userId}/validate`, {
      approved,
      reason
    });
    return response;
  }

  // Obtenir les contenus en attente
  async getPendingContent(type: 'oeuvres' | 'evenements', page: number = 1, limit: number = 10) {
    const response = await apiService.get(`/admin/content/${type}/pending?page=${page}&limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { items: [], total: 0 };
  }

  // Valider un contenu
  async validateContent(type: 'oeuvres' | 'evenements', contentId: number, approved: boolean, reason?: string) {
    const response = await apiService.post(`/admin/content/${type}/${contentId}/validate`, {
      approved,
      reason
    });
    return response;
  }

  // Obtenir les signalements
  async getReports(status: 'pending' | 'resolved' | 'all' = 'pending', page: number = 1, limit: number = 10) {
    const response = await apiService.get(`/admin/reports?status=${status}&page=${page}&limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { reports: [], total: 0 };
  }

  // Traiter un signalement
  async handleReport(reportId: number, action: 'dismiss' | 'warn' | 'delete' | 'ban', notes?: string) {
    const response = await apiService.post(`/admin/reports/${reportId}/handle`, {
      action,
      notes
    });
    return response;
  }

  // Recherche globale dans l'admin
  async searchAdmin(query: string, type?: 'users' | 'content' | 'all') {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    
    const response = await apiService.get(`/admin/search?${params.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { results: [] };
  }

  // Exporter des données
  async exportData(type: 'users' | 'content' | 'activity', format: 'csv' | 'excel' = 'csv', filters?: any) {
    const params = new URLSearchParams({ format });
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
    }
    
    const response = await apiService.get(`/admin/export/${type}?${params.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Erreur lors de l\'export');
  }

  // Obtenir les logs d'audit
  async getAuditLogs(page: number = 1, limit: number = 50, filters?: any) {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    });
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
    }
    
    const response = await apiService.get(`/admin/audit-logs?${params.toString()}`);
    if (response.success && response.data) {
      return response.data;
    }
    return { logs: [], total: 0 };
  }
}

export const dashboardService = new DashboardService();