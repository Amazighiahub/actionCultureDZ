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
import { messageErreurServeur } from '@/utils/erreurServeur';
import { useToast } from '@/components/ui/use-toast';
import type { TexteMultilingue } from '@/types/common/multilingual.types';

/**
 * Élément d'une liste du tableau de bord pro (œuvre, événement, service, site patrimoine, artisanat),
 * tel que le serveur le renvoie : les textes peuvent être multilingues, les montants arrivent parfois en texte.
 */
export interface ElementPro {
  id?: number;
  id_oeuvre?: number;
  id_evenement?: number;
  id_site?: number;
  /** Sites patrimoine : identifiant renvoyé par le serveur */
  id_lieu?: number;
  id_service?: number;
  id_artisanat?: number;
  titre?: TexteMultilingue;
  nom?: TexteMultilingue;
  nom_evenement?: TexteMultilingue;
  description?: TexteMultilingue;
  /** Texte, ou lieu inclus ({ nom }) */
  lieu?: string | { nom?: TexteMultilingue };
  type?: TexteMultilingue;
  /** Clé du type de service (« hotel », « guide »…) */
  type_service?: string;
  type_oeuvre?: { nom_type?: TexteMultilingue };
  TypeOeuvre?: { nom_type?: TexteMultilingue };
  vues?: number;
  visites?: number;
  note_moyenne?: number;
  statut?: string;
  date_debut?: string;
  Lieu?: { nom?: TexteMultilingue; adresse?: TexteMultilingue };
  nombre_participants?: number;
  wilaya?: TexteMultilingue;
  /** Colonnes DECIMAL : arrivent en texte (« 1500.00 ») */
  tarif_min?: number | string | null;
  tarif_max?: number | string | null;
  horaires?: TexteMultilingue;
  en_stock?: number;
  sur_commande?: boolean;
  prix_min?: number | string | null;
  prix_max?: number | string | null;
  Materiau?: { nom?: TexteMultilingue };
  Technique?: { nom?: TexteMultilingue };
  materiau?: TexteMultilingue;
  technique?: TexteMultilingue;
  [key: string]: unknown;
}

/** Liste du tableau de bord pro : seul le total de la pagination est lu */
export interface ListePro {
  items: ElementPro[];
  pagination: { total?: number };
}

