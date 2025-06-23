// hooks/useApi.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResponse, ApiError } from '@/config/api';

interface UseApiOptions {
  immediate?: boolean; // Lancer la requête immédiatement
  dependencies?: any[]; // Dépendances pour relancer la requête
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  cache?: boolean; // Activer le cache
  cacheTime?: number; // Durée du cache en ms
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: any[]) => Promise<ApiResponse<T>>;
  reset: () => void;
}

// Cache simple en mémoire
const apiCache = new Map<string, { data: any; timestamp: number }>();

export function useApi<T>(
  apiCall: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    immediate = false,
    dependencies = [],
    onSuccess,
    onError,
    cache = false,
    cacheTime = 5 * 60 * 1000 // 5 minutes par défaut
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Fonction pour exécuter l'appel API
  const execute = useCallback(async (...args: any[]): Promise<ApiResponse<T>> => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau controller
    abortControllerRef.current = new AbortController();

    // Générer une clé de cache
    const cacheKey = cache ? `${apiCall.name}_${JSON.stringify(args)}` : '';

    // Vérifier le cache
    if (cache && cacheKey) {
      const cached = apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        setLoading(false);
        setError(null);
        return { success: true, data: cached.data };
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiCall(...args);

      if (!mountedRef.current) return response;

      if (response.success && response.data !== undefined) {
        setData(response.data);
        
        // Mettre en cache
        if (cache && cacheKey) {
          apiCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }

        onSuccess?.(response.data);
      } else {
        const apiError: ApiError = {
          message: response.error || 'Une erreur est survenue',
          status: 500
        };
        setError(apiError);
        onError?.(apiError);
      }

      return response;
    } catch (err) {
      if (!mountedRef.current) {
        return { success: false, error: 'Component unmounted' };
      }

      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 500
      };
      
      setError(apiError);
      onError?.(apiError);
      
      return { success: false, error: apiError.message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiCall, cache, cacheTime, onSuccess, onError]); // ✅ Removed cacheKey

  // Réinitialiser l'état
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Effet pour les appels immédiats ou avec dépendances
  useEffect(() => {
    if (immediate || dependencies.length > 0) {
      execute();
    }
  }, [...dependencies, immediate]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, execute, reset };
}

// Hook pour les mutations (POST, PUT, DELETE)
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: ApiError) => void;
    onSettled?: () => void;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true);
    setError(null);

    try {
      const response = await mutationFn(variables);

      if (response.success && response.data !== undefined) {
        setData(response.data);
        options?.onSuccess?.(response.data);
        return response;
      } else {
        const apiError: ApiError = {
          message: response.error || 'Une erreur est survenue',
          status: 500
        };
        setError(apiError);
        options?.onError?.(apiError);
        throw apiError;
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 500
      };
      setError(apiError);
      options?.onError?.(apiError);
      throw apiError;
    } finally {
      setLoading(false);
      options?.onSettled?.();
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    data,
    loading,
    error,
    reset,
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error
  };
}

// Hook pour la pagination
export function usePaginatedApi<T>(
  apiCall: (params: any) => Promise<ApiResponse<any>>,
  initialParams: any = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const params = {
    ...initialParams,
    page,
    limit: pageSize
  };

  const { data, loading, error, execute } = useApi(apiCall, {
    dependencies: [page, pageSize, JSON.stringify(initialParams)]
  });

  // Mettre à jour les infos de pagination
  useEffect(() => {
    if (data?.pagination) {
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.total);
    }
  }, [data]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Retour à la première page
  };

  return {
    data: data?.data || [],
    loading,
    error,
    page,
    pageSize,
    totalPages,
    totalItems,
    goToPage,
    changePageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    refresh: () => execute(params)
  };
}

// Hook pour l'infinite scroll
export function useInfiniteApi<T>(
  apiCall: (params: any) => Promise<ApiResponse<any>>,
  initialParams: any = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiCall({
        ...initialParams,
        page,
        limit: 20
      });

      if (response.success && response.data) {
        const newItems = response.data.data || [];
        setItems(prev => [...prev, ...newItems]);
        
        // Vérifier s'il y a plus de pages
        const pagination = response.data.pagination;
        if (pagination) {
          setHasMore(page < pagination.totalPages);
        } else {
          setHasMore(newItems.length === 20);
        }
        
        setPage(prev => prev + 1);
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 500
      };
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [apiCall, initialParams, page, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  };
}