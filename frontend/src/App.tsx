import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider } from "@/providers/PermissionsProvider";
import { ProtectedRoute, AdminRoute, ProfessionalRoute } from "@/components/auth/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Patrimoine from "./pages/Patrimoine";
import Evenements from "./pages/Evenements";
import Oeuvres from "./pages/Oeuvres";
import Artisanat from "./pages/Artisanat";
import APropos from "./pages/APropos";
import Auth from "./pages/Auth";
import DashboardPro from "./pages/DashboardPro";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardUser from "./pages/DashboardUser";
import AjouterOeuvre from "./pages/AjouterOeuvre";
import AjouterEvenement from "./pages/AjouterEvenement";

// Import des pages de notifications
import NotificationsPage from "./pages/notifications/preferences";
import NotificationPreferences from "./pages/notifications/preferences";

// Import du listener de notifications toast
import { NotificationToastListener } from "./components/NotificationToastListener";

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
        <BrowserRouter>
          {/* Listener global pour les notifications toast */}
          <AuthenticatedFeatures />
          
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Index />} />
            <Route path="/patrimoine" element={<Patrimoine />} />
            <Route path="/evenements" element={<Evenements />} />
            <Route path="/oeuvres" element={<Oeuvres />} />
            <Route path="/artisanat" element={<Artisanat />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/auth" element={<Auth />} />
            
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
              path="/ajouter-evenement" 
              element={
                <ProfessionalRoute>
                  <AjouterEvenement />
                </ProfessionalRoute>
              } 
            />
            
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
            
            {/* Route catch-all pour 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </PermissionsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;