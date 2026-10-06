import { QueryClient } from '@tanstack/react-query';

/**
 * Client React Query unique de l'application (partagé avec useAuth pour vider
 * le cache à la déconnexion : les données de l'utilisateur précédent ne doivent
 * pas réapparaître pour le suivant sur un poste partagé).
 */
// Configuration optimisée du QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
