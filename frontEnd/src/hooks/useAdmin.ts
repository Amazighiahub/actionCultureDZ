/**
 * Hooks pour l'administration - Compatible avec l'infrastructure existante
 * Utilise: useApi, useMutation, useDebouncedValue, useAuth
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation as useReactMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/UI/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

// Re-export pour compatibilité
export { useDebouncedValue as useDebounce } from '@/hooks/useDebouncedValue';

// ============================================================================
// Types
// ============================================================================
export interface User {
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  photo_url?: string;
  statut: string;
  type_user: string;
  id_type_user: number;
  email_verifie: boolean;
  date_inscription: string;
  TypeUser?: { nom_type: string };
  Roles?: Array<{ nom_role: string }>;
}

export interface Oeuvre {
  id_oeuvre: number;
  titre: string;
  description?: string;
  statut: string;
  image_url?: string;
  note_moyenne?: number;
  vues?: number;
  id_type_oeuvre: number;
  TypeOeuvre?: { nom_type: string; code?: string };
  Media?: Array<{ url: string; type: string }>;
}

export interface Evenement {
  id_evenement: number;
  nom_evenement: string;
  description?: string;
  statut: string;
  date_debut?: string;
  date_fin?: string;
  lieu?: string;
  image_url?: string;
  capacite_max?: number;
  nombre_inscrits?: number;
  Lieu?: { nom: string; adresse?: string };
}

export interface AdminStats {
  users: { total: number; trend: number; nouveaux: number };
  oeuvres: { total: number; trend: number; en_attente: number };
  evenements: { total: number; trend: number; a_venir: number };
  patrimoine: { total: number };
  signalements: { total: number; non_traites: number };
}

export interface PendingItem {
  id: number;
  type: 'user' | 'oeuvre' | 'evenement' | 'patrimoine';
  title: string;
  subtitle?: string;
  date: string;
  imageUrl?: string;
}

export interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  userId?: number;
  userName?: string;
}

// ============================================================================
// useAdminAuth - Vérification des permissions admin
// ============================================================================
export function useAdminAuth() {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();

  return { 
    isAdmin, 
    isAuthenticated,
    isLoading: loading,
    user,
    canAccess: isAdmin && isAuthenticated
  };
}

// ============================================================================
// useSocketConnection - Gestion de la connexion WebSocket
// ============================================================================
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  const reconnect = useCallback(() => {
    console.log('Reconnecting WebSocket...');
    // Logique de reconnexion via socketService si nécessaire
    setIsConnected(true);
    setLastPing(new Date());
  }, []);

  // Simuler un check de connexion périodique
  useEffect(() => {
    const interval = setInterval(() => {
      // Vérifier la connexion WebSocket
      setLastPing(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected, lastPing, reconnect };
}

// ============================================================================
// useAdminStats - Statistiques du dashboard admin
// ============================================================================
interface UseAdminStatsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useAdminStats(options: UseAdminStatsOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query pour les statistiques
  const {
    data: statsData,
    isLoading: loadingStats,
    error: errorStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await httpClient.get<any>('/admin/stats/overview');
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    refetchInterval: refreshInterval,
  });

  // Query pour les éléments en attente
  const {
    data: pendingData,
    isLoading: loadingPending,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: async () => {
      const response = await httpClient.get<any>('/admin/pending');
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
  });

  // Query pour l'activité récente
  const {
    data: activityData,
    isLoading: loadingActivity,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const response = await httpClient.get<any>('/admin/activity', { limit: 10 });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 1 * 60 * 1000,
  });

  // Mutation pour approuver un élément
  const approveMutation = useReactMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const response = await httpClient.put(`/admin/${type}s/${id}/validate`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Élément approuvé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible d\'approuver',
        variant: 'destructive' 
      });
    }
  });

  // Mutation pour rejeter un élément
  const rejectMutation = useReactMutation({
    mutationFn: async ({ type, id, reason }: { type: string; id: number; reason?: string }) => {
      const response = await httpClient.put(`/admin/${type}s/${id}/reject`, { raison: reason });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Élément rejeté' });
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erreur', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Rafraîchir tout
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchPending(),
      refetchActivity()
    ]);
    toast({ title: 'Données actualisées' });
  }, [refetchStats, refetchPending, refetchActivity, toast]);

  return {
    // Données
    stats: statsData?.stats as AdminStats | null,
    pendingItems: (pendingData?.items || []) as PendingItem[],
    recentActivity: (activityData?.activities || []) as Activity[],
    
    // États
    loading: loadingStats || loadingPending || loadingActivity,
    loadingStats,
    loadingPending,
    loadingActivity,
    error: errorStats?.message || null,
    
    // Actions
    approveItem: (type: string, id: number) => approveMutation.mutate({ type, id }),
    rejectItem: (type: string, id: number, reason?: string) => rejectMutation.mutate({ type, id, reason }),
    refresh: refreshAll,
    
    // États des mutations
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending
  };
}

// ============================================================================
// useAdminUsers - Gestion des utilisateurs admin
// ============================================================================
interface UseAdminUsersOptions {
  search?: string;
  statut?: string;
  type?: string;
  autoFetch?: boolean;
}

export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const { search = '', statut, type, autoFetch = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Debounce de la recherche
  const debouncedSearch = useDebouncedValue(search, 300);

  // Query pour les utilisateurs
  const {
    data: usersData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-users', debouncedSearch, statut, type, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: 12
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statut && statut !== 'tous') params.statut = statut;
      if (type && type !== 'tous') params.id_type_user = type;

      const response = await httpClient.get<any>('/admin/users', params);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
  });

  const users = (usersData?.users || usersData?.items || []) as User[];
  const pagination = usersData?.pagination || { total: 0, totalPages: 1, currentPage: 1 };

  // Mutation pour valider un utilisateur
  const validateMutation = useReactMutation({
    mutationFn: async (userId: number) => {
      const response = await httpClient.put(`/admin/users/${userId}/validate`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Utilisateur validé' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation pour suspendre
  const suspendMutation = useReactMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      const response = await httpClient.put(`/admin/users/${userId}/suspend`, { raison: reason });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Utilisateur suspendu' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation pour réactiver
  const activateMutation = useReactMutation({
    mutationFn: async (userId: number) => {
      const response = await httpClient.put(`/admin/users/${userId}/activate`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Utilisateur réactivé' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation pour supprimer
  const deleteMutation = useReactMutation({
    mutationFn: async (userId: number) => {
      const response = await httpClient.delete(`/admin/users/${userId}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Utilisateur supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Export des utilisateurs
  const exportUsers = useCallback(async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const params: any = { format };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statut && statut !== 'tous') params.statut = statut;
      if (type && type !== 'tous') params.id_type_user = type;

      const response = await httpClient.get<Blob>('/admin/users/export', params);
      
      if (response.success && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Export généré avec succès' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur export', description: err.message, variant: 'destructive' });
    }
  }, [debouncedSearch, statut, type, toast]);

  return {
    // Données
    users,
    pagination,
    
    // États
    loading,
    error: error?.message || null,
    
    // Actions
    validateUser: validateMutation.mutate,
    suspendUser: (userId: number, reason?: string) => suspendMutation.mutate({ userId, reason }),
    activateUser: activateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    exportUsers,
    changePage: setCurrentPage,
    refresh: refetch,
    
    // États des mutations
    isValidating: validateMutation.isPending,
    isSuspending: suspendMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// ============================================================================
// useAdminOeuvres - Gestion des œuvres admin
// ============================================================================
interface UseAdminOeuvresOptions {
  search?: string;
  statut?: string;
  type?: string;
  autoFetch?: boolean;
}

export function useAdminOeuvres(options: UseAdminOeuvresOptions = {}) {
  const { search = '', statut, type, autoFetch = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebouncedValue(search, 300);

  // Query pour les œuvres
  const {
    data: oeuvresData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-oeuvres', debouncedSearch, statut, type, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: 12
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statut && statut !== 'tous') params.statut = statut;
      if (type && type !== 'tous') params.id_type_oeuvre = type;

      const response = await httpClient.get<any>('/admin/oeuvres', params);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
  });

  // Query pour les types d'œuvres
  const { data: typesData } = useQuery({
    queryKey: ['types-oeuvres'],
    queryFn: async () => {
      const response = await httpClient.get<any>('/metadata/types-oeuvres');
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const oeuvres = (oeuvresData?.oeuvres || oeuvresData?.items || []) as Oeuvre[];
  const typesOeuvres = (typesData || []) as Array<{ id_type_oeuvre: number; nom_type: string; code?: string }>;
  const pagination = oeuvresData?.pagination || { total: 0, totalPages: 1, currentPage: 1 };

  // Mutations
  const validateMutation = useReactMutation({
    mutationFn: async (id: number) => {
      const response = await httpClient.put(`/admin/oeuvres/${id}/validate`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Œuvre validée' });
      queryClient.invalidateQueries({ queryKey: ['admin-oeuvres'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const rejectMutation = useReactMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await httpClient.put(`/admin/oeuvres/${id}/reject`, { raison: reason });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Œuvre rejetée' });
      queryClient.invalidateQueries({ queryKey: ['admin-oeuvres'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useReactMutation({
    mutationFn: async (id: number) => {
      const response = await httpClient.delete(`/admin/oeuvres/${id}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Œuvre supprimée' });
      queryClient.invalidateQueries({ queryKey: ['admin-oeuvres'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  return {
    oeuvres,
    typesOeuvres,
    pagination,
    loading,
    error: error?.message || null,
    validateOeuvre: validateMutation.mutate,
    rejectOeuvre: (id: number, reason?: string) => rejectMutation.mutate({ id, reason }),
    deleteOeuvre: deleteMutation.mutate,
    changePage: setCurrentPage,
    refresh: refetch,
    isValidating: validateMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// ============================================================================
// useAdminEvenements - Gestion des événements admin
// ============================================================================
interface UseAdminEvenementsOptions {
  search?: string;
  statut?: string;
  autoFetch?: boolean;
}

export function useAdminEvenements(options: UseAdminEvenementsOptions = {}) {
  const { search = '', statut, autoFetch = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebouncedValue(search, 300);

  // Query pour les événements
  const {
    data: evenementsData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-evenements', debouncedSearch, statut, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: 12
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statut && statut !== 'tous') params.statut = statut;

      const response = await httpClient.get<any>('/admin/evenements', params);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 2 * 60 * 1000,
  });

  const evenements = (evenementsData?.evenements || evenementsData?.items || []) as Evenement[];
  const pagination = evenementsData?.pagination || { total: 0, totalPages: 1, currentPage: 1 };

  // Mutations
  const validateMutation = useReactMutation({
    mutationFn: async (id: number) => {
      const response = await httpClient.put(`/admin/evenements/${id}/validate`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Événement validé' });
      queryClient.invalidateQueries({ queryKey: ['admin-evenements'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const rejectMutation = useReactMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await httpClient.put(`/admin/evenements/${id}/reject`, { raison: reason });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Événement rejeté' });
      queryClient.invalidateQueries({ queryKey: ['admin-evenements'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useReactMutation({
    mutationFn: async (id: number) => {
      const response = await httpClient.delete(`/admin/evenements/${id}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Événement supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin-evenements'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  return {
    evenements,
    pagination,
    loading,
    error: error?.message || null,
    validateEvenement: validateMutation.mutate,
    rejectEvenement: (id: number, reason?: string) => rejectMutation.mutate({ id, reason }),
    deleteEvenement: deleteMutation.mutate,
    changePage: setCurrentPage,
    refresh: refetch,
    isValidating: validateMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// ============================================================================
// useAdminModeration - Gestion des signalements
// ============================================================================
interface Signalement {
  id: number;
  type: 'oeuvre' | 'commentaire' | 'utilisateur' | 'evenement';
  raison: string;
  description?: string;
  statut: 'en_attente' | 'traite' | 'rejete';
  date_signalement: string;
  signale_par: { id: number; nom: string; prenom: string };
  element_signale: { id: number; titre?: string; nom?: string; contenu?: string };
}

interface UseAdminModerationOptions {
  statut?: 'en_attente' | 'traite' | 'rejete' | 'tous';
  autoFetch?: boolean;
}

export function useAdminModeration(options: UseAdminModerationOptions = {}) {
  const { statut = 'en_attente', autoFetch = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query pour les signalements
  const {
    data: signalementsData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-signalements', statut],
    queryFn: async () => {
      const params: any = {};
      if (statut !== 'tous') params.statut = statut;

      const response = await httpClient.get<any>('/admin/signalements', params);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 1 * 60 * 1000,
  });

  const signalements = (signalementsData?.signalements || signalementsData?.items || []) as Signalement[];

  // Mutation pour traiter un signalement
  const treatMutation = useReactMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: 'approve' | 'reject' | 'warn'; reason?: string }) => {
      const response = await httpClient.put(`/admin/signalements/${id}/treat`, { action, raison: reason });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const messages = {
        approve: 'Signalement approuvé - contenu supprimé',
        reject: 'Signalement rejeté',
        warn: 'Avertissement envoyé'
      };
      toast({ title: messages[variables.action] });
      queryClient.invalidateQueries({ queryKey: ['admin-signalements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  return {
    signalements,
    loading,
    error: error?.message || null,
    approveSignalement: (id: number, reason?: string) => treatMutation.mutate({ id, action: 'approve', reason }),
    rejectSignalement: (id: number, reason?: string) => treatMutation.mutate({ id, action: 'reject', reason }),
    warnUser: (id: number, reason?: string) => treatMutation.mutate({ id, action: 'warn', reason }),
    refresh: refetch,
    isTreating: treatMutation.isPending
  };
}
