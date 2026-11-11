// hooks/useDashboardAdmin.ts - VERSION SIMPLIFIÉE
import { httpClient } from '@/services/httpClient';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { useToast } from '@/components/ui/use-toast';
import { adminService } from '@/services/admin.service';
import { evenementService } from '@/services/evenement.service';
import { TAILLE_PAGE_ADMIN } from '@/hooks/useListeServeur';
import type { PaginatedResponse } from '@/config/api';
import type { Oeuvre, Evenement, Lieu } from '@/types';
import type { Service } from '@/types/models/lieux-details.types';

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

/** Pagination de la réponse, quelle que soit sa forme (« pages » ou « totalPages », dans data ou à côté) */
const paginationDe = (response: any, raw: any, nbLignes: number, limit = TAILLE_PAGE_ADMIN) => {
  const p = response?.pagination || raw?.pagination;
  if (!p) return { total: nbLignes, page: 1, limit, pages: 1 } as any;
  return { ...p, pages: p.pages ?? p.totalPages ?? 1 };
};

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
  const [allUsers, setAllUsers] = useState<PaginatedResponse<PendingUser> | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PaginatedResponse<PendingUser> | null>(null);
  const [pendingOeuvres, setPendingOeuvres] = useState<PaginatedResponse<PendingOeuvre> | null>(null);
  const [moderationQueue, setModerationQueue] = useState<PaginatedResponse<ModerationItem> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // États pour les données étendues (depuis les endpoints publics)
  const [oeuvres, setOeuvres] = useState<PaginatedResponse<Oeuvre> | null>(null);
  const [evenements, setEvenements] = useState<PaginatedResponse<Evenement> | null>(null);
  const [patrimoineItems, setPatrimoineItems] = useState<PaginatedResponse<Lieu> | null>(null);
  const [services, setServices] = useState<PaginatedResponse<Service> | null>(null);
  
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

  // Derniers filtres de chaque liste : recharger après une action ne doit pas ramener à la page 1 sans filtre
  const derniersFiltres = useRef<Record<string, any>>({});
  // Seule la réponse à la dernière demande compte (filtre changé pendant un chargement)
  const demandes = useRef<Record<string, number>>({});
  const nouvelleDemande = (liste: string, params: any) => {
    const filtres = params ?? derniersFiltres.current[liste] ?? {};
    derniersFiltres.current[liste] = filtres;
    const numero = (demandes.current[liste] || 0) + 1;
    demandes.current[liste] = numero;
    return { filtres: { page: 1, limit: TAILLE_PAGE_ADMIN, ...filtres }, aJour: () => demandes.current[liste] === numero };
  };
  // À valider, toutes pages confondues (compté dans la page affichée, le nombre était faux)
  const [attenteEvenements, setAttenteEvenements] = useState(0);
  const [attenteServices, setAttenteServices] = useState(0);

  // États d'erreur
  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorAllUsers, setErrorAllUsers] = useState<string | null>(null);
  const [errorPendingUsers, setErrorPendingUsers] = useState<string | null>(null);
  const [errorPendingOeuvres, setErrorPendingOeuvres] = useState<string | null>(null);
  const [errorModeration, setErrorModeration] = useState<string | null>(null);
  const [errorOeuvres, setErrorOeuvres] = useState<string | null>(null);
  const [errorEvenements, setErrorEvenements] = useState<string | null>(null);
  const [errorPatrimoine, setErrorPatrimoine] = useState<string | null>(null);
  const [errorServices, setErrorServices] = useState<string | null>(null);
  
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
    setErrorOverview(null);
    try {
      const response = await adminService.getOverview();
      if (response.success && response.data) {
        setOverview(response.data);
      }
    } catch (error) {
      setErrorOverview(t('toasts.loadOverviewFailed'));
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
    const { filtres, aJour } = nouvelleDemande('users', params);
    setLoadingAllUsers(true);
    setErrorAllUsers(null);
    try {
      const response = await adminService.getAllUsers(filtres);
      if (aJour() && response.success && response.data) {
        const raw = response.data as any;
        const items = raw.items || raw.data || [];
        setAllUsers({ items, pagination: paginationDe(response, raw, items.length) });
      }
    } catch (error) {
      if (aJour()) setErrorAllUsers(t('toasts.loadUsersFailed', 'Erreur lors du chargement des utilisateurs'));
    } finally {
      if (aJour()) setLoadingAllUsers(false);
    }
  };

  const loadPendingUsers = async () => {
    setLoadingPendingUsers(true);
    setErrorPendingUsers(null);
    try {
      // Cinq pour la vue d'ensemble ; le nombre total vient de la pagination
      const response = await adminService.getPendingUsers({ page: 1, limit: 5 });
      if (response.success && response.data) {
        setPendingUsers(response.data);
      }
    } catch (error) {
      setErrorPendingUsers(t('toasts.loadPendingUsersFailed', 'Erreur lors du chargement des utilisateurs en attente'));
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  const loadPendingOeuvres = async () => {
    setLoadingPendingOeuvres(true);
    setErrorPendingOeuvres(null);
    try {
      const response = await adminService.getPendingOeuvres({ page: 1, limit: 5 });
      if (response.success && response.data) {
        const raw = response.data as any;
        const items = raw.items || raw.data || [];
        setPendingOeuvres({ items, pagination: paginationDe(response, raw, items.length, 5) });
      }
    } catch (error) {
      setErrorPendingOeuvres(t('toasts.loadPendingOeuvresFailed', 'Erreur lors du chargement des œuvres en attente'));
    } finally {
      setLoadingPendingOeuvres(false);
    }
  };

  const loadModerationQueue = async (params?: { page?: number; limit?: number; type?: string }) => {
    const { filtres, aJour } = nouvelleDemande('moderation', params);
    setLoadingModeration(true);
    setErrorModeration(null);
    try {
      const response = await adminService.getModerationQueue(filtres);
      if (aJour() && response.success && response.data) {
        setModerationQueue(response.data);
      }
    } catch (error) {
      if (aJour()) setErrorModeration(t('toasts.loadModerationFailed', 'Erreur lors du chargement de la modération'));
    } finally {
      if (aJour()) setLoadingModeration(false);
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
      setPendingUsers((prev: PaginatedResponse<PendingUser> | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items?.filter((u: PendingUser) => u.id_user !== userId) || [],
          pagination: prev.pagination ? {
            ...prev.pagination,
            total: Math.max(0, (prev.pagination.total || 0) - 1)
          } : prev.pagination
        };
      });
      
      // Rafraîchir aussi la liste complète et le compteur
      await Promise.all([loadAllUsers(), loadPendingUsers()]);
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.userValidationFailed'),
      variant: "destructive"
    });
  }
};

  const updateUser = async ({ userId, data }: { userId: number; data: Partial<PendingUser> }) => {
    try {
      const response = await adminService.updateUser(userId, data);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('toasts.userUpdated')
        });
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
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
        // Les deux listes (tous les utilisateurs, en attente) : le compte supprimé disparaît des deux
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
      } else {
        toast({ title: t('toasts.error'), description: messageErreurServeur(response, t('toasts.userDeleteFailed', "Impossible de supprimer l'utilisateur")), variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        // Raison du serveur (compte administrateur, contenus liés…) plutôt qu'un échec générique
        description: messageErreurServeur(error, t('toasts.userDeleteFailed', "Impossible de supprimer l'utilisateur")),
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
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
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
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
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
          description: t('toasts.passwordResetLink', 'Mot de passe réinitialisé : la personne a reçu par e-mail un lien pour en choisir un nouveau.')
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

  const verifyEmailManually = async ({ userId }: { userId: number }) => {
    try {
      const response = await adminService.verifyEmailManually(userId);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: t('admin.emailVerified', 'Email vérifié avec succès')
        });
        await loadAllUsers();
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('admin.emailVerifyFailed', 'Impossible de vérifier l\'email'),
        variant: "destructive"
      });
    }
  };

  const bulkUserAction = async (userIds: number[], action: string) => {
    try {
      const response = await adminService.bulkUserAction(userIds, action as 'activate' | 'deactivate' | 'delete' | 'change_role');
      if (response.success) {
        // Bilan du serveur : un administrateur coché n'est pas traité, le message ne doit pas le compter
        const bilan = response.data as unknown as { success?: number[]; errors?: unknown[] } | undefined;
        const refuses = bilan?.errors?.length ?? 0;
        const traites = bilan?.success?.length ?? userIds.length;
        if (traites > 0) {
          toast({
            title: t('toasts.success'),
            description: t('toasts.bulkActionApplied', { action, count: traites })
          });
        }
        if (refuses > 0) {
          toast({
            title: t('toasts.error'),
            description: t('toasts.bulkActionPartial', '{{count}} compte(s) non traité(s), par exemple un administrateur ou votre propre compte.', { count: refuses }),
            variant: "destructive"
          });
        }
        await Promise.all([loadAllUsers(), loadPendingUsers()]);
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.bulkActionFailed'),
        variant: "destructive"
      });
    }
  };

  const exportUsers = async (format: 'csv' | 'excel', filters?: Record<string, string>) => {
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

  // Refus : motif obligatoire (envoyé à l'auteur)
  const validateOeuvre = async ({ oeuvreId, validated, motif }: { oeuvreId: number; validated: boolean; motif?: string }) => {
    try {
      const response = await adminService.validateOeuvre(oeuvreId, validated, motif);
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: validated ? t('toasts.oeuvreValidated') : t('toasts.oeuvreRejected')
        });
        // Les deux listes : sinon l'onglet Œuvres gardait l'ancien statut
        await Promise.all([loadPendingOeuvres(), loadOeuvres()]);
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        // Message du serveur (œuvre déjà traitée, motif manquant…) plutôt qu'un échec générique
        description: messageErreurServeur(error, t('toasts.oeuvreValidationFailed', "Impossible de valider l'œuvre")),
        variant: "destructive"
      });
    }
  };

  const updateOeuvreStatus = async (oeuvreId: number, status: string, motif?: string) => {
    try {
      const endpoint = status === 'rejete' 
        ? `/oeuvres/${oeuvreId}/reject` 
        : `/oeuvres/${oeuvreId}/validate`;
      // Le serveur lit « motif » (refus) ; « statut » était ignoré et le refus toujours en erreur 400
      const response = await httpClient.post(endpoint, status === 'rejete' ? { motif } : {});
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

  /** Publier un événement (status « publie »), ou le refuser (« rejete », avec un motif : retour en brouillon) */
  const updateEvenementStatus = async (evenementId: number, status: string, raison?: string) => {
    try {
      const response = await httpClient.post(`/evenements/${evenementId}/publish`, { statut: status, raison });
      if (response.success) {
        toast({
          title: t('toasts.success'),
          description: status === 'rejete'
            ? t('admin.events.rejected', 'Événement refusé : l’organisateur a reçu votre motif.')
            : t('admin.events.published', 'Événement publié : l’organisateur a été prévenu.')
        });
        await loadEvenements();
      } else {
        toast({ title: t('toasts.error'), description: messageErreurServeur(response, t('toasts.statusUpdateFailed', 'Impossible de mettre à jour le statut')), variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: t('toasts.error'),
        // Refus du serveur (motif manquant ou trop court…) : sa raison, au lieu d'un échec générique
        description: messageErreurServeur(error, t('toasts.statusUpdateFailed', 'Impossible de mettre à jour le statut')),
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

  
const loadOeuvres = useCallback(async (params?: OeuvreFilters & { q?: string }) => {
  const { filtres: filters, aJour } = nouvelleDemande('oeuvres', params);
  setLoadingOeuvres(true);
  setErrorOeuvres(null);
  try {
    const response = await adminService.getOeuvres(filters);

    if (aJour() && response.success && response.data) {
      const raw = response.data as any;
      const items = Array.isArray(raw) ? raw : (raw.items || raw.oeuvres || raw.data || []);
      setOeuvres({ items, pagination: paginationDe(response, raw, items.length) });
    }
  } catch (error: unknown) {
    if (!aJour()) return;
    const status = error instanceof Error && 'status' in error ? (error as { status?: number }).status : undefined;
    if (status !== 401) {
      setErrorOeuvres(t('toasts.loadOeuvresFailed'));
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadOeuvresFailed'),
        variant: "destructive"
      });
    }

    setOeuvres({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, pages: 1 } });
  } finally {
    if (aJour()) setLoadingOeuvres(false);
  }
}, [toast]);

const loadEvenements = useCallback(async (params?: EvenementFilters & { q?: string }) => {
  const { filtres: filters, aJour } = nouvelleDemande('evenements', params);
  setLoadingEvenements(true);
  setErrorEvenements(null);
  try {
    const [response, attente] = await Promise.all([
      adminService.getEvenements(filters),
      adminService.getEvenements({ statut: 'en_attente', page: 1, limit: 1 }).catch(() => null)
    ]);

    if (aJour() && response.success && response.data) {
      const raw = response.data as any;
      const items = Array.isArray(raw) ? raw : (raw.items || raw.data || []);
      setEvenements({ items, pagination: paginationDe(response, raw, items.length) });
      setAttenteEvenements(Number((attente as any)?.pagination?.total) || 0);
    }
  } catch (error: unknown) {
    if (!aJour()) return;
    const status = error instanceof Error && 'status' in error ? (error as { status?: number }).status : undefined;
    if (status !== 401) {
      setErrorEvenements(t('toasts.loadEventsFailed'));
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadEventsFailed'),
        variant: "destructive"
      });
    }

    setEvenements({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, pages: 1 } });
  } finally {
    if (aJour()) setLoadingEvenements(false);
  }
}, [toast]);

const loadPatrimoineItems = useCallback(async (params?: PatrimoineFilters & { q?: string; typePatrimoine?: string }) => {
  const { filtres: filters, aJour } = nouvelleDemande('patrimoine', params);
  setLoadingPatrimoine(true);
  setErrorPatrimoine(null);
  try {
    const response = await adminService.getPatrimoineItems(filters);

    if (aJour() && response.success) {
      const raw = response.data as any;
      const items = Array.isArray(raw) ? raw : (raw?.items || raw?.data || raw?.sites || []);
      setPatrimoineItems({ items, pagination: paginationDe(response, raw, items.length) });
    }
  } catch (error: unknown) {
    if (!aJour()) return;
    const status = error instanceof Error && 'status' in error ? (error as { status?: number }).status : undefined;
    if (status !== 401) {
      setErrorPatrimoine(t('toasts.loadPatrimoineFailed'));
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadPatrimoineFailed'),
        variant: "destructive"
      });
    }

    setPatrimoineItems({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, pages: 1 } });
  } finally {
    if (aJour()) setLoadingPatrimoine(false);
  }
}, [toast]);

