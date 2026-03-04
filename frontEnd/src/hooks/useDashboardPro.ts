// hooks/useDashboardPro.ts - Version simplifiée sans recommandations
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { professionnelService } from '@/services/professionnel.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';
import { artisanatService } from '@/services/artisanat.service';
import { patrimoineService } from '@/services/patrimoine.service';
import { httpClient } from '@/services/httpClient';
import { useToast } from '@/components/ui/use-toast';

interface UseDashboardProOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useDashboardPro(options: UseDashboardProOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const { toast } = useToast();
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
      try {
        console.log('🔍 Chargement des œuvres...');
        
        // Récupérer le token pour debug
        const token = localStorage.getItem('auth_token');
        console.log('🔑 Token présent:', !!token);
        
        // Utiliser getMyOeuvres pour récupérer uniquement les œuvres de l'utilisateur connecté
        const response = await oeuvreService.getMyOeuvres({ 
          limit: 50,
          page: 1
        });
        
        console.log('📚 Réponse API œuvres:', response);
        
        if (!response.success) {
          console.error('❌ Erreur API:', response.error);
          
          // Si c'est une erreur 401, le token est peut-être invalide
          if (response.error?.includes('401') || response.error?.includes('auth')) {
            console.error('🔐 Problème d\'authentification détecté');
          }
          
          throw new Error(response.error);
        }
        
        const responseData: any = response.data || {};
        const items = responseData.oeuvres || responseData.items || (Array.isArray(responseData) ? responseData : []);
        const pagination = response.pagination || responseData.pagination || { total: items.length || 0 };

        const result = {
          items,
          pagination
        };
        
        console.log(`✅ ${result.items.length} œuvres chargées sur ${result.pagination.total} au total`);
        
        // Log des premières œuvres pour debug
        if (result.items.length > 0) {
          console.log('Première œuvre:', result.items[0]);
        }
        
        return result;
      } catch (error: any) {
        console.error('❌ Erreur chargement œuvres:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        
        // Retourner une structure vide en cas d'erreur
        return { items: [], pagination: { total: 0 } };
      }
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Gérer l'erreur des œuvres avec useEffect
  useEffect(() => {
    if (errorOeuvres) {
      console.error('❌ Query error œuvres:', errorOeuvres);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos œuvres",
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
      try {
        console.log('🔍 Chargement des événements...');
        const response = await professionnelService.getEvenements({ limit: 50 });
        console.log('📡 Réponse API événements:', response);

        if (!response.success) {
          console.error('❌ Erreur API événements:', response.error);
          throw new Error(response.error || 'Erreur lors du chargement des événements');
        }

        // L'API retourne { evenements: [...], pagination: {...} } ou { items: [...], pagination: {...} }
        const responseData = response.data as any;
        const evenementsList = responseData?.evenements || responseData?.items || [];
        console.log('📋 Liste événements:', evenementsList);

        if (evenementsList.length > 0) {
          // Ajouter les programmes à chaque événement
          const evenementsAvecProgrammes = await Promise.all(
            evenementsList.map(async (evenement: any) => {
              try {
                const programmesResponse = await evenementService.getProgrammes(evenement.id_evenement);
                console.log(`📅 Programmes pour événement ${evenement.id_evenement}:`, programmesResponse);

                // L'API peut retourner les programmes dans différents formats
                const programmes = programmesResponse.success
                  ? (programmesResponse.data?.programmes || programmesResponse.data || [])
                  : [];

                return {
                  ...evenement,
                  programmes: Array.isArray(programmes) ? programmes : []
                };
              } catch (error) {
                console.warn(`Erreur chargement programmes pour événement ${evenement.id_evenement}:`, error);
                return {
                  ...evenement,
                  programmes: []
                };
              }
            })
          );

          console.log('✅ Événements chargés:', evenementsAvecProgrammes.length);
          return {
            items: evenementsAvecProgrammes,
            pagination: responseData?.pagination || { total: evenementsAvecProgrammes.length }
          };
        }

        // Si l'API ne retourne pas de données
        console.log('⚠️ Aucun événement trouvé');
        return {
          items: [],
          pagination: { total: 0 }
        };
      } catch (error: any) {
        console.error('❌ Erreur chargement événements:', error);
        // Retourner une structure vide en cas d'erreur au lieu de données de test
        return {
          items: [],
          pagination: { total: 0 }
        };
      }
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Gérer l'erreur des événements avec useEffect
  useEffect(() => {
    if (errorEvenements) {
      console.error('❌ Query error événements:', errorEvenements);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos événements",
        variant: "destructive",
      });
    }
  }, [errorEvenements, toast]);

  // Mes artisanats (utilise l'API réelle pour récupérer MES artisanats)
  const {
    data: mesArtisanats,
    isLoading: loadingArtisanats,
    refetch: refetchArtisanats
  } = useQuery({
    queryKey: ['dashboard-pro-artisanats'],
    queryFn: async () => {
      try {
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
      } catch (error: any) {
        console.error('❌ Erreur chargement artisanats:', error);
        return {
          items: [],
          pagination: { total: 0 }
        };
      }
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes sites patrimoine (utilise l'API réelle)
  const {
    data: mesPatrimoines,
    isLoading: loadingPatrimoines,
    refetch: refetchPatrimoines
  } = useQuery({
    queryKey: ['dashboard-pro-patrimoines'],
    queryFn: async () => {
      try {
        const response = await patrimoineService.getMySites({ limit: 50 });
        
        if (!response.success) {
          return { items: [], pagination: { total: 0 } };
        }
        
        return {
          items: response.data?.items || response.data || [],
          pagination: response.data?.pagination || { total: 0 }
        };
      } catch (error) {
        console.error('Erreur chargement patrimoine:', error);
        return { items: [], pagination: { total: 0 } };
      }
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
    httpClient.clearCache();
    await Promise.all([
      refetchStats(),
      refetchOeuvres(),
      refetchEvenements(),
      refetchArtisanats(),
      refetchPatrimoines(),
    ]);
    
    toast({
      title: "Actualisation",
      description: "Données mises à jour avec succès",
    });
  }, [
    refetchStats,
    refetchOeuvres,
    refetchEvenements,
    refetchArtisanats,
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
        case 'service':
          response = await artisanatService.delete(id);
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
      httpClient.clearCache();
      
      toast({
        title: "Suppression réussie",
        description: `${type} supprimé avec succès`,
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
        case 'service':
          await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-artisanats'] });
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
        httpClient.clearCache();
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-oeuvres'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-evenements'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-artisanats'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-pro-patrimoines'] });

        toast({
          title: 'Élément déjà supprimé',
          description: 'La liste a été actualisée.',
        });
        return true;
      }

      toast({
        title: "Erreur de suppression",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [refetchOeuvres, refetchEvenements, refetchArtisanats, refetchPatrimoines, toast]);

  return {
    // Données principales
    dashboardStats,
    mesOeuvres,
    mesEvenements,
    mesArtisanats,
    mesPatrimoines,
    notifications,
    
    // États de chargement
    loading: loadingStats || loadingOeuvres || loadingEvenements || loadingArtisanats || loadingPatrimoines,
    loadingStats,
    loadingOeuvres,
    loadingEvenements,
    loadingArtisanats,
    loadingPatrimoines,
    loadingNotifications,
    
    // Erreurs
    error: errorStats,
    errorOeuvres,
    errorEvenements,

    // Actions
    getOeuvreStats,
    getEvenementStats,
    deleteItem,
    refreshAll,
  };
}