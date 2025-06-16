// hooks/useDashboardPro.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { professionnelService } from '@/services/professionnel.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';
import { artisanatService } from '@/services/artisanat.service';
import type {
  DashboardStats,
  CalendarEvent,
  AnalyticsOverview,
  BenchmarkData,
  Recommendation
} from '@/services/professionnel.service';
import { useToast } from '@/components/ui/use-toast';
import type { FilterParams } from '@/config/api';

interface UseDashboardProOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useDashboardPro(options: UseDashboardProOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Dashboard principal
  const {
    data: dashboardStats,
    isLoading: loadingStats,
    error: errorStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboard-pro-stats'],
    queryFn: async () => {
      const response = await professionnelService.getDashboard();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    refetchInterval: refreshInterval,
  });

  // Calendrier
  const {
    data: calendarEvents,
    isLoading: loadingCalendar,
    refetch: refetchCalendar
  } = useQuery({
    queryKey: ['dashboard-pro-calendar', new Date().getMonth(), new Date().getFullYear()],
    queryFn: async () => {
      const response = await professionnelService.getCalendar();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 10 * 60 * 1000,
  });

  // Analytics
  const {
    data: analytics,
    isLoading: loadingAnalytics,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['dashboard-pro-analytics', selectedPeriod],
    queryFn: async () => {
      const response = await professionnelService.getAnalyticsOverview(selectedPeriod);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 10 * 60 * 1000,
  });

  // Benchmark
  const {
    data: benchmark,
    isLoading: loadingBenchmark,
    refetch: refetchBenchmark
  } = useQuery({
    queryKey: ['dashboard-pro-benchmark'],
    queryFn: async () => {
      const response = await professionnelService.getBenchmark();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: false, // Désactivé par défaut car lourd
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Recommandations
  const {
    data: recommendations,
    isLoading: loadingRecommendations,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['dashboard-pro-recommendations'],
    queryFn: async () => {
      const response = await professionnelService.getRecommendations();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 60 * 60 * 1000, // 1 heure
  });

  // Mes œuvres
  const {
    data: mesOeuvres,
    isLoading: loadingOeuvres,
    refetch: refetchOeuvres
  } = useQuery({
    queryKey: ['dashboard-pro-oeuvres'],
    queryFn: async () => {
      const response = await oeuvreService.getMyWorks({ limit: 10 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes événements
  const {
    data: mesEvenements,
    isLoading: loadingEvenements,
    refetch: refetchEvenements
  } = useQuery({
    queryKey: ['dashboard-pro-evenements'],
    queryFn: async () => {
      const response = await professionnelService.getEvenements({ limit: 10 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes artisanats (si applicable)
  const {
    data: mesArtisanats,
    isLoading: loadingArtisanats,
    refetch: refetchArtisanats
  } = useQuery({
    queryKey: ['dashboard-pro-artisanats'],
    queryFn: async () => {
      const response = await professionnelService.getArtisanats({ limit: 10 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: false, // Désactivé par défaut, activer si artisan
    staleTime: 5 * 60 * 1000,
  });

  // Notifications
  const {
    data: notifications,
    isLoading: loadingNotifications,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['dashboard-pro-notifications'],
    queryFn: async () => {
      const response = await professionnelService.getNotifications({ limit: 5 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh toutes les 5 minutes
  });

  // Mutation pour export
  const exportMutation = useMutation({
    mutationFn: async (params: {
      type: 'oeuvres' | 'evenements' | 'artisanats' | 'all';
      format: 'excel' | 'pdf' | 'csv';
      dateDebut?: string;
      dateFin?: string;
    }) => {
      let response;
      switch (params.type) {
        case 'oeuvres':
          response = await professionnelService.exportOeuvres({
            format: params.format,
            date_debut: params.dateDebut,
            date_fin: params.dateFin,
            include_stats: true
          });
          break;
        case 'evenements':
          response = await professionnelService.exportEvenements({
            format: params.format,
            date_debut: params.dateDebut,
            date_fin: params.dateFin,
            include_stats: true
          });
          break;
        case 'artisanats':
          response = await professionnelService.exportArtisanats({
            format: params.format,
            date_debut: params.dateDebut,
            date_fin: params.dateFin,
            include_stats: true
          });
          break;
        default:
          response = await professionnelService.exportData({
            format: params.format,
            date_debut: params.dateDebut,
            date_fin: params.dateFin,
            include_stats: true
          });
      }
      
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Export réussi",
        description: "Le fichier a été téléchargé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'export",
        description: error.message || "Impossible d'exporter les données",
        variant: "destructive",
      });
    }
  });

  // Fonction pour charger les statistiques détaillées d'une œuvre
  const getOeuvreStats = useCallback(async (oeuvreId: number) => {
    const response = await professionnelService.getOeuvreStats(oeuvreId);
    if (!response.success) throw new Error(response.error);
    return response.data;
  }, []);

  // Fonction pour charger les statistiques détaillées d'un événement
  const getEvenementStats = useCallback(async (evenementId: number) => {
    const response = await professionnelService.getEvenementStats(evenementId);
    if (!response.success) throw new Error(response.error);
    return response.data;
  }, []);

  // Fonction pour gérer les participants d'un événement
  const manageParticipants = useCallback(async (
    eventId: number,
    action: 'approve' | 'reject' | 'remove',
    userIds: number[]
  ) => {
    try {
      const response = await professionnelService.manageParticipants(eventId, action, userIds);
      if (!response.success) throw new Error(response.error);
      
      toast({
        title: "Action effectuée",
        description: `${userIds.length} participant(s) ${
          action === 'approve' ? 'approuvé(s)' : 
          action === 'reject' ? 'refusé(s)' : 'retiré(s)'
        }`,
      });
      
      // Rafraîchir les données
      await refetchEvenements();
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'effectuer l'action",
        variant: "destructive",
      });
      return false;
    }
  }, [refetchEvenements, toast]);

  // Fonction pour charger le benchmark (sur demande)
  const loadBenchmark = useCallback(async () => {
    const result = await refetchBenchmark();
    return result.data;
  }, [refetchBenchmark]);

  // Fonction pour rafraîchir toutes les données
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchCalendar(),
      refetchAnalytics(),
      refetchRecommendations(),
      refetchOeuvres(),
      refetchEvenements(),
      refetchNotifications(),
    ]);
  }, [
    refetchStats,
    refetchCalendar,
    refetchAnalytics,
    refetchRecommendations,
    refetchOeuvres,
    refetchEvenements,
    refetchNotifications,
  ]);

  // Fonction pour changer la période d'analyse
  const changePeriod = useCallback((period: 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
  }, []);

  // Calculs dérivés
  const getEngagementRate = useCallback(() => {
    if (!dashboardStats) return 0;
    const { oeuvres, evenements } = dashboardStats;
    const totalContent = oeuvres.total + evenements.total;
    if (totalContent === 0) return 0;
    
    return dashboardStats.engagement.note_moyenne * 20; // Convertir note sur 5 en pourcentage
  }, [dashboardStats]);

  const getCompletionRate = useCallback(() => {
    if (!dashboardStats?.evenements) return 0;
    const { total, participants_total, taux_remplissage } = dashboardStats.evenements;
    return taux_remplissage || 0;
  }, [dashboardStats]);

  return {
    // Données principales
    dashboardStats,
    calendarEvents,
    analytics,
    benchmark,
    recommendations,
    mesOeuvres,
    mesEvenements,
    mesArtisanats,
    notifications,
    
    // États de chargement
    loading: loadingStats || loadingCalendar || loadingAnalytics,
    loadingStats,
    loadingCalendar,
    loadingAnalytics,
    loadingBenchmark,
    loadingRecommendations,
    loadingOeuvres,
    loadingEvenements,
    loadingArtisanats,
    loadingNotifications,
    
    // Erreurs
    error: errorStats,
    
    // Actions
    exportData: exportMutation.mutate,
    exportPending: exportMutation.isPending,
    getOeuvreStats,
    getEvenementStats,
    manageParticipants,
    loadBenchmark,
    refreshAll,
    changePeriod,
    
    // État
    selectedPeriod,
    
    // Métriques calculées
    engagementRate: getEngagementRate(),
    completionRate: getCompletionRate(),
  };
}

// Hook pour les analytics détaillées
export function useProAnalytics(metric?: 'views' | 'engagement' | 'all') {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  const { data: trends, isLoading, refetch } = useQuery({
    queryKey: ['pro-analytics-trends', period, metric],
    queryFn: async () => {
      const response = await professionnelService.getAnalyticsTrends(period, metric);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: demographics } = useQuery({
    queryKey: ['pro-analytics-demographics'],
    queryFn: async () => {
      const response = await professionnelService.getAnalyticsDemographics();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    trends,
    demographics,
    loading: isLoading,
    period,
    setPeriod,
    refresh: refetch
  };
}