const loadServices = useCallback(async (params?: ServiceFilters & { q?: string }) => {
  const { filtres: filters, aJour } = nouvelleDemande('services', params);
  setLoadingServices(true);
  setErrorServices(null);
  try {
    const [response, attente] = await Promise.all([
      adminService.getServices(filters),
      adminService.getServices({ statut: 'en_attente', page: 1, limit: 1 }).catch(() => null)
    ]);

    if (aJour() && response.success && response.data) {
      // Le serveur renvoie { data: [services], pagination }
      const raw = response.data as any;
      const items = Array.isArray(raw) ? raw : (raw.items || raw.data || []);
      setServices({ items, pagination: paginationDe(response, raw, items.length) });
      setAttenteServices(Number((attente as any)?.pagination?.total) || 0);
    }
  } catch (error: unknown) {
    if (!aJour()) return;
    const status = error instanceof Error && 'status' in error ? (error as { status?: number }).status : undefined;
    if (status !== 401) {
      setErrorServices(t('toasts.loadServicesFailed'));
      toast({
        title: t('toasts.error'),
        description: t('toasts.loadServicesFailed'),
        variant: "destructive"
      });
    }

    setServices({ items: [], pagination: { total: 0, page: 1, limit: filters?.limit || 10, pages: 1 } });
  } finally {
    if (aJour()) setLoadingServices(false);
  }
}, [toast]);

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
      // Mise à jour optimiste : retirer l'élément du state local
      setEvenements((prev) => {
        if (!prev?.items) return prev;
        return {
          ...prev,
          items: prev.items.filter((e) =>
            (e as unknown as Record<string, unknown>).id_evenement !== evenementId
          ),
        };
      });
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.eventDeleteFailed'),
      variant: "destructive"
    });
  }
};

