// hooks/useDashboardAdmin.ts - VERSION SIMPLIFIÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { adminService } from '@/services/admin.service';
import { httpClient } from '@/services/httpClient';
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

export const useDashboardAdmin = () => {
  const { toast } = useToast();
  
  // États pour les données
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patrimoineStats, setPatrimoineStats] = useState<PatrimoineStats | null>(null);
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
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [loadingPendingOeuvres, setLoadingPendingOeuvres] = useState(false);
  const [loadingModeration, setLoadingModeration] = useState(false);
  const [loadingOeuvres, setLoadingOeuvres] = useState(false);
  const [loadingEvenements, setLoadingEvenements] = useState(false);
  const [loadingPatrimoine, setLoadingPatrimoine] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // État pour la période sélectionnée
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Chargement initial
  useEffect(() => {
    loadOverview();
    loadStats();
    loadPatrimoineStats();
    loadPendingUsers();
    loadPendingOeuvres();
    loadModerationQueue();
    loadAlerts();
  }, []);

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
      console.error('Erreur chargement overview:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la vue d'ensemble",
        variant: "destructive"
      });
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminService.getStats(selectedPeriod);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadPatrimoineStats = async () => {
    try {
      const response = await adminService.getPatrimoineStats();
      if (response.success && response.data) {
        setPatrimoineStats(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement patrimoine stats:', error);
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
      console.error('Erreur chargement utilisateurs:', error);
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
      console.error('Erreur chargement œuvres en attente:', error);
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
      console.error('Erreur chargement modération:', error);
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
      console.error('Erreur chargement alertes:', error);
      setAlerts([]);
    }
  };

  // ========================================
  // CHARGEMENT DES DONNÉES ÉTENDUES (via endpoints publics)
  // ========================================

 

  // ========================================
  // ACTIONS UTILISATEURS
  // ========================================

  const validateUser = async ({ userId, validated }: { userId: number; validated: boolean }) => {
    try {
      const response = await adminService.validateUser(userId, validated);
      if (response.success) {
        toast({
          title: "Succès",
          description: validated ? "Utilisateur validé" : "Utilisateur rejeté"
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur validation utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const updateUser = async ({ userId, data }: { userId: number; data: any }) => {
    try {
      const response = await adminService.updateUser(userId, data);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur mis à jour"
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur supprimé"
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      toast({
        title: "Erreur", 
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const suspendUser = async ({ userId, duration, reason }: { userId: number; duration: number; reason: string }) => {
    try {
      const response = await adminService.suspendUser(userId, duration, reason);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur suspendu"
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur suspension utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de suspendre l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const reactivateUser = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.reactivateUser(userId);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Utilisateur réactivé"
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur réactivation utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réactiver l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const resetUserPassword = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.resetUserPassword(userId);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Mot de passe réinitialisé"
        });
      }
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe",
        variant: "destructive"
      });
    }
  };

  const bulkUserAction = async (userIds: number[], action: string) => {
    try {
      const response = await adminService.bulkUserAction(userIds, action as any);
      if (response.success) {
        toast({
          title: "Succès",
          description: `Action ${action} appliquée à ${userIds.length} utilisateurs`
        });
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Erreur action bulk:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer l'action",
        variant: "destructive"
      });
    }
  };

  const exportUsers = async (format: 'csv' | 'excel', filters?: any) => {
    try {
      const response = await adminService.exportUsers(format, filters);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Export des utilisateurs terminé"
        });
      }
    } catch (error) {
      console.error('Erreur export utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les utilisateurs",
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
          title: "Succès",
          description: validated ? "Œuvre validée" : "Œuvre rejetée"
        });
        await loadPendingOeuvres();
      }
    } catch (error) {
      console.error('Erreur validation œuvre:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider l'œuvre",
        variant: "destructive"
      });
    }
  };

  const updateOeuvreStatus = async (oeuvreId: number, status: string) => {
    try {
      const response = await httpClient.patch(`/oeuvres/${oeuvreId}/status`, {
        statut: status,
        admin_action: true
      });
      if (response.success) {
        toast({
          title: "Succès",
          description: "Statut de l'œuvre mis à jour"
        });
        await loadOeuvres();
      }
    } catch (error) {
      console.error('Erreur mise à jour statut œuvre:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  

  // ========================================
  // ACTIONS ÉVÉNEMENTS
  // ========================================

  const updateEvenementStatus = async (evenementId: number, status: string) => {
    try {
      const response = await httpClient.patch(`/evenements/${evenementId}/status`, {
        statut: status,
        admin_action: true
      });
      if (response.success) {
        toast({
          title: "Succès",
          description: "Statut de l'événement mis à jour"
        });
        await loadEvenements();
      }
    } catch (error) {
      console.error('Erreur mise à jour statut événement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  
  // ========================================
  // ACTIONS SERVICES
  // ========================================

  const updateServiceStatus = async (serviceId: number, status: string) => {
    try {
      const response = await httpClient.patch(`/services/${serviceId}/status`, {
        statut: status,
        admin_action: true
      });
      if (response.success) {
        toast({
          title: "Succès",
          description: "Statut du service mis à jour"
        });
        await loadServices();
      }
    } catch (error) {
      console.error('Erreur mise à jour statut service:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
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
    console.error('Erreur chargement œuvres:', error);
    
    // Gérer l'erreur sans redirection
    if (error.response?.status !== 401) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les œuvres",
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
    console.error('Erreur chargement événements:', error);
    
    if (error.response?.status !== 401) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
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
    console.error('Erreur chargement sites patrimoniaux:', error);
    
    if (error.response?.status !== 401) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les sites patrimoniaux",
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
    console.error('Erreur chargement services:', error);
    
    if (error.response?.status !== 401) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les services",
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
        title: "Succès",
        description: "Œuvre supprimée"
      });
      await loadOeuvres();
    }
  } catch (error) {
    console.error('Erreur suppression œuvre:', error);
    toast({
      title: "Erreur",
      description: "Impossible de supprimer l'œuvre",
      variant: "destructive"
    });
  }
};

const deleteEvenement = async (evenementId: number) => {
  try {
    const response = await adminService.deleteEvenement(evenementId);
    if (response.success) {
      toast({
        title: "Succès",
        description: "Événement supprimé"
      });
      await loadEvenements();
    }
  } catch (error) {
    console.error('Erreur suppression événement:', error);
    toast({
      title: "Erreur",
      description: "Impossible de supprimer l'événement",
      variant: "destructive"
    });
  }
};

const deleteService = async (serviceId: number) => {
  try {
    const response = await adminService.deleteService(serviceId);
    if (response.success) {
      toast({
        title: "Succès",
        description: "Service supprimé"
      });
      await loadServices();
    }
  } catch (error) {
    console.error('Erreur suppression service:', error);
    toast({
      title: "Erreur",
      description: "Impossible de supprimer le service",
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
          title: "Succès",
          description: "Signalement traité"
        });
        await loadModerationQueue();
      }
    } catch (error) {
      console.error('Erreur modération signalement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter le signalement",
        variant: "destructive"
      });
    }
  };

  // ========================================
  // ACTIONS GLOBALES
  // ========================================

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      loadOverview(),
      loadStats(),
      loadPatrimoineStats(),
      loadPendingUsers(),
      loadPendingOeuvres(),
      loadModerationQueue(),
      loadAlerts()
    ]);
    setLoading(false);
  };

  const changePeriod = async (period: 'day' | 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
    await loadStats();
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
          title: "Succès",
          description: "Rapport exporté"
        });
      }
    } catch (error) {
      console.error('Erreur export rapport:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le rapport",
        variant: "destructive"
      });
    }
  };

  const clearCache = async () => {
    try {
      const response = await adminService.clearCache();
      if (response.success) {
        toast({
          title: "Succès",
          description: "Cache vidé"
        });
        await refreshAll();
      }
    } catch (error) {
      console.error('Erreur vidage cache:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vider le cache",
        variant: "destructive"
      });
    }
  };

  return {
    // Données
    overview,
    stats,
    patrimoineStats,
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
    loadOeuvres,
    loadEvenements,
    loadPatrimoineItems,
    loadServices,
    
    // État
    selectedPeriod,
  };
};