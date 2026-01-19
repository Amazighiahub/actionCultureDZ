// providers/PermissionsProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
import { permissionsService } from '@/services/permissions.service';
import type { CurrentUser } from '@/services/auth.service';

interface PermissionsContextType {
  user: CurrentUser | null;
  loading: boolean;
  error: Error | null;
  
  // État authentification
  isAuthenticated: boolean;
  
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

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (authService.isAuthenticated()) {
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
          // Initialiser le service de permissions avec l'utilisateur
          permissionsService.setCurrentUser(response.data);
        } else {
          setUser(null);
          permissionsService.setCurrentUser(null);
        }
      } else {
        setUser(null);
        permissionsService.setCurrentUser(null);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load user:', err);
      setUser(null);
      permissionsService.setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialiser au montage
  useEffect(() => {
    loadUser();
  }, []);

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