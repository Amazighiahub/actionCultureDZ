// hooks/useDashboardAdmin.ts - VERSION SIMPLIFIÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient } from '@/services/httpClient';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { adminService } from '@/services/admin.service';

import type { 
  OverviewStats,
  DashboardStats,
  PatrimoineStats,
  PendingUser,
  PendingOeuvre,
  ModerationItem,
  Alert,
  OeuvreFilters,
  EvenementFilters,
  PatrimoineFilters,
  ServiceFilters
} from '@/services/admin.service';

// Types pour les filtres
export type { OeuvreFilters, EvenementFilters, PatrimoineFilters, ServiceFilters };

// Hook pour gérer les filtres
export const useAdminFilters = () => {
  const [oeuvreFilters, setOeuvreFilters] = useState<OeuvreFilters>({});
  const [evenementFilters, setEvenementFilters] = useState<EvenementFilters>({});
  const [patrimoineFilters, setPatrimoineFilters] = useState<PatrimoineFilters>({});
  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>({});

  const resetOeuvreFilters = () => setOeuvreFilters({});
  const resetEvenementFilters = () => setEvenementFilters({});
  const resetPatrimoineFilters = () => setPatrimoineFilters({});
  const resetServiceFilters = () => setServiceFilters({});

  return {
    oeuvreFilters,
    setOeuvreFilters,
    resetOeuvreFilters,
    evenementFilters,
    setEvenementFilters,
    resetEvenementFilters,
    patrimoineFilters,
    setPatrimoineFilters,
    resetPatrimoineFilters,
    serviceFilters,
    setServiceFilters,
    resetServiceFilters
  };
};

export type AdminTab = 'overview' | 'users' | 'oeuvres' | 'evenements' | 'patrimoine' | 'services' | 'moderation';

