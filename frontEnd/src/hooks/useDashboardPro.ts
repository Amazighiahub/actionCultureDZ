// hooks/useDashboardPro.ts - Version simplifiée sans recommandations
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
      const rawData = (response.data || {}) as Record<string, unknown>;
      return (rawData.statistiques as Record<string, unknown>) || rawData;
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

      const responseData = (response.data || {}) as Record<string, unknown>;
      const items = (responseData.oeuvres || responseData.items || (Array.isArray(responseData) ? responseData : [])) as unknown[];
      const pagination = response.pagination || (responseData.pagination as Record<string, unknown>) || { total: items.length || 0 };

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

      const responseData = (response.data || {}) as Record<string, unknown>;
      const evenementsList = ((responseData?.evenements || responseData?.items || []) as Record<string, unknown>[]);

      if (evenementsList.length > 0) {
        const evenementsAvecProgrammes = await Promise.all(
          evenementsList.map(async (evenement: Record<string, unknown>) => {
            try {
              const programmesResponse = await evenementService.getProgrammes(evenement.id_evenement as number);
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
      const data = (response.data || {}) as Record<string, unknown>;
      const items = (Array.isArray(data) ? data : ((data?.items || data?.data || []) as unknown[]));
      const pagination = response.pagination || (data?.pagination as Record<string, unknown>) || { total: items.length };
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

      const responseData = response.data as Record<string, unknown> | unknown[] | null;

      if (responseData && !Array.isArray(responseData) && (responseData as Record<string, unknown>)?.items) {
        return responseData as { items: unknown[]; pagination: Record<string, unknown> };
      }

      if (responseData && !Array.isArray(responseData) && (responseData as Record<string, unknown>)?.artisanats) {
        const rd = responseData as Record<string, unknown>;
        const artisanats = rd.artisanats as unknown[];
        return {
          items: artisanats,
          pagination: (rd.pagination as Record<string, unknown>) || { total: artisanats.length || 0 }
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

      toast({
        title: t('toasts.deleteSuccess'),
        description: t('toasts.deleteSuccessDesc', { type }),
      });

      // Mise à jour optimiste : retirer l'élément du cache local immédiatement
      const idFields: Record<string, string> = {
        oeuvre: 'id_oeuvre', evenement: 'id_evenement', artisanat: 'id_artisanat',
        service: 'id_service', patrimoine: 'id_site',
      };
      const queryKeys: Record<string, string> = {
        oeuvre: 'dashboard-pro-oeuvres', evenement: 'dashboard-pro-evenements',
        artisanat: 'dashboard-pro-artisanats', service: 'dashboard-pro-services',
        patrimoine: 'dashboard-pro-patrimoines',
      };
      const idField = idFields[type];
      const queryKey = queryKeys[type];
      if (queryKey && idField) {
        queryClient.setQueryData([queryKey], (old: { items: Record<string, unknown>[]; pagination: unknown } | undefined) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.filter((item) => (item[idField] as number) !== id && (item.id as number) !== id),
          };
        });
      }
      // Refetch stats en arrière-plan
      queryClient.invalidateQueries({ queryKey: ['dashboard-pro-stats'] });
      
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Impossible de supprimer le ${type}`;

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

  // Annuler un événement (planifié/publié → annulé)
  const cancelEvent = useCallback(async (id: number, motif?: string) => {
    try {
      const response = await evenementService.cancel(id, motif || 'Annulé par l\'organisateur');
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de l\'annulation');
      }
      toast({
        title: t('toasts.success', 'Succès'),
        description: t('toasts.eventCancelled', 'Événement annulé avec succès'),
      });
      // Mise à jour optimiste : modifier le statut directement dans le cache React Query
      // pour que l'UI se mette à jour immédiatement (badge rouge + icône disparaît)
      queryClient.setQueryData(['dashboard-pro-evenements'], (old: { items: Record<string, unknown>[]; pagination: unknown } | undefined) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            (item.id_evenement as number) === id ? { ...item, statut: 'annule' } : item
          ),
        };
      });
      // Refetch en arrière-plan pour synchroniser avec le serveur
      queryClient.invalidateQueries({ queryKey: ['dashboard-pro-stats'] });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: t('toasts.error', 'Erreur'),
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, queryClient, t]);

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
    cancelEvent,
    refreshAll,
  };
}