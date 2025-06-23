// hooks/useDashboardPro.ts - Version simplifiée sans recommandations
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { professionnelService } from '@/services/professionnel.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';
import { artisanatService } from '@/services/artisanat.service';
import { patrimoineService } from '@/services/patrimoine.service';
import type { DashboardStats } from '@/services/professionnel.service';
import { useToast } from '@/components/ui/use-toast';
import { API_ENDPOINTS } from '@/config/api';

interface UseDashboardProOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useDashboardPro(options: UseDashboardProOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        
        const result = {
          items: response.data?.oeuvres || [],
          pagination: response.data?.pagination || { total: 0 }
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
      console.error('❌ Query error:', errorOeuvres);
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
    refetch: refetchEvenements
  } = useQuery({
    queryKey: ['dashboard-pro-evenements'],
    queryFn: async () => {
      const response = await professionnelService.getEvenements({ limit: 50 });
      if (!response.success) throw new Error(response.error);
      
      // S'assurer que le format est correct
      // Si response.data a déjà items et pagination, on le garde
      if (response.data?.items && response.data?.pagination) {
        return response.data;
      }
      
      // Si response.data EST la liste des items directement
      if (Array.isArray(response.data)) {
        return {
          items: response.data,
          pagination: { total: response.data.length }
        };
      }
      
      // Si response.data a une structure PaginatedResponse
      if (response.data && 'items' in response.data) {
        return {
          items: response.data.items || [],
          pagination: response.data.pagination || { total: 0 }
        };
      }
      
      // Fallback
      return {
        items: [],
        pagination: { total: 0 }
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Mes artisanats/services (utilise l'API réelle)
  const {
    data: mesArtisanats,
    isLoading: loadingArtisanats,
    refetch: refetchArtisanats
  } = useQuery({
    queryKey: ['dashboard-pro-artisanats'],
    queryFn: async () => {
      const response = await professionnelService.getArtisanats({ limit: 50 });
      if (!response.success) throw new Error(response.error);
      
      // Même logique que pour les événements
      if (response.data?.items && response.data?.pagination) {
        return response.data;
      }
      
      if (Array.isArray(response.data)) {
        return {
          items: response.data,
          pagination: { total: response.data.length }
        };
      }
      
      if (response.data && 'items' in response.data) {
        return {
          items: response.data.items || [],
          pagination: response.data.pagination || { total: 0 }
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
    refetch: refetchPatrimoines
  } = useQuery({
    queryKey: ['dashboard-pro-patrimoines'],
    queryFn: async () => {
      try {
        console.log('🔍 Chargement patrimoine...');
        
        // Pour l'instant, retourner des données vides car l'API n'est pas prête
        console.warn('⚠️ API patrimoine temporairement désactivée');
        return { items: [], pagination: { total: 0 } };
        
        // Code original commenté pour éviter l'erreur 400
        /*
        const response = await patrimoineService.getAll({ 
          user_id: 'current',
          limit: 50 
        });
        
        if (!response.success) {
          console.warn('API patrimoine non disponible');
          return { items: [], pagination: { total: 0 } };
        }
        
        return {
          items: response.data?.items || response.data || [],
          pagination: response.data?.pagination || { total: 0 }
        };
        */
      } catch (error) {
        console.error('Erreur chargement patrimoine:', error);
        return { items: [], pagination: { total: 0 } };
      }
    },
    enabled: false, // Désactivé temporairement
    staleTime: 5 * 60 * 1000,
  });

  // Notifications (optionnel, peut être retiré si non nécessaire)
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
      
      toast({
        title: "Suppression réussie",
        description: `${type} supprimé avec succès`,
      });
      
      // Rafraîchir les données correspondantes
      switch(type) {
        case 'oeuvre':
          await refetchOeuvres();
          break;
        case 'evenement':
          await refetchEvenements();
          break;
        case 'artisanat':
        case 'service':
          await refetchArtisanats();
          break;
        case 'patrimoine':
          await refetchPatrimoines();
          break;
      }
      
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.message || `Impossible de supprimer le ${type}`,
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
    
    // Actions
    getOeuvreStats,
    getEvenementStats,
    deleteItem,
    refreshAll,
  };
}