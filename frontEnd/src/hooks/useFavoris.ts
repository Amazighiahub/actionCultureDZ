// hooks/useFavoris.ts
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriService } from '@/services/favori.service';
import type { Favori, FavoriStats, PopularItem, GroupedFavoris } from '@/services/favori.service';
import { useToast } from '@/components/ui/use-toast';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import type { PaginationParams } from '@/config/api';

interface UseFavorisOptions {
  type?: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat';
  autoFetch?: boolean;
  grouped?: boolean;
}

interface FavoriCheckState {
  [key: string]: {
    isFavorite: boolean;
    favoriId?: number;
    loading: boolean;
  };
}

export function useFavoris(options: UseFavorisOptions = {}) {
  const { type, autoFetch = true, grouped = false } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // État local pour les vérifications de favoris
  const [favoriChecks, setFavoriChecks] = useState<FavoriCheckState>({});

  // Query pour récupérer les favoris
  const {
    data: favoris,
    isLoading: loadingFavoris,
    error: errorFavoris,
    refetch: refetchFavoris
  } = useQuery({
    queryKey: ['favoris', { type, grouped }],
    queryFn: async () => {
      if (grouped) {
        const response = await favoriService.getAllGrouped();
        if (!response.success) throw new Error(response.error);
        return response.data;
      } else {
        const params: PaginationParams & { type?: string } = { limit: 100 };
        if (type) params.type = type;
        const response = await favoriService.getAll(params);
        if (!response.success) throw new Error(response.error);
        return response.data;
      }
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query pour les statistiques
  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['favoris-stats'],
    queryFn: async () => {
      const response = await favoriService.getStats();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Query pour les favoris populaires
  const {
    data: popular,
    isLoading: loadingPopular,
    refetch: refetchPopular
  } = useQuery({
    queryKey: ['favoris-popular', type],
    queryFn: async () => {
      const response = await favoriService.getPopular(type);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: false, // Désactivé par défaut, à activer manuellement
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation pour ajouter un favori
  const addMutation = useMutation({
    mutationFn: async ({ entity_type, entity_id }: { 
      entity_type: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat'; 
      entity_id: number 
    }) => {
      const response = await favoriService.add({ entity_type, entity_id });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalider les queries
      queryClient.invalidateQueries({ queryKey: ['favoris'] });
      queryClient.invalidateQueries({ queryKey: ['favoris-stats'] });
      
      // Mettre à jour l'état local
      const key = `${variables.entity_type}-${variables.entity_id}`;
      setFavoriChecks(prev => ({
        ...prev,
        [key]: { isFavorite: true, favoriId: data?.id, loading: false }
      }));
      
      toast({
        title: t('toasts.addedToFavorites'),
        description: t('toasts.addedToFavoritesDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('toasts.error'),
        description: error.message || t('toasts.addToFavoritesFailed'),
        variant: "destructive",
      });
    }
  });

  // Mutation pour retirer un favori
  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await favoriService.removeById(id);
      if (!response.success) throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoris'] });
      queryClient.invalidateQueries({ queryKey: ['favoris-stats'] });
      
      toast({
        title: t('toasts.removedFromFavorites'),
        description: t('toasts.removedFromFavoritesDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('toasts.error'),
        description: error.message || t('toasts.removeFromFavoritesFailed'),
        variant: "destructive",
      });
    }
  });

  // Fonction pour vérifier si un élément est favori
  const checkIsFavorite = useCallback(async (
    entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat',
    entityId: number
  ) => {
    const key = `${entityType}-${entityId}`;
    
    // Si déjà en cache, retourner la valeur
    if (favoriChecks[key] && !favoriChecks[key].loading) {
      return favoriChecks[key];
    }
    
    // Marquer comme en chargement
    setFavoriChecks(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true }
    }));
    
    try {
      const response = await favoriService.check(entityType, entityId);
      if (response.success) {
        const favori = response.data?.favori as { id_favori?: number } | undefined;
        const result = {
          isFavorite: Boolean(response.isFavorite),
          favoriId: favori?.id_favori as number | undefined,
          loading: false
        };

        setFavoriChecks(prev => ({
          ...prev,
          [key]: result
        }));

        return result;
      }
    } catch (error) {
    }
    
    // En cas d'erreur
    setFavoriChecks(prev => ({
      ...prev,
      [key]: { isFavorite: false, loading: false }
    }));
    
    return { isFavorite: false, loading: false };
  }, [favoriChecks]);

  // Fonction toggle pour ajouter/retirer facilement
  const toggleFavorite = useCallback(async (
    entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat',
    entityId: number
  ) => {
    const key = `${entityType}-${entityId}`;
    const currentState = favoriChecks[key];
    
    if (!currentState || currentState.loading) {
      // Vérifier d'abord si c'est un favori
      const checkResult = await checkIsFavorite(entityType, entityId);
      if (checkResult.isFavorite && checkResult.favoriId) {
        await removeMutation.mutateAsync(checkResult.favoriId);
      } else {
        await addMutation.mutateAsync({ entity_type: entityType, entity_id: entityId });
      }
    } else if (currentState.isFavorite && currentState.favoriId) {
      // Retirer des favoris
      await removeMutation.mutateAsync(currentState.favoriId);
      setFavoriChecks(prev => ({
        ...prev,
        [key]: { isFavorite: false, loading: false }
      }));
    } else {
      // Ajouter aux favoris
      await addMutation.mutateAsync({ entity_type: entityType, entity_id: entityId });
    }
  }, [favoriChecks, checkIsFavorite, addMutation, removeMutation]);

  // Fonction pour récupérer les favoris populaires
  const fetchPopular = useCallback(async (limit?: number) => {
    const response = await favoriService.getPopular(type, limit);
    if (response.success) {
      queryClient.setQueryData(['favoris-popular', type], response.data);
      return response.data;
    }
    throw new Error(response.error);
  }, [type, queryClient]);

  // Fonction pour recharger toutes les données
  const refresh = useCallback(async () => {
    await Promise.all([
      refetchFavoris(),
      refetchStats(),
      popular ? refetchPopular() : Promise.resolve()
    ]);
  }, [refetchFavoris, refetchStats, refetchPopular, popular]);

  // Helpers pour les données groupées
  const getGroupedFavoris = useCallback((): GroupedFavoris | null => {
    if (grouped && favoris && !Array.isArray(favoris)) {
      return favoris as GroupedFavoris;
    }
    return null;
  }, [favoris, grouped]);

  const getFavorisList = useCallback((): Favori[] => {
    if (!grouped && favoris && 'items' in favoris) {
      return favoris.items;
    }
    return [];
  }, [favoris, grouped]);

  // Compteurs par type
  const getCounts = useCallback(() => {
    if (stats) {
      return stats.favoris_par_type;
    }
    return {
      oeuvres: 0,
      evenements: 0,
      lieux: 0,
      artisanats: 0
    };
  }, [stats]);

  return {
    // Données
    favoris: grouped ? getGroupedFavoris() : getFavorisList(),
    stats,
    popular,
    counts: getCounts(),
    
    // États de chargement
    loading: loadingFavoris || loadingStats,
    loadingFavoris,
    loadingStats,
    loadingPopular,
    addingFavorite: addMutation.isPending,
    removingFavorite: removeMutation.isPending,
    
    // Erreurs
    error: errorFavoris,
    
    // Actions
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    toggleFavorite,
    checkIsFavorite,
    fetchPopular,
    refresh,
    
    // État des vérifications
    favoriChecks
  };
}

// Hook spécialisé pour vérifier un seul favori
export function useFavoriCheck(
  entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat',
  entityId: number
) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriId, setFavoriId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const { toggleFavorite } = useFavoris({ autoFetch: false });

  const { isAuthenticated } = usePermissionsContext();

  useEffect(() => {
    const checkFavorite = async () => {
      // Ne pas vérifier les favoris si l'utilisateur n'est pas connecté
      if (!isAuthenticated) {
        setLoading(false);
        setIsFavorite(false);
        return;
      }

      try {
        setLoading(true);
        const response = await favoriService.check(entityType, entityId);
        if (response.success) {
          setIsFavorite(Boolean(response.isFavorite));
          const favori = response.data?.favori as { id_favori?: number } | undefined;
          setFavoriId(favori?.id_favori);
        }
      } catch (error) {
        setIsFavorite(false);
      } finally {
        setLoading(false);
      }
    };

    if (entityId) {
      checkFavorite();
    }
  }, [entityType, entityId, isAuthenticated]);

  const toggle = useCallback(async () => {
    await toggleFavorite(entityType, entityId);
    setIsFavorite(!isFavorite);
  }, [toggleFavorite, entityType, entityId, isFavorite]);

  return {
    isFavorite,
    favoriId,
    loading,
    toggle,
    toggleFavorite: toggle
  };
}