export const useDashboardAdmin = (activeTab: AdminTab = 'overview') => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // États pour les données
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patrimoineStats, setPatrimoineStats] = useState<PatrimoineStats | null>(null);
  const [allUsers, setAllUsers] = useState<any>(null);
  const [pendingUsers, setPendingUsers] = useState<any>(null);
  const [pendingOeuvres, setPendingOeuvres] = useState<any>(null);
  const [moderationQueue, setModerationQueue] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // États pour les données étendues (depuis les endpoints publics)
  const [oeuvres, setOeuvres] = useState<any>(null);
  const [evenements, setEvenements] = useState<any>(null);
  const [patrimoineItems, setPatrimoineItems] = useState<any>(null);
  const [services, setServices] = useState<any>(null);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [loadingPendingOeuvres, setLoadingPendingOeuvres] = useState(false);
  const [loadingModeration, setLoadingModeration] = useState(false);
  const [loadingOeuvres, setLoadingOeuvres] = useState(false);
  const [loadingEvenements, setLoadingEvenements] = useState(false);
  const [loadingPatrimoine, setLoadingPatrimoine] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // État pour la période sélectionnée
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Per-tab data loading: only fetch what the active tab needs
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        loadOverview();
        loadStats();
        loadPatrimoineStats();
        loadPendingUsers();
        loadPendingOeuvres();
        loadAlerts();
        break;
      case 'users':
        loadAllUsers();
        loadPendingUsers();
        break;
      case 'oeuvres':
        loadOeuvres();
        loadPendingOeuvres();
        break;
      case 'evenements':
        loadEvenements();
        break;
      case 'patrimoine':
        loadPatrimoineItems();
        break;
      case 'services':
        loadServices();
        break;
      case 'moderation':
        loadModerationQueue();
        break;
    }
  }, [activeTab]);

  // ========================================
  // FONCTIONS DE CHARGEMENT DES DONNÉES
  // ========================================

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const response = await adminService.getOverview();
      if (response.success && response.data) {
        setOverview(response.data);
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadOverviewFailed'),
        variant: "destructive"
      });
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadStats = async (period: 'day' | 'week' | 'month' | 'year' = selectedPeriod) => {
    try {
      const response = await adminService.getStats(period);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
    }
  };

  const loadPatrimoineStats = async () => {
    try {
      const response = await adminService.getPatrimoineStats();
      if (response.success && response.data) {
        setPatrimoineStats(response.data);
      }
    } catch (error) {
    }
  };

  const loadAllUsers = async (params?: { page?: number; limit?: number; statut?: string; statut_validation?: string; type_user?: string; search?: string }) => {
    setLoadingAllUsers(true);
    try {
      const response = await adminService.getAllUsers({ page: 1, limit: 100, ...params });
      if (response.success && response.data) {
        setAllUsers(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const loadPendingUsers = async () => {
    setLoadingPendingUsers(true);
    try {
      const response = await adminService.getPendingUsers({ page: 1, limit: 100 });
      if (response.success && response.data) {
        setPendingUsers(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  const loadPendingOeuvres = async () => {
    setLoadingPendingOeuvres(true);
    try {
      const response = await adminService.getPendingOeuvres({ page: 1, limit: 100 });
      if (response.success && response.data) {
        setPendingOeuvres(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingPendingOeuvres(false);
    }
  };

  const loadModerationQueue = async () => {
    setLoadingModeration(true);
    try {
      const response = await adminService.getModerationQueue({ page: 1, limit: 100 });
      if (response.success && response.data) {
        setModerationQueue(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingModeration(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await adminService.getAlerts();
      if (response.success && response.data) {
        setAlerts(response.data);
      }
    } catch (error) {
      setAlerts([]);
    }
  };

  // ========================================
  // CHARGEMENT DES DONNÉES ÉTENDUES (via endpoints publics)
  // ========================================

 

  // ========================================
  // ACTIONS UTILISATEURS
const validateUser = async ({ userId, validated }: { userId: number; validated: boolean }) => {
  try {
    const response = await adminService.validateUser(userId, validated);
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: validated ? t('toasts.userValidated') : t('toasts.userRejected')
      });
      
      // ✅ SOLUTION: Mise à jour locale du state (plus fiable)
      setPendingUsers((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items?.filter((u: any) => u.id_user !== userId) || [],
          pagination: prev.pagination ? {
            ...prev.pagination,
            total: Math.max(0, (prev.pagination.total || 0) - 1)
          } : prev.pagination
        };
      });
      
      // Cache handled by React Query invalidation
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.userValidationFailed'),
      variant: "destructive"
    });
  }
};

  const updateUser = async ({ userId, data }: { userId: number; data: any }) => {
    try {
      const response = await adminService.updateUser(userId, data);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.userUpdated')
        });
        await loadPendingUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.userUpdateFailed'),
        variant: "destructive"
      });
    }
  };

  const deleteUser = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.userDeleted')
        });
        await loadPendingUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.userDeleteFailed'),
        variant: "destructive"
      });
    }
  };

  const suspendUser = async ({ userId, duration, reason }: { userId: number; duration: number; reason: string }) => {
    try {
      const response = await adminService.suspendUser(userId, duration, reason);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.userSuspended')
        });
        await loadPendingUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.userSuspendFailed'),
        variant: "destructive"
      });
    }
  };

  const reactivateUser = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.reactivateUser(userId);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.userReactivated')
        });
        await loadPendingUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.userReactivateFailed'),
        variant: "destructive"
      });
    }
  };

  const resetUserPassword = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.resetUserPassword(userId);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.passwordReset')
        });
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.passwordResetFailed'),
        variant: "destructive"
      });
    }
  };

  const bulkUserAction = async (userIds: number[], action: string) => {
    try {
      const response = await adminService.bulkUserAction(userIds, action as any);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.bulkActionApplied', { action, count: userIds.length })
        });
        await loadPendingUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.bulkActionFailed'),
        variant: "destructive"
      });
    }
  };

  const exportUsers = async (format: 'csv' | 'excel', filters?: any) => {
    try {
      const response = await adminService.exportUsers(format, filters);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.exportUsersDone')
        });
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.exportUsersFailed'),
        variant: "destructive"
      });
    }
  };

  // ========================================
  // ACTIONS ŒUVRES
  // ========================================

  const validateOeuvre = async ({ oeuvreId, validated }: { oeuvreId: number; validated: boolean }) => {
    try {
      const response = await adminService.validateOeuvre(oeuvreId, validated);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: validated ? t('toasts.oeuvreValidated') : t('toasts.oeuvreRejected')
        });
        await loadPendingOeuvres();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.oeuvreValidationFailed'),
        variant: "destructive"
      });
    }
  };

  const updateOeuvreStatus = async (oeuvreId: number, status: string) => {
    try {
      const endpoint = status === 'rejete' 
        ? `/oeuvres/${oeuvreId}/reject` 
        : `/oeuvres/${oeuvreId}/validate`;
      const response = await httpClient.post(endpoint, { statut: status });
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.oeuvreStatusUpdated')
        });
        await loadOeuvres();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.statusUpdateFailed'),
        variant: "destructive"
      });
    }
  };

  

  // ========================================
  // ACTIONS ÉVÉNEMENTS
  // ========================================

  const updateEvenementStatus = async (evenementId: number, status: string) => {
    try {
      const response = await httpClient.post(`/evenements/${evenementId}/publish`, { statut: status });
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.eventStatusUpdated')
        });
        await loadEvenements();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.statusUpdateFailed'),
        variant: "destructive"
      });
    }
  };

  
  // ========================================
  // ACTIONS SERVICES
  // ========================================

  const updateServiceStatus = async (serviceId: number, status: string) => {
    try {
      const endpoint = status === 'rejete'
        ? `/services/${serviceId}/reject`
        : `/services/${serviceId}/validate`;
      const response = await httpClient.post(endpoint, { statut: status });
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.serviceStatusUpdated')
        });
        await loadServices();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.statusUpdateFailed'),
        variant: "destructive"
      });
    }
  };

  
