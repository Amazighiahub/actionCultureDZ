// ====================================
// HOOK useHomepageData - version simple pour compatibilité
// ====================================

export const useHomepageDataCompat = () => {
  const { stats, loading } = useHomePageOptimized();
  
  return {
    stats,
    statsLoading: loading.stats,
    reloadStats: () => {} // No-op pour compatibilité
  };
};// hooks/useHomePage.ts - Version avec méthodes spécifiques
// Import ajouté en haut du fichier
import { useState, useEffect, useCallback, useRef } from 'react';
import OeuvreService from '../services/oeuvre.service';
import EvenementService from '../services/evenement.service';
import PatrimoineService from '../services/patrimoine.service';
import { Oeuvre } from '../types/Oeuvre.types';
import { Evenement } from '../types/Evenement.types';
import { Lieu } from '../types/Geographie.types';
import { 
  ApiResponse, 
  PaginatedApiResponse, 
  PaginationInfo,
  getErrorMessage 
} from '../types/api.types';

// ====================================
// INTERFACES
// ====================================

interface UseListOptions {
  page?: number;
  limit?: number;
}

interface UseListResult<T> {
  items: T[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  goToPage: (page: number) => void;
  reload: () => void;
}

interface SearchState {
  oeuvres: Oeuvre[];
  evenements: Evenement[];
  sites: Lieu[];
  isSearching: boolean;
  hasResults: boolean;
}

interface GlobalSearchHook extends SearchState {
  query: string;
  setQuery: (query: string) => void;
  clearSearch: () => void;
}

interface HomepageStats {
  total_oeuvres: number;
  total_evenements: number;
  total_lieux: number;
  total_users: number;
}

// ====================================
// HOOK PRINCIPAL OPTIMISÉ - useHomePageOptimized
// Ce hook charge toutes les données de la page d'accueil de manière séquentielle
// avec des délais entre les appels pour éviter le rate limiting (erreur 429)
// ====================================

export const useHomePageOptimized = () => {
  const [data, setData] = useState({
    oeuvres: [] as Oeuvre[],
    evenements: [] as Evenement[],
    sites: [] as Lieu[],
    stats: null as HomepageStats | null
  });
  
  const [loading, setLoading] = useState({
    oeuvres: true,
    evenements: true,
    sites: true,
    stats: true
  });
  
  const [errors, setErrors] = useState({
    oeuvres: null as string | null,
    evenements: null as string | null,
    sites: null as string | null,
    stats: null as string | null
  });
  
  const hasLoadedRef = useRef(false);

  const loadAllData = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    // Charger les données avec un délai entre chaque appel pour éviter le rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. Charger les œuvres récentes
    try {
      const oeuvresResponse = await OeuvreService.getRecent(6);
      if (oeuvresResponse.success && oeuvresResponse.data) {
        setData(prev => ({ ...prev, oeuvres: oeuvresResponse.data || [] }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, oeuvres: error.message || 'Erreur de chargement' }));
    } finally {
      setLoading(prev => ({ ...prev, oeuvres: false }));
    }

    await delay(500); // Attendre 500ms avant la prochaine requête

    // 2. Charger les événements à venir
    try {
      const evenementsResponse = await EvenementService.getUpcoming({ limit: 6, page: 1 });
      if (evenementsResponse.success && evenementsResponse.data) {
        setData(prev => ({ ...prev, evenements: evenementsResponse.data || [] }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, evenements: error.message || 'Erreur de chargement' }));
    } finally {
      setLoading(prev => ({ ...prev, evenements: false }));
    }

    await delay(500);

    // 3. Charger les sites populaires
    try {
      const sitesResponse = await PatrimoineService.getSitesPopulaires(6);
      if (sitesResponse.success && sitesResponse.data) {
        setData(prev => ({ ...prev, sites: sitesResponse.data || [] }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, sites: error.message || 'Erreur de chargement' }));
    } finally {
      setLoading(prev => ({ ...prev, sites: false }));
    }

    await delay(500);

    // 4. Charger les statistiques
    try {
      const [oeuvresCount, evenementsCount, sitesCount] = await Promise.all([
        OeuvreService.getAll({ limit: 1, page: 1 }),
        EvenementService.getAll({ limit: 1, page: 1 }),
        PatrimoineService.getSites({ limit: 1, page: 1 })
      ]);
      
      const stats: HomepageStats = {
        total_oeuvres: oeuvresCount.pagination?.total || 0,
        total_evenements: evenementsCount.pagination?.total || 0,
        total_lieux: sitesCount.pagination?.total || 0,
        total_users: 0
      };
      
      setData(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setData(prev => ({ 
        ...prev, 
        stats: {
          total_oeuvres: 0,
          total_evenements: 0,
          total_lieux: 0,
          total_users: 0
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  return {
    ...data,
    loading,
    errors,
    isLoading: Object.values(loading).some(l => l),
    hasError: Object.values(errors).some(e => e !== null),
    reload: () => {
      hasLoadedRef.current = false;
      loadAllData();
    }
  };
};

// ====================================
// HOOK - useHomepageData (compatibilité pour les statistiques uniquement)
// ====================================



// ====================================
// HOOK PRINCIPAL - useHomepageData (version compatible utilisant le hook optimisé)
// ====================================

export const useHomepageData = () => {
  const { stats, loading } = useHomePageOptimized();
  
  return {
    stats,
    statsLoading: loading.stats,
    reloadStats: () => {} // No-op pour compatibilité
  };
};

// ====================================
// HOOK GÉNÉRIQUE pour les listes avec pagination
// ====================================

const useGenericList = <T>(
  fetchFunction: (params: any) => Promise<PaginatedApiResponse<T>>,
  filters: Record<string, any> = {},
  options: UseListOptions = {}
): UseListResult<T> & { 
  oeuvres?: T[]; 
  evenements?: T[]; 
  sites?: T[]; 
  pagination: PaginationInfo | null 
} => {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(options.page || 1);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = {
        ...filters,
        limit: options.limit || 10,
        page: page,
        sort: 'created_at',
        order: 'desc'
      };
      
      const response = await fetchFunction(params);
      
      if (response.success && response.data) {
        setItems(response.data);
        setPagination(response.pagination || null);
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement'));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
      setItems([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction, filters, options.limit, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    items,
    pagination,
    isLoading,
    error,
    page,
    goToPage,
    reload: loadData,
    // Alias pour compatibilité avec HomePage
    oeuvres: items as any,
    evenements: items as any,
    sites: items as any
  };
};

// ====================================
// HOOK pour les œuvres récentes (utilise getRecent)
// ====================================

export const useRecentOeuvres = (limit: number = 6) => {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref pour éviter les appels multiples
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      const response = await OeuvreService.getRecent(limit);
      
      if (response.success && response.data) {
        setOeuvres(response.data);
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des œuvres récentes'));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
      setOeuvres([]);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      hasLoadedRef.current = true;
    }
  }, [limit]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadData();
    }
  }, []);

  return {
    items: oeuvres,
    oeuvres,
    isLoading,
    error,
    reload: loadData,
    pagination: null,
    page: 1,
    goToPage: () => {}
  };
};

// ====================================
// HOOK pour les événements à venir (utilise getUpcoming)
// ====================================

export const useUpcomingEvenements = (filters: Record<string, any> = {}, options: UseListOptions = {}) => {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(options.page || 1);
  
  // Ref pour éviter les appels multiples
  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      const params = {
        ...filters,
        limit: options.limit || 6,
        page: page
      };
      
      const response = await EvenementService.getUpcoming(params);
      
      if (response.success && response.data) {
        setEvenements(response.data);
        setPagination(response.pagination || null);
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des événements'));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
      setEvenements([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [page]); // Dépendances minimales

  useEffect(() => {
    loadData();
  }, [page]); // Recharger seulement quand la page change

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    items: evenements,
    evenements,
    pagination,
    isLoading,
    error,
    page,
    goToPage,
    reload: loadData
  };
};

// ====================================
// HOOK pour les sites patrimoniaux populaires (utilise getSitesPopulaires)
// ====================================

export const usePopularSites = (limit: number = 6) => {
  const [sites, setSites] = useState<Lieu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref pour éviter les appels multiples
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.getSitesPopulaires(limit);
      
      if (response.success && response.data) {
        setSites(response.data);
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des sites populaires'));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
      setSites([]);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      hasLoadedRef.current = true;
    }
  }, [limit]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadData();
    }
  }, []);

  return {
    items: sites,
    sites,
    isLoading,
    error,
    reload: loadData,
    pagination: null,
    page: 1,
    goToPage: () => {}
  };
};

// ====================================
// HOOKS SPÉCIALISÉS pour chaque type (ancienne version)
// ====================================

export const useOeuvresList = (
  filters: Record<string, any> = {},
  options: UseListOptions = {}
) => {
  return useGenericList<Oeuvre>(
    (params) => OeuvreService.getAll(params) as Promise<PaginatedApiResponse<Oeuvre>>,
    filters,
    options
  );
};

export const useEvenementsList = (
  filters: Record<string, any> = {},
  options: UseListOptions = {}
) => {
  // Pour les événements à venir, ajouter le filtre de date
  const enhancedFilters = filters.upcoming 
    ? { ...filters, date_debut_min: new Date().toISOString().split('T')[0] }
    : filters;

  return useGenericList<Evenement>(
    (params) => EvenementService.getAll(params) as Promise<PaginatedApiResponse<Evenement>>,
    enhancedFilters,
    options
  );
};

export const usePatrimoineList = (
  filters: Record<string, any> = {},
  options: UseListOptions = {}
) => {
  return useGenericList<Lieu>(
    (params) => PatrimoineService.getSites(params) as Promise<PaginatedApiResponse<Lieu>>,
    filters,
    options
  );
};

// ====================================
// HOOK de recherche globale
// ====================================

export const useGlobalSearch = (): GlobalSearchHook => {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({
    oeuvres: [],
    evenements: [],
    sites: [],
    isSearching: false,
    hasResults: false
  });
  
  // Ref pour éviter les appels multiples
  const searchingRef = useRef(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchingRef.current) {
      if (!searchQuery.trim()) {
        setSearchState({
          oeuvres: [],
          evenements: [],
          sites: [],
          isSearching: false,
          hasResults: false
        });
      }
      return;
    }

    try {
      searchingRef.current = true;
      setSearchState(prev => ({ ...prev, isSearching: true }));

      const [oeuvresResponse, evenementsResponse, sitesResponse] = await Promise.all([
        OeuvreService.search({ q: searchQuery, limit: 5 }),
        EvenementService.search({ q: searchQuery, limit: 5 }),
        PatrimoineService.recherche(searchQuery, { limit: 5 })
      ]);

      const oeuvres = oeuvresResponse.success ? oeuvresResponse.data || [] : [];
      const evenements = evenementsResponse.success ? evenementsResponse.data || [] : [];
      const sites = sitesResponse.success ? sitesResponse.data || [] : [];

      setSearchState({
        oeuvres,
        evenements,
        sites,
        isSearching: false,
        hasResults: oeuvres.length > 0 || evenements.length > 0 || sites.length > 0
      });
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setSearchState({
        oeuvres: [],
        evenements: [],
        sites: [],
        isSearching: false,
        hasResults: false
      });
    } finally {
      searchingRef.current = false;
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchState({
      oeuvres: [],
      evenements: [],
      sites: [],
      isSearching: false,
      hasResults: false
    });
  }, []);

  // Effectuer la recherche quand la query change avec débounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  return {
    query,
    setQuery,
    clearSearch,
    ...searchState
  };
};

