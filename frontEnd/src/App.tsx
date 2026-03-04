// Import de la configuration i18n - DOIT être en premier !
import '../i18n/config';

import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider } from "@/providers/PermissionsProvider";
import { ProtectedRoute, AdminRoute, ProfessionalRoute } from "@/components/auth/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";
// Import du listener de notifications toast
import NotificationToastListener from '@/components/NotificationToastListener';
import RTLManager from './components/RtlManager';
import { LanguagePersistenceManager } from '@/hooks/useLanguagePersistence';

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

// Pages de notifications
const NotificationsPage = React.lazy(() => import('./pages/notifications/Preferences'));
const NotificationPreferences = React.lazy(() => import('./pages/notifications/Preferences'));

// ============================================================================
// Composant de chargement pour Suspense
// ============================================================================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground animate-pulse">Chargement...</p>
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
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
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
  const token = localStorage.getItem('auth_token');
  
  // Ne rendre le listener que si l'utilisateur est authentifié
  if (!token) return null;
  
  return <NotificationToastListener />;
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
          {/* Listener global pour les notifications toast */}
          <AuthenticatedFeatures />
         
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
                  <DashboardUser />
                </ProtectedRoute>
              } 
            />
            
            {/* Routes de création - Uniquement pour les professionnels validés */}
            <Route 
              path="/ajouter-oeuvre" 
              element={
                <ProfessionalRoute>
                  <AjouterOeuvre />
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
                  <AjouterEvenement />
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
                  <AjouterOeuvre />
                </ProfessionalRoute>
              }
            />
            <Route
              path="/modifier-evenement/:id"
              element={
                <ProfessionalRoute>
                  <AjouterEvenement />
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

            {/* Routes des notifications - Accessibles à tous les utilisateurs connectés */}
            <Route 
              path="/Notifications" 
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/notifications/Preferences" 
              element={
                <ProtectedRoute>
                  <NotificationPreferences />
                </ProtectedRoute>
              } 
            />
            
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

            {/* Routes administratives */}
            <Route path="/admin/*" element={
              <AdminRoute>
                <Routes>
                  <Route path="users" element={<div>Gestion des utilisateurs</div>} />
                  <Route path="metadata" element={<div>Gestion des métadonnées</div>} />
                  <Route path="validation" element={<div>Validation des professionnels</div>} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </AdminRoute>
            } />
            
            {/* Route pour la vérification de l'email */}
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
            <Route path="/confirm-email-change/:token" element={<ConfirmEmailChange />} />

            {/* Route catch-all pour 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </PermissionsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
