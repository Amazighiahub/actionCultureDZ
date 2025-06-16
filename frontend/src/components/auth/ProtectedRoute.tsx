// components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Clock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireProfessional?: boolean;
  requireValidated?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireProfessional = false,
  requireValidated = true,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { isAdmin, isProfessional, needsValidation } = usePermissions();

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Vérifier l'authentification
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Vérifier les rôles admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Lock className="h-5 w-5 mr-2" />
              Accès refusé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cette page est réservée aux administrateurs.
            </p>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier les rôles professionnels
  if (requireProfessional && !isProfessional && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Lock className="h-5 w-5 mr-2" />
              Accès professionnel requis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cette fonctionnalité est réservée aux professionnels validés.
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => window.history.back()} variant="outline" className="flex-1">
                Retour
              </Button>
              <Button onClick={() => window.location.href = '/auth'} className="flex-1">
                S'inscrire comme pro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier la validation pour les professionnels
  if (requireValidated && isProfessional && needsValidation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <Clock className="h-5 w-5 mr-2" />
              Validation en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Votre compte professionnel est en cours de validation par notre équipe.
              </p>
              <p className="text-sm text-muted-foreground">
                Vous recevrez un email dès que votre compte sera validé. 
                Cela prend généralement 24 à 48 heures.
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-sm text-amber-800 flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                En attendant, vous pouvez explorer la plateforme en tant que visiteur.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Toutes les vérifications sont passées
  return <>{children}</>;
}

// Composants spécialisés pour faciliter l'utilisation

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      {children}
    </ProtectedRoute>
  );
}

export function ProfessionalRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth requireProfessional requireValidated>
      {children}
    </ProtectedRoute>
  );
}

export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth>
      {children}
    </ProtectedRoute>
  );
}