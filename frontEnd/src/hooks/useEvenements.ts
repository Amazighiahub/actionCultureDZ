/**
 * useEvenements - Hook pour la page de listing des événements
 * Gère la recherche, les filtres et la pagination
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { evenementService } from '@/services/evenement.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Evenement } from '@/types/models/evenement.types';

interface UseEvenementsOptions {
  search?: string;
  statut?: string;
  type?: string;
  wilayaId?: number;
  dateDebut?: string;
  dateFin?: string;
  initialPage?: number;
  pageSize?: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function useEvenements(options: UseEvenementsOptions = {}) {
  const queryClient = useQueryClient();
  
  const {
    search = '',
    statut,
    type,
    wilayaId,
    dateDebut,
    dateFin,
    initialPage = 1,
    pageSize = 12,
  } = options;

  // État de pagination
  const [page, setPage] = useState(initialPage);

  // Debounce de la recherche
  const debouncedSearch = useDebouncedValue(search, 300);

  // Construire les paramètres de requête
  const queryParams = useMemo(() => ({
    page,
    limit: pageSize,
    ...(debouncedSearch && { q: debouncedSearch }),
    ...(statut && { statut }),
    ...(type && { type_evenement: type }),
    ...(wilayaId && { wilaya_id: wilayaId }),
    ...(dateDebut && { date_debut: dateDebut }),
    ...(dateFin && { date_fin: dateFin }),
  }), [page, pageSize, debouncedSearch, statut, type, wilayaId, dateDebut, dateFin]);

  // Query key
  const queryKey = ['evenements', queryParams];

  // Charger les événements
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await evenementService.search(queryParams);

      if (response.success) {
        // Normaliser la réponse - le backend peut retourner:
        // 1. { data: [...], pagination: {...} } (format actuel)
        // 2. { data: { items: [...], ... } } (format PaginatedResponse)
        const responseData = response.data;
        const paginationData = (response as any).pagination;

        // Si data est un tableau direct
        if (Array.isArray(responseData)) {
          return {
            items: responseData,
            total: paginationData?.total || responseData.length,
            totalPages: paginationData?.pages || 1,
            page: paginationData?.page || 1
          };
        }

        // Si data a une propriété items
        if (responseData && 'items' in responseData) {
          return {
            items: responseData.items || [],
            total: responseData.total || 0,
            totalPages: responseData.totalPages || responseData.pages || 1,
            page: responseData.page || 1
          };
        }

        // Fallback
        return {
          items: responseData || [],
          total: paginationData?.total || 0,
          totalPages: paginationData?.pages || 1,
          page: paginationData?.page || 1
        };
      }
      throw new Error(response.error || 'Erreur lors du chargement des événements');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData, // Garde les données précédentes pendant le chargement
  });

  // Extraire les données
  const evenements = data?.items || [];
  const pagination: PaginationState = {
    currentPage: page,
    totalPages: data?.totalPages || 1,
    total: data?.total || 0,
    pageSize,
  };

  // Changer de page
  const changePage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pagination.totalPages]);

  // Aller à la page suivante
  const nextPage = useCallback(() => {
    if (page < pagination.totalPages) {
      changePage(page + 1);
    }
  }, [page, pagination.totalPages, changePage]);

  // Aller à la page précédente
  const prevPage = useCallback(() => {
    if (page > 1) {
      changePage(page - 1);
    }
  }, [page, changePage]);

  // Reset à la première page (utile quand les filtres changent)
  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  // Rafraîchir les données
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['evenements'] });
    refetch();
  }, [queryClient, refetch]);

  // Précharger la page suivante
  const prefetchNextPage = useCallback(() => {
    if (page < pagination.totalPages) {
      const nextParams = { ...queryParams, page: page + 1 };
      queryClient.prefetchQuery({
        queryKey: ['evenements', nextParams],
        queryFn: async () => {
          const response = await evenementService.search(nextParams);
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error);
        },
      });
    }
  }, [page, pagination.totalPages, queryParams, queryClient]);

  return {
    // Données
    evenements: evenements as Evenement[],
    pagination,

    // États
    loading: isLoading,
    error: error?.message || null,

    // Navigation
    changePage,
    nextPage,
    prevPage,
    resetPage,

    // Actions
    refresh,
    prefetchNextPage,

    // Helpers
    hasNextPage: page < pagination.totalPages,
    hasPrevPage: page > 1,
    isEmpty: evenements.length === 0 && !isLoading,
  };
}

// Hook pour les événements à venir (page d'accueil)
export function useUpcomingEvents(limit: number = 6) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['upcoming-events', limit],
    queryFn: async () => {
      const response = await evenementService.getUpcoming({ limit });
      if (response.success) {
        const responseData = response.data;
        // Le backend retourne { data: [...], pagination: {...} }
        if (Array.isArray(responseData)) {
          return responseData;
        }
        // Ou { data: { items: [...] } }
        if (responseData && 'items' in responseData) {
          return responseData.items || [];
        }
        return responseData || [];
      }
      throw new Error(response.error || 'Erreur lors du chargement');
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    events: (data || []) as Evenement[],
    loading: isLoading,
    error: error?.message || null,
  };
}

// Hook pour les statistiques d'événements (dashboard admin)
export function useEvenementStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['evenement-stats'],
    queryFn: async () => {
      const response = await evenementService.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Erreur lors du chargement des statistiques');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    stats: data,
    loading: isLoading,
    error: error?.message || null,
  };
}

export default useEvenements;
