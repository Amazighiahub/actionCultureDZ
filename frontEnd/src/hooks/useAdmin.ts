/**
 * Hook pour l'administration - vérification des droits d'accès.
 * (Les anciens hooks useAdminStats, useAdminUsers, useAdminOeuvres, useAdminEvenements,
 * useAdminModeration et useSocketConnection n'étaient utilisés nulle part : retirés.
 * Le tableau de bord admin passe par useDashboardAdmin.)
 */
import { useAuth } from '@/hooks/useAuth';

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