// ====================================
// HOOK LEGACY pour compatibilité
// ====================================

export const useHomePage = () => {
  // Ce hook existe pour la compatibilité avec l'ancien code
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [oeuvresLoading, setOeuvresLoading] = useState(true);
  const [oeuvresError, setOeuvresError] = useState<string | null>(null);

  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [evenementsLoading, setEvenementsLoading] = useState(true);
  const [evenementsError, setEvenementsError] = useState<string | null>(null);

  const [sites, setSites] = useState<Lieu[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);

  const [stats, setStats] = useState<HomepageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Refs pour éviter les appels multiples
  const hasLoadedRef = useRef({
    oeuvres: false,
    evenements: false,
    sites: false,
    stats: false
  });

  const loadOeuvres = useCallback(async () => {
    if (hasLoadedRef.current.oeuvres && oeuvres.length > 0) return;
    
    try {
      setOeuvresLoading(true);
      setOeuvresError(null);
      
      // Utiliser getRecent au lieu de getAll
      const response = await OeuvreService.getRecent(6);
      
      if (response.success && response.data) {
        setOeuvres(response.data);
        hasLoadedRef.current.oeuvres = true;
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des œuvres'));
      }
    } catch (error: any) {
      setOeuvresError(error.message || 'Erreur de chargement des œuvres');
      setOeuvres([]);
    } finally {
      setOeuvresLoading(false);
    }
  }, []);

  const loadEvenements = useCallback(async () => {
    if (hasLoadedRef.current.evenements && evenements.length > 0) return;
    
    try {
      setEvenementsLoading(true);
      setEvenementsError(null);
      
      // Utiliser getUpcoming au lieu de getAll
      const response = await EvenementService.getUpcoming({
        limit: 6,
        page: 1
      });
      
      if (response.success && response.data) {
        setEvenements(response.data);
        hasLoadedRef.current.evenements = true;
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des événements'));
      }
    } catch (error: any) {
      setEvenementsError(error.message || 'Erreur de chargement des événements');
      setEvenements([]);
    } finally {
      setEvenementsLoading(false);
    }
  }, []);

  const loadSites = useCallback(async () => {
    if (hasLoadedRef.current.sites && sites.length > 0) return;
    
    try {
      setSitesLoading(true);
      setSitesError(null);
      
      // Utiliser getSitesPopulaires au lieu de getSites
      const response = await PatrimoineService.getSitesPopulaires(6);
      
      if (response.success && response.data) {
        setSites(response.data);
        hasLoadedRef.current.sites = true;
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des sites'));
      }
    } catch (error: any) {
      setSitesError(error.message || 'Erreur de chargement des sites');
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (hasLoadedRef.current.stats) return;
    
    try {
      setStatsLoading(true);
      
      const [oeuvresCount, evenementsCount, sitesCount] = await Promise.all([
        OeuvreService.getAll({ limit: 1, page: 1 }) as Promise<PaginatedApiResponse<Oeuvre>>,
        EvenementService.getAll({ limit: 1, page: 1 }) as Promise<PaginatedApiResponse<Evenement>>,
        PatrimoineService.getSites({ limit: 1, page: 1 }) as Promise<PaginatedApiResponse<Lieu>>
      ]);
      
      setStats({
        total_oeuvres: oeuvresCount.pagination?.total || 0,
        total_evenements: evenementsCount.pagination?.total || 0,
        total_lieux: sitesCount.pagination?.total || 0,
        total_users: 0
      });
      hasLoadedRef.current.stats = true;
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setStats({
        total_oeuvres: 0,
        total_evenements: 0,
        total_lieux: 0,
        total_users: 0
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOeuvres();
    loadEvenements();
    loadSites();
    loadStats();
  }, []);

  return {
    // Œuvres
    oeuvres,
    oeuvresLoading,
    oeuvresError,
    reloadOeuvres: loadOeuvres,

    // Événements
    evenements,
    evenementsLoading,
    evenementsError,
    reloadEvenements: loadEvenements,

    // Sites patrimoniaux
    sites,
    sitesLoading,
    sitesError,
    reloadSites: loadSites,

    // Statistiques
    stats,
    statsLoading,

    // État global
    isLoading: oeuvresLoading || evenementsLoading || sitesLoading,
    hasError: !!(oeuvresError || evenementsError || sitesError)
  };
};

// Export par défaut pour compatibilité
export default useHomePage;