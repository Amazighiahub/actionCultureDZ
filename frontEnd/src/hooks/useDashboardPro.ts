// hooks/useDashboardPro.ts - Version simplifiée sans recommandations
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { professionnelService } from '@/services/professionnel.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';
import { artisanatService } from '@/services/artisanat.service';
import { patrimoineService } from '@/services/patrimoine.service';
import { serviceService } from '@/services/service.service';
import { httpClient } from '@/services/httpClient';
import { useToast } from '@/components/ui/use-toast';

interface UseDashboardProOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useDashboardPro(options: UseDashboardProOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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
      const rawData: any = response.data || {};
      return rawData.statistiques || rawData;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    refetchInterval: refreshInterval,
  });

  // Mes œuvres (utilise l'API réelle pour récupérer MES œuvres)
  const {
    data: mesOeuvres,
    isLoading: loadingOeuvres,
    refetch: refetchOeuvres,
    error: errorOeuvres
  } = useQuery({
    queryKey: ['dashboard-pro-oeuvres'],
    queryFn: async () => {
      const response = await oeuvreService.getMyOeuvres({
        limit: 50,
        page: 1
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const responseData: any = response.data || {};
      const items = responseData.oeuvres || responseData.items || (Array.isArray(responseData) ? responseData : []);
      const pagination = response.pagination || responseData.pagination || { total: items.length || 0 };

      return {
        items,
        pagination
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Gérer l'erreur des œuvres avec useEffect
  useEffect(() => {
    if (errorOeuvres) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadMyOeuvresFailed'),
        variant: "destructive",
      });
    }
  }, [errorOeuvres, toast]);

  // Mes événements (utilise l'API réelle pour récupérer MES événements)
  const {
    data: mesEvenements,
    isLoading: loadingEvenements,
    refetch: refetchEvenements,
    error: errorEvenements
  } = useQuery({
    queryKey: ['dashboard-pro-evenements'],
    queryFn: async () => {
      const response = await professionnelService.getEvenements({ limit: 50 });

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du chargement des événements');
      }

      const responseData = response.data as any;
      const evenementsList = responseData?.evenements || responseData?.items || [];

      if (evenementsList.length > 0) {
        const evenementsAvecProgrammes = await Promise.all(
          evenementsList.map(async (evenement: any) => {
            try {
              const programmesResponse = await evenementService.getProgrammes(evenement.id_evenement);
              const programmes = programmesResponse.success
                ? (programmesResponse.data?.programmes || programmesResponse.data || [])
                : [];

              return {
                ...evenement,
                programmes: Array.isArray(programmes) ? programmes : []
              };
            } catch {
              return {
                ...evenement,
                programmes: []
              };
            }
          })
        );
        return {
          items: evenementsAvecProgrammes,
          pagination: responseData?.pagination || { total: evenementsAvecProgrammes.length }
        };
      }

      return {
        items: [],
        pagination: { total: 0 }
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Gérer l'erreur des événements avec useEffect
  useEffect(() => {
    if (errorEvenements) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadMyEventsFailed'),
        variant: "destructive",
      });
    }
  }, [errorEvenements, toast]);

  // Mes services (API /services/my/list - distinct de l'artisanat)
  const {
    data: mesServices,
    isLoading: loadingServices,
    error: errorServices,
    refetch: refetchServices
  } = useQuery({
    queryKey: ['dashboard-pro-services'],
    queryFn: async () => {
      const response = await serviceService.getMyServices({ limit: 50, page: 1 });
      if (!response.success) throw new Error(response.error);
      const data = response.data as any;
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      const pagination = response.pagination || data?.pagination || { total: items.length };
      return { items, pagination };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes artisanats (utilise l'API réelle pour récupérer MES artisanats)
  const {
    data: mesArtisanats,
    isLoading: loadingArtisanats,
    error: errorArtisanats,
    refetch: refetchArtisanats
  } = useQuery({
    queryKey: ['dashboard-pro-artisanats'],
    queryFn: async () => {
      const response = await professionnelService.getArtisanats({ limit: 50, page: 1 });
      if (!response.success) throw new Error(response.error);

      const responseData: any = response.data;

      if (responseData?.items) {
        return responseData;
      }

      if (responseData?.artisanats) {
        return {
          items: responseData.artisanats,
          pagination: responseData.pagination || { total: responseData.artisanats.length || 0 }
        };
      }

      if (Array.isArray(responseData)) {
        return {
          items: responseData,
          pagination: { total: responseData.length }
        };
      }

      return {
        items: [],
        pagination: { total: 0 }
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes sites patrimoine (utilise l'API réelle)
  const {
    data: mesPatrimoines,
    isLoading: loadingPatrimoines,
    error: errorPatrimoines,
    refetch: refetchPatrimoines
  } = useQuery({
    queryKey: ['dashboard-pro-patrimoines'],
    queryFn: async () => {
      const response = await patrimoineService.getMySites({ limit: 50 });

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du chargement des sites patrimoine');
      }

      return {
        items: response.data?.items || response.data || [],
        pagination: response.data?.pagination || { total: 0 }
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Notifications (optionnel, peut être retiré si non nécessaire)
  const {
    data: notifications,
    isLoading: loadingNotifications
  } = useQuery({
    queryKey: ['dashboard-pro-notifications'],
    queryFn: async () => {
      const response = await professionnelService.getNotifications({ limit: 5 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: false, // Désactivé par défaut pour économiser les requêtes
    staleTime: 2 * 60 * 1000,
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

  // Fonction pour rafraîchir toutes les données
  const refreshAll = useCallback(async () => {
    // Cache handled by React Query invalidation
    await Promise.all([
      refetchStats(),
      refetchOeuvres(),
      refetchEvenements(),
      refetchArtisanats(),
      refetchServices(),
      refetchPatrimoines(),
    ]);
    
    toast({
      title: t('toasts.refreshSuccess'),
      description: t('toasts.refreshSuccessDesc'),
    });
  }, [
    refetchStats,
    refetchOeuvres,
    refetchEvenements,
    refetchArtisanats,
    refetchServices,
    refetchPatrimoines,
    toast
  ]);

  // Fonction de suppression générique
  const deleteItem = useCallback(async (type: string, id: number) => {
    try {
      let response;
      
      switch(type) {
        case 'oeuvre':
          response = await oeuvreService.deleteOeuvre(id);
          break;
        case 'evenement':
          response = await evenementService.delete(id);
          break;
        case 'artisanat':
          response = await artisanatService.delete(id);
          break;
        case 'service':
          response = await serviceService.delete(id);
          break;
        case 'patrimoine':
          response = await patrimoineService.delete(id);
          break;
        default:
          throw new Error('Type non supporté');
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la suppression');
      }

      // Évite les listes obsolètes après mutation
      // Cache handled by React Query invalidation
      
      toast({
        title: t('toasts.deleteSuccess'),
        description: t('toasts.deleteSuccessDesc', { type }),
      });
      
      // Rafraîchir les données correspondantes (invalidate + refetch)
      switch(type) {
        case 'oeuvre':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-oeuvres'] });
          break;
        case 'evenement':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-evenements'] });
          break;
        case 'artisanat':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-artisanats'] });
          break;
        case 'service':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-services'] });
          break;
        case 'patrimoine':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-patrimoines'] });
          break;
      }
      
      return true;
    } catch (error: any) {
      const message = error?.message || `Impossible de supprimer le ${type}`;

      // Cas fréquent: élément déjà supprimé côté backend mais encore visible en cache local
      if (message.includes('404') || message.toLowerCase().includes('non trouv')) {
        // Cache handled by React Query invalidation
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-oeuvres'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-evenements'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-artisanats'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-services'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-patrimoines'] });

        toast({
          title: t('toasts.alreadyDeleted'),
          description: t('toasts.alreadyDeletedDesc'),
        });
        return true;
      }

      toast({
        title: t('toasts.deleteFailed'),
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [refetchOeuvres, refetchEvenements, refetchArtisanats, refetchServices, refetchPatrimoines, toast]);

  return {
    // Données principales
    dashboardStats,
    mesOeuvres,
    mesEvenements,
    mesArtisanats,
    mesServices,
    mesPatrimoines,
    notifications,
    
    // États de chargement
    loading: loadingStats || loadingOeuvres || loadingEvenements || loadingArtisanats || loadingServices || loadingPatrimoines,
    loadingStats,
    loadingOeuvres,
    loadingEvenements,
    loadingArtisanats,
    loadingServices,
    loadingPatrimoines,
    loadingNotifications,
    
    // Erreurs
    error: errorStats,
    errorOeuvres,
    errorEvenements,
    errorServices,
    errorArtisanats,
    errorPatrimoines,

    // Actions
    getOeuvreStats,
    getEvenementStats,
    deleteItem,
    refreshAll,
  };
}