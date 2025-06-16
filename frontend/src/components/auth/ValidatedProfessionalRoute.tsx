// components/auth/ValidatedProfessionalRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ValidatedProfessionalRouteProps {
  children: React.ReactNode;
}

export const ValidatedProfessionalRoute: React.FC<ValidatedProfessionalRouteProps> = ({ children }) => {
  const { isAuthenticated, isProfessional, user, loading } = usePermissions();

  // Pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Pas professionnel
  if (!isProfessional) {
    return <Navigate to="/" replace />;
  }

  // Professionnel mais pas encore validé
  if (user?.statut_validation !== 'valide') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <h3 className="font-semibold mb-2">Compte en attente de validation</h3>
                <p className="mb-4">
                  Votre compte professionnel est en cours de validation par nos équipes. 
                  Vous ne pouvez pas encore créer de contenu.
                </p>
                <p className="text-sm">
                  Statut actuel : <span className="font-medium capitalize">{user?.statut_validation || 'en attente'}</span>
                </p>
                <div className="mt-4 space-x-3">
                  <a 
                    href="/dashboard-pro" 
                    className="inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    Retour au tableau de bord
                  </a>
                  <a 
                    href="/" 
                    className="inline-block px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Retour à l'accueil
                  </a>
                </div>
              </AlertDescription>
            </Alert>

            {/* Message supplémentaire si rejeté */}
            {user?.statut_validation === 'rejete' && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <p className="font-medium">
                    Votre demande de compte professionnel a été rejetée.
                  </p>
                  <p className="text-sm mt-1">
                    Veuillez contacter l'administration pour plus d'informations.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Professionnel validé - Accès autorisé
  return <>{children}</>;
};