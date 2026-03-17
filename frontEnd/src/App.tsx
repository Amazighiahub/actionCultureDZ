// Import de la configuration i18n - DOIT être en premier !
import '../i18n/config';

import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider, usePermissionsContext } from "@/providers/PermissionsProvider";
import { ProtectedRoute, AdminRoute, ProfessionalRoute } from "@/components/auth/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";
// Import du listener de notifications toast
import NotificationToastListener from '@/components/NotificationToastListener';
import RTLManager from './components/RtlManager';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { LanguagePersistenceManager } from '@/hooks/useLanguagePersistence';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslation } from 'react-i18next';

// ============================================================================
// LAZY LOADING — Chaque page est chargée à la demande (code splitting)
// ============================================================================

// Pages publiques
const Index = React.lazy(() => import('./pages/index'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Patrimoine = React.lazy(() => import('./pages/Patrimoine'));
const PatrimoineDetail = React.lazy(() => import('./pages/PatrimoineDetail'));
const Evenements = React.lazy(() => import('./pages/Evenements'));
const EventDetailsPage = React.lazy(() => import('./pages/EventDetailsPage'));
const Oeuvres = React.lazy(() => import('./pages/Oeuvres'));
const OeuvreDetail = React.lazy(() => import('./pages/oeuvreDetail/OeuvreDetailPage'));
const Artisanat = React.lazy(() => import('./pages/Artisanat'));
const ArtisanatDetail = React.lazy(() => import('./pages/ArtisanatDetail'));
const APropos = React.lazy(() => import('./pages/APropos'));
const ArticleViewPage = React.lazy(() => import('./pages/articles/ArticleViewPage'));

// Pages d'authentification
const Auth = React.lazy(() => import('./pages/Auth'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ConfirmEmailChange = React.lazy(() => import('./pages/ConfirmEmailChange'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const VerificationEmailEnvoyee = React.lazy(() => import('./pages/VerificationEmailEnvoyee'));

// Dashboards
const DashboardPro = React.lazy(() => import('./pages/DashboardPro'));
const DashboardAdmin = React.lazy(() => import('./pages/DashboardAdmin'));
const DashboardUser = React.lazy(() => import('./pages/DashboardUser'));

// Pages de création/modification (professionnels)
const AjouterOeuvre = React.lazy(() => import('./pages/AjouterOeuvre'));
const AjouterEvenement = React.lazy(() => import('./pages/AjouterEvenement'));
const AjouterService = React.lazy(() => import('./pages/AjouterService'));
const AjouterServicePro = React.lazy(() => import('./pages/AjouterServicePro'));
const AjouterPatrimoinePro = React.lazy(() => import('./pages/AjouterPatrimoinePro'));
const AjouterArtisanat = React.lazy(() => import('./pages/AjouterArtisanat'));
const AjouterOrganisation = React.lazy(() => import('./pages/AjouterOrganisation'));
const EditArticle = React.lazy(() => import('./pages/articles/edit/EditArticle'));

// Pages admin
const AjouterPatrimoine = React.lazy(() => import('./pages/admin/AjouterPatrimoine'));

// Pages Programme
const CreateProgrammePage = React.lazy(() => import('./pages/CreateProgrammePage'));
const EditProgrammePage = React.lazy(() => import('./pages/EditProgrammePage'));
const ViewProgrammePage = React.lazy(() => import('./pages/ViewProgrammePage'));

// Pages de gestion
const GestionArtisanat = React.lazy(() => import('./pages/GestionArtisanat'));

// Pages de notifications
const NotificationsPage = React.lazy(() => import('./pages/notifications/Notifications'));
const NotificationPreferences = React.lazy(() => import('./pages/notifications/Preferences'));

// ============================================================================
// Composant de chargement pour Suspense
// ============================================================================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  </div>
);
// Configuration optimisée du QueryClient
const queryClient = new QueryClient({
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

// Composant pour router vers le bon dashboard selon le rôle
const DashboardRouter = () => {
  const { isAdmin, isProfessional, isVisitor } = usePermissions();
  
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isProfessional) {
    return <Navigate to="/dashboard-pro" replace />;
  }
  if (isVisitor) {
    return <Navigate to="/dashboard-user" replace />;
  }
  
  // Par défaut, rediriger vers l'accueil
  return <Navigate to="/" replace />;
};

// Composant wrapper pour les fonctionnalités globales nécessitant l'authentification
const AuthenticatedFeatures = () => {
  const { isAuthenticated } = usePermissionsContext();
  if (!isAuthenticated) return null;
  return <NotificationToastListener />;
};

// Listener global pour les toasts déclenchés depuis httpClient (ex: erreurs HTTP)
const GlobalToastListener = () => {
  const { toast } = useToast();

  React.useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { title, description, variant } = event.detail;
      toast({ title, description, variant: variant === 'destructive' ? 'destructive' : 'default' });
    };
    window.addEventListener('app:toast', handler as EventListener);
    return () => window.removeEventListener('app:toast', handler as EventListener);
  }, [toast]);

  return null;
};

// Bannière affichée quand le navigateur détecte une perte de connexion réseau
const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground text-center py-2 text-sm font-medium">
      {t('app.offlineBanner', 'Connexion réseau perdue — les données affichées peuvent ne plus être à jour.')}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PermissionsProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
           {/* Gestionnaire de persistance de langue */}
           <LanguagePersistenceManager />
          {/* Gestionnaire RTL */}
          <RTLManager />
          {/* Scroll en haut à chaque changement de page */}
          <ScrollToTop />
          {/* Bannière offline */}
          <OfflineBanner />
          {/* Listener global pour les notifications toast */}
          <AuthenticatedFeatures />
          {/* Listener pour les toasts httpClient (erreurs HTTP, rate limit, etc.) */}
          <GlobalToastListener />
         
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Routes publiques (canonical = lowercase) */}
            <Route path="/" element={<Index />} />
            <Route path="/patrimoine" element={<Patrimoine />} />
            <Route path="/patrimoine/:id" element={<PatrimoineDetail />} />
            <Route path="/evenements" element={<Evenements />} />
            <Route path="/evenements/:id" element={<EventDetailsPage />} />
            <Route path="/oeuvres" element={<Oeuvres />} />
            <Route path="/oeuvres/:id" element={<OeuvreDetail />} />
            <Route path="/artisanat" element={<Artisanat />} />
            <Route path="/artisanat/:id" element={<ArtisanatDetail />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/auth" element={<Auth />} />
            {/* Redirects SEO : anciennes URLs PascalCase → lowercase */}
            <Route path="/Patrimoine" element={<Navigate to="/patrimoine" replace />} />
            <Route path="/Evenements" element={<Navigate to="/evenements" replace />} />
            <Route path="/Oeuvres" element={<Navigate to="/oeuvres" replace />} />
            <Route path="/Artisanat" element={<Navigate to="/artisanat" replace />} />
            <Route path="/Auth" element={<Navigate to="/auth" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/articles/:id" element={<ArticleViewPage />} />
            
            {/* Route dashboard qui redirige selon le rôle */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } 
            />
            
            {/* Dashboard Administrateur */}
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <DashboardAdmin />
                </AdminRoute>
              } 
            />
            
            {/* Dashboard Professionnel - Uniquement pour les professionnels validés */}
            <Route 
              path="/dashboard-pro" 
              element={
                <ProfessionalRoute>
                  <DashboardPro />
                </ProfessionalRoute>
              } 
            />
            
            {/* Dashboard Visiteur */}
            <Route 
              path="/dashboard-user" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary><DashboardUser /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            
            {/* Routes de création - Uniquement pour les professionnels validés */}
            <Route 
              path="/ajouter-oeuvre" 
              element={
                <ProfessionalRoute>
                  <ErrorBoundary><AjouterOeuvre /></ErrorBoundary>
                </ProfessionalRoute>
              } 
            />
            
            <Route 
              path="/editer-article/:id" 
              element={
                <ProfessionalRoute>
                  <EditArticle />
                </ProfessionalRoute>
              } 
            />
            
            <Route
              path="/ajouter-evenement"
              element={
                <ProfessionalRoute>
                  <ErrorBoundary><AjouterEvenement /></ErrorBoundary>
                </ProfessionalRoute>
              }
            />

            <Route
              path="/ajouter-service"
              element={
                <ProfessionalRoute>
                  <AjouterService />
                </ProfessionalRoute>
              }
            />

            <Route
              path="/ajouter-mon-service"
              element={
                <ProfessionalRoute>
                  <AjouterServicePro />
                </ProfessionalRoute>
              }
            />

            <Route
              path="/ajouter-patrimoine"
              element={
                <ProfessionalRoute>
                  <AjouterPatrimoinePro />
                </ProfessionalRoute>
              }
            />

            <Route
              path="/ajouter-artisanat"
              element={
                <ProfessionalRoute>
                  <AjouterArtisanat />
                </ProfessionalRoute>
              }
            />

            <Route
              path="/ajouter-organisation"
              element={
                <ProfessionalRoute>
                  <AjouterOrganisation />
                </ProfessionalRoute>
              }
            />

            {/* Routes de modification - Réutilisent les pages Ajouter en mode édition */}
            <Route
              path="/modifier-oeuvre/:id"
              element={
                <ProfessionalRoute>
                  <ErrorBoundary><AjouterOeuvre /></ErrorBoundary>
                </ProfessionalRoute>
              }
            />
            <Route
              path="/modifier-evenement/:id"
              element={
                <ProfessionalRoute>
                  <ErrorBoundary><AjouterEvenement /></ErrorBoundary>
                </ProfessionalRoute>
              }
            />
            <Route
              path="/modifier-service/:id"
              element={
                <ProfessionalRoute>
                  <AjouterServicePro />
                </ProfessionalRoute>
              }
            />
            <Route
              path="/modifier-patrimoine/:id"
              element={
                <ProfessionalRoute>
                  <AjouterPatrimoinePro />
                </ProfessionalRoute>
              }
            />
            <Route
              path="/modifier-artisanat/:id"
              element={
                <ProfessionalRoute>
                  <AjouterArtisanat />
                </ProfessionalRoute>
              }
            />

            {/* Routes Programme */}
            <Route
              path="/programme/creer"
              element={
                <ProfessionalRoute>
                  <ErrorBoundary><CreateProgrammePage /></ErrorBoundary>
                </ProfessionalRoute>
              }
            />
            <Route
              path="/programme/modifier/:id"
              element={
                <ProfessionalRoute>
                  <EditProgrammePage />
                </ProfessionalRoute>
              }
            />
            <Route path="/programme/:id" element={<ViewProgrammePage />} />

            {/* Gestion Artisanat */}
            <Route
              path="/gestion-artisanat"
              element={
                <ProfessionalRoute>
                  <GestionArtisanat />
                </ProfessionalRoute>
              }
            />

            {/* Aliases de compatibilité pour les liens existants */}
            <Route path="/profile" element={<Navigate to="/dashboard-user" replace />} />
            <Route path="/mes-favoris" element={<Navigate to="/dashboard-user" replace />} />

            {/* Routes des notifications - Accessibles à tous les utilisateurs connectés */}
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/notifications/preferences" 
              element={
                <ProtectedRoute>
                  <NotificationPreferences />
                </ProtectedRoute>
              } 
            />

            {/* Compatibilité anciennes URLs en PascalCase */}
            <Route path="/Notifications" element={<Navigate to="/notifications" replace />} />
            <Route path="/notifications/Preferences" element={<Navigate to="/notifications/preferences" replace />} />
            
            {/* Routes de gestion du patrimoine - Admin */}
            <Route
              path="/admin/patrimoine/ajouter"
              element={
                <AdminRoute>
                  <AjouterPatrimoine />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/patrimoine/modifier/:id"
              element={
                <AdminRoute>
                  <AjouterPatrimoine />
                </AdminRoute>
              }
            />

            {/* Routes administratives - Redirection vers le dashboard avec l'onglet approprié */}
            <Route path="/admin/*" element={
              <AdminRoute>
                <Routes>
                  <Route path="users" element={<Navigate to="/admin/dashboard?tab=users" replace />} />
                  <Route path="metadata" element={<Navigate to="/admin/dashboard?tab=overview" replace />} />
                  <Route path="validation" element={<Navigate to="/admin/dashboard?tab=users" replace />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </AdminRoute>
            } />
            
            {/* Routes de vérification email */}
            <Route path="/verification-email-envoyee" element={<VerificationEmailEnvoyee />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
            <Route path="/confirm-email-change/:token" element={<ConfirmEmailChange />} />

            {/* Route catch-all pour 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>

          <Toaster />
        </BrowserRouter>
      </PermissionsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