const loadOeuvres = useCallback(async (filters?: OeuvreFilters) => {
  if (loadingOeuvres) return; // Éviter les appels multiples
  
  setLoadingOeuvres(true);
  try {
    const response = await adminService.getOeuvres(filters);
    
    if (response.success && response.data) {
      setOeuvres(response.data);
    }
  } catch (error: any) {
    // Gérer l'erreur sans redirection
    if (error.response?.status !== 401) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadOeuvresFailed'),
        variant: "destructive"
      });
    }
    
    setOeuvres({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, totalPages: 1 } });
  } finally {
    setLoadingOeuvres(false);
  }
}, [loadingOeuvres, toast]);

const loadEvenements = useCallback(async (filters?: EvenementFilters) => {
  if (loadingEvenements) return;
  
  setLoadingEvenements(true);
  try {
    const response = await adminService.getEvenements(filters);
    
    if (response.success && response.data) {
      setEvenements(response.data);
    }
  } catch (error: any) {
    if (error.response?.status !== 401) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadEventsFailed'),
        variant: "destructive"
      });
    }
    
    setEvenements({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, totalPages: 1 } });
  } finally {
    setLoadingEvenements(false);
  }
}, [loadingEvenements, toast]);

const loadPatrimoineItems = useCallback(async (filters?: PatrimoineFilters) => {
  if (loadingPatrimoine) return;
  
  setLoadingPatrimoine(true);
  try {
    const response = await adminService.getPatrimoineItems(filters);
    
    if (response.success && response.data) {
      setPatrimoineItems(response.data);
    }
  } catch (error: any) {
    if (error.response?.status !== 401) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadPatrimoineFailed'),
        variant: "destructive"
      });
    }
    
    setPatrimoineItems({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, totalPages: 1 } });
  } finally {
    setLoadingPatrimoine(false);
  }
}, [loadingPatrimoine, toast]);

const loadServices = useCallback(async (filters?: ServiceFilters) => {
  if (loadingServices) return;
  
  setLoadingServices(true);
  try {
    const response = await adminService.getServices(filters);
    
    if (response.success && response.data) {
      setServices(response.data);
    }
  } catch (error: any) {
    if (error.response?.status !== 401) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadServicesFailed'),
        variant: "destructive"
      });
    }
    
    setServices({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, totalPages: 1 } });
  } finally {
    setLoadingServices(false);
  }
}, [loadingServices, toast]);

