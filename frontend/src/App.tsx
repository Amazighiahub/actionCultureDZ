// src/App.tsx - Configuration complète avec toutes les routes

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1) Importez tous vos providers dans le bon ordre
import { NotificationProvider } from './components/UI';
import { ErrorBoundary } from './components/providers/ErrorBoundary';

// 2) Import des layouts
import MainLayout from './components/Layout/MainLayout';

// 3) Import des pages
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfessionalPendingPage from './pages/ProfessionalPendingPage';

// 4) Import des formulaires (décommentez si les composants existent)
//import OeuvreForm from './components/Forms/CreateOeuvreForm';
//import EvenementForm from './components/Forms/EvenementForm';
//import LieuForm from './components/Forms/CreateLieuForm';

// 5) Import des composants UI
import { Loading } from './components/UI';
import LoadingScreen from './components/UI/LoadingScreen';

// 6) Import des hooks
import { useAuth } from './hooks/useAuth';

// =============================================================================
// COMPOSANT WRAPPER POUR LES ROUTES PROTÉGÉES (AMÉLIORÉ)
// =============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiresRole?: string[];
  requiresValidation?: boolean; // Pour les professionnels
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresAuth = false,
  requiresRole = [],
  requiresValidation = false
}) => {
  const { user, isLoading, isAuthenticated, isProfessional } = useAuth();

  // Chargement
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Vérification d'authentification
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  // Vérification des rôles
  if (requiresRole.length > 0 && user) {
    const userRoles = user.roles?.map(r => r.nomRole) || [];
    const hasRequiredRole = requiresRole.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fbfa]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#0e1a13] mb-4">
              Accès non autorisé
            </h1>
            <p className="text-[#51946b] mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <a
              href="/"
              className="px-6 py-3 bg-[#eb9f13] text-[#0e1a13] rounded-lg font-bold hover:opacity-90 transition-opacity inline-block"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      );
    }
  }

  // Vérification spéciale pour les professionnels non validés
  if (requiresValidation && isProfessional && user) {
    if (user.professionnelValide === false || user.statutValidation === 'en_attente') {
      return <Navigate to="/professionnel/en-attente" replace />;
    }
  }

  return <>{children}</>;
};

// =============================================================================
// PAGES TEMPORAIRES (à remplacer par vos vraies pages)
// =============================================================================

const ProfilePage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Mon Profil</h1>
    <p className="text-[#51946b]">Page de profil à implémenter</p>
  </div>
);

const AdminUsersPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Gestion des Utilisateurs</h1>
    <p className="text-[#51946b]">Page de gestion des utilisateurs à implémenter</p>
  </div>
);

const AdminOeuvresPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Gestion des Œuvres</h1>
    <p className="text-[#51946b]">Page de gestion des œuvres à implémenter</p>
  </div>
);

const AdminEvenementsPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Gestion des Événements</h1>
    <p className="text-[#51946b]">Page de gestion des événements à implémenter</p>
  </div>
);

const AdminModerationPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Centre de Modération</h1>
    <p className="text-[#51946b]">Page de modération à implémenter</p>
  </div>
);

const AdminActivityPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Activité</h1>
    <p className="text-[#51946b]">Page d'activité à implémenter</p>
  </div>
);

const AdminSettingsPage = () => (
  <div className="min-h-screen bg-[#f8fbfa] p-8">
    <h1 className="text-3xl font-bold text-[#0e1a13] mb-4">Paramètres</h1>
    <p className="text-[#51946b]">Page de paramètres à implémenter</p>
  </div>
);

// =============================================================================
// COMPOSANT PRINCIPAL APP
// =============================================================================

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* ===== ROUTES PUBLIQUES ===== */}
            {/* Route principale (HomePage) */}
            <Route path="/" element={<HomePage />} />
            
            {/* Routes d'authentification */}
            <Route path="/inscription" element={<RegisterPage />} />
            <Route path="/connexion" element={<LoginPage />} />
            
            {/* Route pour les professionnels en attente */}
            <Route path="/professionnel/en-attente" element={<ProfessionalPendingPage />} />
            
            {/* Pages publiques */}
            <Route path="/evenements" element={<div>Page Événements (à implémenter)</div>} />
            <Route path="/patrimoine" element={<div>Page Patrimoine (à implémenter)</div>} />
            <Route path="/oeuvres" element={<div>Page Œuvres (à implémenter)</div>} />
            <Route path="/artisanat" element={<div>Page Artisanat (à implémenter)</div>} />
            <Route path="/a-propos" element={<div>Page À Propos (à implémenter)</div>} />
            
            {/* ===== ROUTES PROTÉGÉES - UTILISATEURS CONNECTÉS ===== */}
            <Route
              path="/profil"
              element={
                <ProtectedRoute requiresAuth requiresValidation>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/mon-profil"
              element={
                <ProtectedRoute requiresAuth requiresValidation>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            
            {/* ===== ROUTES ADMINISTRATIVES ===== */}
            {/* Dashboard admin principal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Routes admin - Gestion des utilisateurs */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/users/pending/:id"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Validation utilisateur (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            {/* Routes admin - Gestion du contenu */}
            <Route
              path="/admin/oeuvres"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminOeuvresPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/oeuvres/pending/:id"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Validation œuvre (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/evenements"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminEvenementsPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/evenements/pending/:id"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Validation événement (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            {/* Routes admin - Modération et activité */}
            <Route
              path="/admin/moderation"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminModerationPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/activity"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <AdminActivityPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/pending"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Tous les éléments en attente (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Signalements (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/search"
              element={
                <ProtectedRoute requiresAuth requiresRole={['Admin', 'Moderateur']}>
                  <div>Recherche admin (à implémenter)</div>
                </ProtectedRoute>
              }
            />
            
            {/* ===== ROUTES LÉGALES ===== */}
            <Route path="/contact" element={<div>Page Contact (à implémenter)</div>} />
            <Route path="/confidentialite" element={<div>Politique de Confidentialité (à implémenter)</div>} />
            <Route path="/conditions" element={<div>Conditions d'Utilisation (à implémenter)</div>} />
            <Route path="/charte-professionnelle" element={<div>Charte Professionnelle (à implémenter)</div>} />
            
            {/* ===== ROUTES SPÉCIALES ===== */}
            {/* Route de mot de passe oublié */}
            <Route path="/mot-de-passe-oublie" element={<div>Mot de passe oublié (à implémenter)</div>} />
            
            {/* ===== FALLBACK 404 ===== */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-[#f8fbfa]">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-[#0e1a13] mb-4">404</h1>
                    <p className="text-xl text-[#51946b] mb-8">
                      Page non trouvée
                    </p>
                    <a 
                      href="/" 
                      className="px-6 py-3 bg-[#eb9f13] text-[#0e1a13] rounded-lg font-bold hover:opacity-90 transition-opacity inline-block"
                    >
                      Retour à l'accueil
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;