const cancelEvenement = async (evenementId: number, motif?: string) => {
  try {
    const response = await evenementService.cancel(evenementId, motif || 'Annulé par l\'administrateur');
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: t('toasts.eventCancelled', 'Événement annulé avec succès')
      });
      // Mise à jour optimiste : modifier le statut directement dans le state local
      setEvenements((prev) => {
        if (!prev?.items) return prev;
        return {
          ...prev,
          items: prev.items.map((e) =>
            (e as unknown as Record<string, unknown>).id_evenement === evenementId
              ? { ...e, statut: 'annule' } as Evenement
              : e
          ),
        };
      });
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      description: t('toasts.eventCancelFailed', 'Erreur lors de l\'annulation'),
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

const validateService = async (serviceId: number, validated: boolean, motif?: string) => {
  try {
    const response = await adminService.validateService(serviceId, validated, motif);
    if (response.success) {
      toast({
        title: t('toasts.success'),
        description: validated
          ? t('admin.services.published', 'Service publié : le professionnel a été prévenu.')
          : t('admin.services.rejected', 'Service refusé : le professionnel a reçu votre motif.')
      });
      await loadServices();
    } else {
      toast({ title: t('toasts.error'), description: messageErreurServeur(response, t('toasts.serviceValidationFailed', 'Erreur de validation')), variant: 'destructive' });
    }
  } catch (error) {
    toast({
      title: t('toasts.error'),
      // Refus du serveur (motif manquant…) : sa raison, au lieu d'un échec générique
      description: messageErreurServeur(error, t('toasts.serviceValidationFailed', 'Erreur de validation')),
      variant: "destructive"
    });
  }
};
  // ========================================
  // ACTIONS MODÉRATION
  // ========================================

  const moderateSignalement = async ({ signalementId, action }: { signalementId: number; action: string }) => {
    try {
      const response = await adminService.moderateSignalement(signalementId, action as 'aucune' | 'avertissement' | 'suppression_contenu' | 'suspension_temporaire' | 'suspension_permanente');
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
        // Message du serveur (compte administrateur, signalement déjà traité…) plutôt qu'un échec générique
        description: messageErreurServeur(error, t('toasts.signalementProcessFailed', 'Impossible de traiter le signalement')),
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
    attenteEvenements,
    attenteServices,
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

    // États d'erreur
    errorOverview,
    errorAllUsers,
    errorPendingUsers,
    errorPendingOeuvres,
    errorModeration,
    errorOeuvres,
    errorEvenements,
    errorPatrimoine,
    errorServices,
    
    // Actions utilisateurs
    validateUser,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    resetUserPassword,
    verifyEmailManually,
    bulkUserAction,
    exportUsers,
    
    // Actions œuvres
    validateOeuvre,
    updateOeuvreStatus,
    deleteOeuvre,
    
    // Actions événements
    updateEvenementStatus,
    deleteEvenement,
    cancelEvenement,
    
    // Actions services
    updateServiceStatus,
    deleteService,
    validateService,
    
    // Actions modération
    moderateSignalement,
    
    // Actions globales
    refreshAll,
    changePeriod,
    exportReport,
    clearCache,
    
    // Fonctions de chargement
    loadModerationQueue,
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