// Mettez aussi à jour les fonctions de suppression :
const deleteOeuvre = async (oeuvreId: number) => {
  try {
    const response = await adminService.deleteOeuvre(oeuvreId);
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: t('toasts.oeuvreDeleted')
      });
      await loadOeuvres();
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.oeuvreDeleteFailed'),
      variant: "destructive"
    });
  }
};

const deleteEvenement = async (evenementId: number) => {
  try {
    const response = await adminService.deleteEvenement(evenementId);
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: t('toasts.eventDeleted')
      });
      await loadEvenements();
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.eventDeleteFailed'),
      variant: "destructive"
    });
  }
};

const deleteService = async (serviceId: number) => {
  try {
    const response = await adminService.deleteService(serviceId);
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: t('toasts.serviceDeleted')
      });
      await loadServices();
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.serviceDeleteFailed'),
      variant: "destructive"
    });
  }
};
  // ========================================
  // ACTIONS MODÉRATION
  // ========================================

  const moderateSignalement = async ({ signalementId, action }: { signalementId: number; action: string }) => {
    try {
      const response = await adminService.moderateSignalement(signalementId, action as any);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.signalementProcessed')
        });
        await loadModerationQueue();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.signalementProcessFailed'),
        variant: "destructive"
      });
    }
  };

  // ========================================
  // ACTIONS GLOBALES
  // ========================================

  const refreshAll = async () => {
    setLoading(true);
    switch (activeTab) {
      case 'overview':
        await Promise.all([loadOverview(), loadStats(), loadPatrimoineStats(), loadPendingUsers(), loadPendingOeuvres(), loadAlerts()]);
        break;
      case 'users':
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
        break;
      case 'oeuvres':
        await Promise.all([loadOeuvres(), loadPendingOeuvres()]);
        break;
      case 'evenements':
        await loadEvenements();
        break;
      case 'patrimoine':
        await loadPatrimoineItems();
        break;
      case 'services':
        await loadServices();
        break;
      case 'moderation':
        await loadModerationQueue();
        break;
    }
    setLoading(false);
  };

  const changePeriod = async (period: 'day' | 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
    await loadStats(period);
  };

  const exportReport = async (type: string) => {
    try {
      const response = type === 'activity' 
        ? await adminService.getActivityReport(selectedPeriod)
        : type === 'moderation'
        ? await adminService.getModerationReport(selectedPeriod)
        : await adminService.getPatrimoineReport();
        
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.reportExported')
        });
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.reportExportFailed'),
        variant: "destructive"
      });
    }
  };

  const clearCache = async () => {
    try {
      const response = await adminService.clearCache();
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.cacheCleared')
        });
        await refreshAll();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.cacheClearFailed'),
        variant: "destructive"
      });
    }
  };

  return {
    // Données
    overview,
    stats,
    patrimoineStats,
    allUsers,
    pendingUsers,
    pendingOeuvres,
    moderationQueue,
    alerts,
    oeuvres,
    evenements,
    patrimoineItems,
    services,
    
    // États de chargement
    loading,
    loadingOverview,
    loadingAllUsers,
    loadingPendingUsers,
    loadingPendingOeuvres,
    loadingModeration,
    loadingOeuvres,
    loadingEvenements,
    loadingPatrimoine,
    loadingServices,
    
    // Actions utilisateurs
    validateUser,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    resetUserPassword,
    bulkUserAction,
    exportUsers,
    
    // Actions œuvres
    validateOeuvre,
    updateOeuvreStatus,
    deleteOeuvre,
    
    // Actions événements
    updateEvenementStatus,
    deleteEvenement,
    
    // Actions services
    updateServiceStatus,
    deleteService,
    
    // Actions modération
    moderateSignalement,
    
    // Actions globales
    refreshAll,
    changePeriod,
    exportReport,
    clearCache,
    
    // Fonctions de chargement
    loadAllUsers,
    loadOeuvres,
    loadEvenements,
    loadPatrimoineItems,
    loadServices,
    
    // État
    activeTab,
    selectedPeriod,
  };
};