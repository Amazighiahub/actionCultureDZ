/**
 * Index des hooks - Exports centralisés
 * Compatible avec l'infrastructure existante
 */

// ============================================================================
// Hooks existants (du projet)
// ============================================================================
export { useApi, useMutation, usePaginatedApi, useInfiniteApi } from './useApi';
export { useAuth } from './useAuth';
export { useConfirmedAction, useConfirmedActionWithDialog } from './useConfirmedAction';
export { useDashboardPro } from './useDashboardPro';
export { useDebouncedValue } from './useDebouncedValue';
export { useFavoris, useFavoriCheck } from './useFavoris';
export { 
  useWilayas, 
  useDairas, 
  useCommunes, 
  useLocalites, 
  useSearchWilayas, 
  useGeographicSelection,
  formatWilayaName,
  formatFullAddress
} from './useGeographie';
export { useLanguage, useDirection } from './useLanguage';
export { useLanguagePersistence, LanguagePersistenceManager } from './useLanguagePersistence';
export { useLieuSearch, useCreateService } from './useLieuSearch';
export { useLocalizedDate } from './useLocalizedDate';
export { useLocalizedNumber } from './useLocalizedNumber';
export { useIsMobile } from './use-mobile';
export { useNotifications } from './useNotifications';
export { useOeuvres } from './useOeuvres';

// ============================================================================
// Nouveaux hooks Admin (tout depuis useAdmin.ts)
// ============================================================================
export {
  // Hooks admin
  useAdminAuth,
  useSocketConnection,
  useAdminStats,
  useAdminUsers,
  useAdminOeuvres,
  useAdminEvenements,
  useAdminModeration,
  // Alias pour compatibilité
  useDebouncedValue as useDebounce
} from './useAdmin';

// Hook Socket.IO plus complet
export { useSocket, useAdminSocket, useSocketEvent, useUserPresence, useChat } from './useSocket';

// Hooks événements
export { useEvenements, useUpcomingEvents, useEvenementStats } from './useEvenements';
export { useEventDetails } from './useEventDetails';

// Hooks œuvres
export { useOeuvreDetails } from './useOeuvreDetails';

// Hook artisanat
export { useArtisanat } from './useArtisanat';

// ============================================================================
// Hook pour le formulaire d'œuvre (si présent)
// ============================================================================
export * from './useOeuvreForm';