/** Statistiques renvoyées par GET /professionnel/dashboard (dans « statistiques ») */
export interface StatistiquesPro {
  /** Vues de tous les contenus du professionnel (œuvres, événements, artisanat, services) */
  vues_total?: number;
  oeuvres?: { total?: number; publiees?: number; en_attente?: number };
  evenements?: { total?: number; a_venir?: number };
  artisanats?: { total?: number; en_vente?: number };
}

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
    queryFn: async (): Promise<StatistiquesPro> => {
      const response = await professionnelService.getDashboard();
      if (!response.success) throw new Error(response.error);
      // Le serveur renvoie { statistiques, recent } (et non la forme DashboardStats annoncée par le service)
      const brut: unknown = response.data || {};
      const rawData = brut as StatistiquesPro & { statistiques?: StatistiquesPro };
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
    queryFn: async (): Promise<ListePro> => {
      const response = await oeuvreService.getMyOeuvres({
        limit: 50,
        page: 1
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const responseData = (response.data || {}) as Record<string, unknown>;
      const items = (responseData.oeuvres || responseData.items || (Array.isArray(responseData) ? responseData : [])) as ElementPro[];
      const pagination = response.pagination || (responseData.pagination as ListePro['pagination'] | undefined) || { total: items.length || 0 };

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
    queryFn: async (): Promise<ListePro> => {
      const response = await professionnelService.getEvenements({ limit: 50 });

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du chargement des événements');
      }

      const responseData = (response.data || {}) as Record<string, unknown>;
      const evenementsList = ((responseData?.evenements || responseData?.items || []) as ElementPro[]);

      // (Avant : une requête « programmes » par événement, jusqu'à 50 à chaque ouverture du
      // tableau de bord, pour un champ jamais affiché — la gestion d'un événement charge les siens.)
      if (evenementsList.length > 0) {
        return {
          items: evenementsList,
          pagination: (responseData?.pagination as ListePro['pagination'] | undefined) || { total: evenementsList.length }
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
    queryFn: async (): Promise<ListePro> => {
      const response = await serviceService.getMyServices({ limit: 50, page: 1 });
      if (!response.success) throw new Error(response.error);
      const data = (response.data || {}) as Record<string, unknown>;
      const items = (Array.isArray(data) ? data : (data?.items || data?.data || [])) as ElementPro[];
      const pagination = response.pagination || (data?.pagination as ListePro['pagination'] | undefined) || { total: items.length };
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
    queryFn: async (): Promise<ListePro> => {
      const response = await professionnelService.getArtisanats({ limit: 50, page: 1 });
      if (!response.success) throw new Error(response.error);

      // Selon la route, la liste arrive dans « items », dans « artisanats » ou directement en tableau
      const responseData: unknown = response.data ?? null;
      const rd = (responseData && typeof responseData === 'object' && !Array.isArray(responseData))
        ? responseData as { items?: ElementPro[]; artisanats?: ElementPro[]; pagination?: ListePro['pagination'] }
        : null;

      if (rd?.items) {
        return { items: rd.items, pagination: rd.pagination || {} };
      }

      if (rd?.artisanats) {
        const artisanats = rd.artisanats;
        return {
          items: artisanats,
          pagination: rd.pagination || { total: artisanats.length || 0 }
        };
      }

      if (Array.isArray(responseData)) {
        return {
          items: responseData as ElementPro[],
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
    queryFn: async (): Promise<ListePro> => {
      const response = await patrimoineService.getMySites({ limit: 50 });

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors du chargement des sites patrimoine');
      }

      // Le serveur renvoie un tableau dans « data » (pagination à côté), et non la forme
      // PaginatedResponse<SitePatrimoine> annoncée par le service ; les deux formes sont acceptées
      const donnees: unknown = response.data;
      const enListe = (donnees && typeof donnees === 'object' && !Array.isArray(donnees))
        ? donnees as { items?: ElementPro[]; pagination?: ListePro['pagination'] }
        : null;
      return {
        items: enListe?.items || (Array.isArray(donnees) ? donnees as ElementPro[] : []),
        pagination: enListe?.pagination || { total: 0 }
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
        // Statut et code gardés pour reconnaître un élément déjà supprimé (404)
        throw Object.assign(new Error(messageErreurServeur(response, t('toasts.deleteFailed', 'Erreur de suppression'))), {
          status: response.status, code: response.code,
        });
      }

      toast({
        title: t('toasts.deleteSuccess'),
        description: t('toasts.deleteSuccessDesc', { type }),
      });

      // Mise à jour optimiste : retirer l'élément du cache local immédiatement
      const idFields: Record<string, string> = {
        oeuvre: 'id_oeuvre', evenement: 'id_evenement', artisanat: 'id_artisanat',
        service: 'id_service', patrimoine: 'id_lieu',
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
      // Texte traduit (avant : « Impossible de supprimer le oeuvre », en français et avec le nom technique)
      const message = messageErreurServeur(error, t('toasts.deleteFailed', 'Erreur de suppression'));
      const echec = error as { status?: number; code?: string } | null;

      // Cas fréquent: élément déjà supprimé côté backend mais encore visible en cache local
      // (reconnu au statut, plus aux mots français du message)
      if (echec?.status === 404 || echec?.code === 'NOT_FOUND') {
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
        throw new Error(messageErreurServeur(response, t('toasts.eventCancelFailed', "Erreur lors de l'annulation")));
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
      const message = messageErreurServeur(error, t('toasts.eventCancelFailed', "Erreur lors de l'annulation"));
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