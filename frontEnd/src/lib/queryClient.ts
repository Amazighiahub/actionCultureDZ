import { QueryClient } from '@tanstack/react-query';
import i18n from 'i18next';

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

// Les contenus sont traduits par le serveur selon la langue envoyée : au changement de langue,
// les données en cache sont relues dans la nouvelle langue (sinon les noms restaient dans l'ancienne)
i18n.on('languageChanged', () => {
  queryClient.invalidateQueries();
});

/**
 * Après un enregistrement par un professionnel (œuvre, artisanat, site, article, événement,
 * catalogue…) : ses tableaux de bord sont relus (sinon, gardés 5 min, ils montraient l'ancien
 * état et poussaient à recréer ce qui venait d'être ajouté)
 */
export function rafraichirTableauDeBord() {
  return queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('dashboard-pro') });
}

/** Fiche d'un événement relue (programme, médias, participants…) après une modification */
export function rafraichirEvenement(idEvenement: number | string) {
  return queryClient.invalidateQueries({
    predicate: (q) => String(q.queryKey[0]).startsWith('event') && String(q.queryKey[1]) === String(idEvenement)
  });
}
