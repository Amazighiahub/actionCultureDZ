// hooks/useDashboardAdmin.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { adminService } from '@/services/admin.service';
import type { 
  OverviewStats, 
  DashboardStats, 
  PatrimoineStats, 
  PendingUser, 
  PendingOeuvre,
  ModerationItem,
  Alert
} from '@/services/admin.service';
import type { PaginatedResponse, FilterParams } from '@/config/api';

export const useDashboardAdmin = () => {
  const { toast } = useToast();
  
  // États
  const [loading, setLoading] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [loadingPendingOeuvres, setLoadingPendingOeuvres] = useState(false);
  const [loadingModeration, setLoadingModeration] = useState(false);
  
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patrimoineStats, setPatrimoineStats] = useState<PatrimoineStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PaginatedResponse<PendingUser> | null>(null);
  const [pendingOeuvres, setPendingOeuvres] = useState<PaginatedResponse<PendingOeuvre> | null>(null);
  const [moderationQueue, setModerationQueue] = useState<PaginatedResponse<ModerationItem> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Charger la vue d'ensemble
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const response = await adminService.getOverview();
      if (response.success && response.data) {
        setOverview(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement overview:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la vue d'ensemble",
        variant: "destructive",
      });
    } finally {
      setLoadingOverview(false);
    }
  }, [toast]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const response = await adminService.getStats(selectedPeriod);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, [selectedPeriod]);

  // Charger les statistiques patrimoine
  const loadPatrimoineStats = useCallback(async () => {
    try {
      const response = await adminService.getPatrimoineStats();
      if (response.success && response.data) {
        setPatrimoineStats(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement patrimoine stats:', error);
    }
  }, []);

  // Charger les utilisateurs en attente
  const loadPendingUsers = useCallback(async (params?: FilterParams) => {
    setLoadingPendingUsers(true);
    try {
      const response = await adminService.getPendingUsers(params);
      if (response.success && response.data) {
        setPendingUsers(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs en attente:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs en attente",
        variant: "destructive",
      });
    } finally {
      setLoadingPendingUsers(false);
    }
  }, [toast]);

  // Charger les œuvres en attente
  const loadPendingOeuvres = useCallback(async (params?: FilterParams) => {
    setLoadingPendingOeuvres(true);
    try {
      const response = await adminService.getPendingOeuvres(params);
      if (response.success && response.data) {
        setPendingOeuvres(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement œuvres en attente:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les œuvres en attente",
        variant: "destructive",
      });
    } finally {
      setLoadingPendingOeuvres(false);
    }
  }, [toast]);

  // Charger la file de modération
  const loadModerationQueue = useCallback(async (params?: FilterParams) => {
    setLoadingModeration(true);
    try {
      const response = await adminService.getModerationQueue(params);
      if (response.success && response.data) {
        setModerationQueue(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement modération:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la file de modération",
        variant: "destructive",
      });
    } finally {
      setLoadingModeration(false);
    }
  }, [toast]);

  // Charger les alertes
  const loadAlerts = useCallback(async () => {
    try {
      const response = await adminService.getAlerts();
      if (response.success && response.data) {
        setAlerts(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    }
  }, []);

  // Valider un utilisateur
  const validateUser = useCallback(async ({ userId, validated, comment }: { 
    userId: number; 
    validated: boolean; 
    comment?: string 
  }) => {
    try {
      const response = await adminService.validateUser(userId, validated, comment);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: validated ? "Utilisateur validé avec succès" : "Utilisateur rejeté",
        });
        
        // Rafraîchir les données après validation
        setRefreshTrigger(prev => prev + 1);
        
        // Mettre à jour localement la liste pour retirer l'utilisateur validé
        setPendingUsers(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.filter(user => user.id_user !== userId),
            pagination: {
              ...prev.pagination,
              total: prev.pagination.total - 1
            }
          };
        });
        
        // Mettre à jour le compteur dans overview
        setOverview(prev => {
          if (!prev) return null;
          return {
            ...prev,
            users: {
              ...prev.users,
              en_attente_validation: Math.max(0, prev.users.en_attente_validation - 1)
            }
          };
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Erreur validation utilisateur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de valider l'utilisateur",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Mettre à jour un utilisateur
  const updateUser = useCallback(async ({ userId, data }: { 
    userId: number; 
    data: Partial<PendingUser> 
  }) => {
    try {
      const response = await adminService.updateUser(userId, data);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur mis à jour avec succès",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
        
        // Mettre à jour localement si l'utilisateur est dans la liste
        setPendingUsers(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.map(user => 
              user.id_user === userId 
                ? { ...user, ...data }
                : user
            )
          };
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur update utilisateur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'utilisateur",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Supprimer un utilisateur
  const deleteUser = useCallback(async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.deleteUser(userId);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur supprimé avec succès",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
        
        // Retirer l'utilisateur de la liste locale
        setPendingUsers(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.filter(user => user.id_user !== userId),
            pagination: {
              ...prev.pagination,
              total: prev.pagination.total - 1
            }
          };
        });
        
        // Mettre à jour le compteur dans overview
        setOverview(prev => {
          if (!prev) return null;
          return {
            ...prev,
            users: {
              ...prev.users,
              total: Math.max(0, prev.users.total - 1)
            }
          };
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Suspendre un utilisateur
  const suspendUser = useCallback(async ({ userId, duration, reason }: { 
    userId: number; 
    duration: number; 
    reason: string 
  }) => {
    try {
      const response = await adminService.suspendUser(userId, duration, reason);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Utilisateur suspendu pour ${duration} jours`,
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error || 'Erreur lors de la suspension');
      }
    } catch (error) {
      console.error('Erreur suspension utilisateur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de suspendre l'utilisateur",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Réactiver un utilisateur
  const reactivateUser = useCallback(async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.reactivateUser(userId);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur réactivé avec succès",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error || 'Erreur lors de la réactivation');
      }
    } catch (error) {
      console.error('Erreur réactivation utilisateur:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de réactiver l'utilisateur",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Changer le rôle d'un utilisateur
  const changeUserRole = useCallback(async ({ userId, roleId }: { 
    userId: number; 
    roleId: number 
  }) => {
    try {
      const response = await adminService.changeUserRole(userId, roleId);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Rôle utilisateur mis à jour",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error || 'Erreur lors du changement de rôle');
      }
    } catch (error) {
      console.error('Erreur changement rôle:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de changer le rôle",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Réinitialiser le mot de passe
  const resetUserPassword = useCallback(async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.resetUserPassword(userId);
      
      if (response.success && response.data) {
        toast({
          title: "Succès",
          description: `Mot de passe temporaire : ${response.data.temporaryPassword}`,
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur reset password:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de réinitialiser le mot de passe",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Valider une œuvre
  const validateOeuvre = useCallback(async ({ oeuvreId, validated, comment }: { 
    oeuvreId: number; 
    validated: boolean; 
    comment?: string 
  }) => {
    try {
      const response = await adminService.validateOeuvre(oeuvreId, validated, comment);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: validated ? "Œuvre validée avec succès" : "Œuvre rejetée",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
        
        // Mettre à jour localement
        setPendingOeuvres(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.filter(oeuvre => oeuvre.id_oeuvre !== oeuvreId),
            pagination: {
              ...prev.pagination,
              total: prev.pagination.total - 1
            }
          };
        });
        
        // Mettre à jour le compteur dans overview
        setOverview(prev => {
          if (!prev) return null;
          return {
            ...prev,
            content: {
              ...prev.content,
              oeuvres_en_attente: Math.max(0, prev.content.oeuvres_en_attente - 1)
            }
          };
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Erreur validation œuvre:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de valider l'œuvre",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Modérer un signalement
  const moderateSignalement = useCallback(async ({ signalementId, action, comment }: { 
    signalementId: number; 
    action: 'approve' | 'reject' | 'warn';
    comment?: string;
  }) => {
    try {
      const response = await adminService.moderateSignalement(signalementId, action, comment);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Signalement traité avec succès",
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
        
        // Mettre à jour localement
        setModerationQueue(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.filter(item => item.id !== signalementId),
            pagination: {
              ...prev.pagination,
              total: prev.pagination.total - 1
            }
          };
        });
      } else {
        throw new Error(response.error || 'Erreur lors de la modération');
      }
    } catch (error) {
      console.error('Erreur modération signalement:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de traiter le signalement",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Rechercher des utilisateurs
  const searchUsers = useCallback(async (query: string, type: 'nom' | 'email' | 'telephone' = 'nom') => {
    try {
      const response = await adminService.searchUsers(query, type);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Erreur lors de la recherche');
      }
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les utilisateurs",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  // Actions en masse
  const bulkUserAction = useCallback(async (userIds: number[], action: 'activate' | 'deactivate' | 'delete' | 'change_role', roleId?: number) => {
    try {
      const response = await adminService.bulkUserAction(userIds, action, roleId);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Action effectuée sur ${userIds.length} utilisateurs`,
        });
        
        // Rafraîchir les données
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error || 'Erreur lors de l\'action en masse');
      }
    } catch (error) {
      console.error('Erreur action en masse:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'effectuer l'action en masse",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Export des utilisateurs
  const exportUsers = useCallback(async (format: 'csv' | 'excel' = 'excel', filters?: any) => {
    try {
      const response = await adminService.exportUsers(format, filters);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Export téléchargé avec succès",
        });
      } else {
        throw new Error(response.error || 'Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Erreur export utilisateurs:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'exporter les utilisateurs",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Rafraîchir toutes les données
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverview(),
        loadStats(),
        loadPatrimoineStats(),
        loadPendingUsers(),
        loadPendingOeuvres(),
        loadModerationQueue(),
        loadAlerts()
      ]);
      
      toast({
        title: "Succès",
        description: "Données actualisées",
      });
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser toutes les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadStats, loadPatrimoineStats, loadPendingUsers, loadPendingOeuvres, loadModerationQueue, loadAlerts, toast]);

  // Changer la période
  const changePeriod = useCallback((period: 'day' | 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
  }, []);

  // Exporter un rapport
  const exportReport = useCallback(async (type: 'activity' | 'moderation' | 'patrimoine') => {
    try {
      let response;
      switch (type) {
        case 'activity':
          response = await adminService.getActivityReport(selectedPeriod);
          break;
        case 'moderation':
          response = await adminService.getModerationReport(selectedPeriod);
          break;
        case 'patrimoine':
          response = await adminService.getPatrimoineReport();
          break;
        default:
          throw new Error('Type de rapport invalide');
      }
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Rapport téléchargé avec succès",
        });
      }
    } catch (error) {
      console.error('Erreur export rapport:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le rapport",
        variant: "destructive",
      });
    }
  }, [selectedPeriod, toast]);

  // Vider le cache
  const clearCache = useCallback(async (type?: 'all' | 'users' | 'content' | 'metadata') => {
    try {
      const response = await adminService.clearCache(type);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Cache vidé avec succès",
        });
        
        // Rafraîchir les données
        refreshAll();
      }
    } catch (error) {
      console.error('Erreur vidage cache:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vider le cache",
        variant: "destructive",
      });
    }
  }, [toast, refreshAll]);

  // Charger les données au montage et lors du changement de période ou refresh
  useEffect(() => {
    loadOverview();
    loadStats();
    loadPatrimoineStats();
    loadPendingUsers();
    loadPendingOeuvres();
    loadModerationQueue();
    loadAlerts();
  }, [selectedPeriod, refreshTrigger, loadOverview, loadStats, loadPatrimoineStats, loadPendingUsers, loadPendingOeuvres, loadModerationQueue, loadAlerts]);

  return {
    // Données
    overview,
    stats,
    patrimoineStats,
    pendingUsers,
    pendingOeuvres,
    moderationQueue,
    alerts,
    
    // États
    loading,
    loadingOverview,
    loadingPendingUsers,
    loadingPendingOeuvres,
    loadingModeration,
    
    // Actions - Utilisateurs
    validateUser,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    changeUserRole,
    resetUserPassword,
    searchUsers,
    bulkUserAction,
    exportUsers,
    
    // Actions - Contenu
    validateOeuvre,
    moderateSignalement,
    
    // Actions - Système
    refreshAll,
    changePeriod,
    exportReport,
    clearCache,
    
    // État
    selectedPeriod,
  };
};