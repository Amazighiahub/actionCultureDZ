// components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { AlertCircle, Lock, Clock } from 'lucide-react';import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>);

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
              <Lock className="h-5 w-5 mr-2" />{t("auth_protectedroute.accs_refus")}

            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t("auth_protectedroute.cette_page_est")}

            </p>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">{t("auth_protectedroute.retour_1")}

            </Button>
          </CardContent>
        </Card>
      </div>);

  }

  // Vérifier les rôles professionnels
  if (requireProfessional && !isProfessional && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Lock className="h-5 w-5 mr-2" />{t("auth_protectedroute.accs_professionnel_requis")}

            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t("auth_protectedroute.cette_fonctionnalit_est")}

            </p>
            <div className="flex space-x-2">
              <Button onClick={() => window.history.back()} variant="outline" className="flex-1">{t("auth_protectedroute.retour_1")}

              </Button>
              <Button onClick={() => window.location.href = '/auth'} className="flex-1">{t("auth_protectedroute.sinscrire_comme_pro")}

              </Button>
            </div>
          </CardContent>
        </Card>
      </div>);

  }

  // Vérifier la validation pour les professionnels
  if (requireValidated && isProfessional && needsValidation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <Clock className="h-5 w-5 mr-2" />{t("auth_protectedroute.validation_attente")}

            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("auth_protectedroute.votre_compte_professionnel")}

              </p>
              <p className="text-sm text-muted-foreground">{t("auth_protectedroute.vous_recevrez_email")}


              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-sm text-amber-800 flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />{t("auth_protectedroute.attendant_vous_pouvez")}

              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full">{t("auth_protectedroute.retour_laccueil")}

            </Button>
          </CardContent>
        </Card>
      </div>);

  }

  // Toutes les vérifications sont passées
  return <>{children}</>;
}

// Composants spécialisés pour faciliter l'utilisation

export function AdminRoute({ children }: {children: React.ReactNode;}) {const { t } = useTranslation();
  return (
    <ProtectedRoute requireAuth requireAdmin>
      {children}
    </ProtectedRoute>);

}

export function ProfessionalRoute({ children }: {children: React.ReactNode;}) {const { t } = useTranslation();
  return (
    <ProtectedRoute requireAuth requireProfessional requireValidated>
      {children}
    </ProtectedRoute>);

}

export function AuthenticatedRoute({ children }: {children: React.ReactNode;}) {const { t } = useTranslation();
  return (
    <ProtectedRoute requireAuth>
      {children}
    </ProtectedRoute>);

}