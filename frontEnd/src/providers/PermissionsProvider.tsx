// providers/PermissionsProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '@/services/auth.service';
import { permissionsService } from '@/services/permissions.service';
import type { CurrentUser } from '@/services/auth.service';

interface PermissionsContextType {
  user: CurrentUser | null;
  loading: boolean;
  error: Error | null;
  
  // État authentification
  isAuthenticated: boolean;
  /** Repère de session présent mais serveur injoignable : ni connecté confirmé, ni déconnecté */
  sessionIncertaine: boolean;
  
  // Rôles
  isAdmin: boolean;
  isProfessional: boolean;
  isVisitor: boolean;
  
  // État validation
  needsValidation: boolean;
  canAccess: boolean;
  statusMessage: string | null;
  
  // Actions
  refreshPermissions: () => Promise<void>;
  
  // Helpers
  isOwner: (resourceOwnerId: number) => boolean;
  hasRole: (roleName: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionIncertaine, setSessionIncertaine] = useState(false);
  // Le premier chargement seul affiche l'attente : un rafraîchissement ne démonte pas la page ouverte
  const dejaCharge = useRef(false);
  const utilisateurActuel = useRef<CurrentUser | null>(null);
  useEffect(() => { utilisateurActuel.current = user; }, [user]);

  const loadUser = async () => {
    try {
      if (!dejaCharge.current) setLoading(true);
      setError(null);
      
      // Rechargement de page : l'utilisateur en mémoire est perdu, mais le repère de session
      // permet de redemander au serveur (sinon F5 ou un lien ouvert dans un onglet déconnectait)
      if (authService.isAuthenticated() || authService.hasSessionHint()) {
        const response = await authService.getCurrentUser({ silentAuth: true });
        if (response.success && response.data) {
          setUser(response.data);
          setSessionIncertaine(false);
          // Initialiser le service de permissions avec l'utilisateur
          permissionsService.setCurrentUser(response.data);
        } else {
          // Session invalide côté serveur — nettoyer le cache local et le repère de session
          authService.clearSession();
          setSessionIncertaine(false);
          setUser(null);
          permissionsService.setCurrentUser(null);
        }
      } else {
        setUser(null);
        setSessionIncertaine(false);
        permissionsService.setCurrentUser(null);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load user:', err);
      // Seul un refus du serveur met fin à la session. Réseau coupé à l'ouverture de l'application :
      // le repère reste, et la prochaine tentative retrouve la personne connectée.
      const refus = err as { status?: number; response?: { status?: number } };
      if ((refus.status ?? refus.response?.status) === 401) {
        authService.clearSession();
        setSessionIncertaine(false);
        setUser(null);
        permissionsService.setCurrentUser(null);
      } else if (!utilisateurActuel.current) {
        // Rien à afficher pour l'instant ; une personne déjà affichée le reste
        setSessionIncertaine(authService.hasSessionHint());
        permissionsService.setCurrentUser(null);
      }
    } finally {
      dejaCharge.current = true;
      setLoading(false);
    }
  };

  // Initialiser au montage
  useEffect(() => {
    loadUser();
  }, []);

  // Le réseau revient : retrouver la session si l'ouverture a échoué faute de connexion
  useEffect(() => {
    const auRetour = () => {
      if (authService.hasSessionHint() && !authService.getCurrentUserFromCache()) loadUser();
    };
    window.addEventListener('online', auRetour);
    return () => window.removeEventListener('online', auRetour);
  }, []);

  // « online » ne se déclenche pas pour un réseau faible ou un serveur indisponible : nouvel essai régulier
  useEffect(() => {
    if (!sessionIncertaine) return undefined;
    const minuteur = window.setInterval(() => { loadUser(); }, 20000);
    return () => window.clearInterval(minuteur);
  }, [sessionIncertaine]);

  // Observer les changements de token
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calculer les propriétés dérivées
  const isAuthenticated = !!user;
  const isAdmin = permissionsService.isAdmin();
  const isProfessional = permissionsService.isProfessional();
  const isVisitor = permissionsService.isVisitor();
  
  // Validation pour les professionnels
  const needsValidation = permissionsService.needsValidation();
  const canAccess = user ? 
    (isAdmin || isVisitor || (isProfessional && !needsValidation)) : false;
  
  // Message de statut
  const statusMessage = permissionsService.getUserStatusMessage();

  // Helpers
  const isOwner = (resourceOwnerId: number): boolean => {
    return permissionsService.isOwner(resourceOwnerId);
  };

  const hasRole = (roleName: string): boolean => {
    return user?.Roles?.some(r => r.nom_role === roleName) || false;
  };

  const contextValue: PermissionsContextType = {
    user,
    loading,
    error,
    isAuthenticated,
    sessionIncertaine,
    isAdmin,
    isProfessional,
    isVisitor,
    needsValidation,
    canAccess,
    statusMessage,
    refreshPermissions: loadUser,
    isOwner,
    hasRole,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
}

export default PermissionsProvider;