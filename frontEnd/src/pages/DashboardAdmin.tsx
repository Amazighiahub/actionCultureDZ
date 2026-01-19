/**
 * DashboardAdmin.tsx - VERSION REFACTORISÉE
 * EMPLACEMENT: src/pages/DashboardAdmin.tsx
 * IMPORTS: ./admin/ (pas ./components/)
 */
import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Composants UI
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Button } from '@/components/UI/button';
import { Alert, AlertDescription } from '@/components/UI/alert';

// Composants partagés
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Icônes
import {
  Users, BookOpen, Calendar, Shield, Activity,
  MapPin, Package, Bell, RefreshCw, Settings, Wifi, WifiOff
} from 'lucide-react';

// Hooks
import { useAdminAuth } from '@/hooks/useAdmin';
import { useSocket } from '@/hooks/useSocket';

// ✅ LAZY LOADING - CHEMIN CORRIGÉ: ./admin/
const AdminOverview = React.lazy(() => import('./admin/AdminOverview'));
const AdminUsersTab = React.lazy(() => import('./admin/AdminUsersTab'));
const AdminOeuvresTab = React.lazy(() => import('./admin/AdminOeuvresTab'));
const AdminEvenementsTab = React.lazy(() => import('./admin/AdminEvenementsTab'));
const AdminPatrimoineTab = React.lazy(() => import('./admin/AdminPatrimoineTab'));
const AdminServicesTab = React.lazy(() => import('./admin/AdminServicesTab'));
const AdminModerationTab = React.lazy(() => import('./admin/AdminModerationTab'));
const AdminNotificationsModal = React.lazy(() => import('./admin/AdminNotificationsModal'));

// Composant de fallback pour chaque onglet
const TabFallback: React.FC = () => (
  <div className="space-y-6">
    <LoadingSkeleton type="stats" />
    <LoadingSkeleton type="table" count={5} />
  </div>
);

const DashboardAdmin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // États
  const [activeTab, setActiveTab] = useState('overview');
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  
  // Hooks personnalisés
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const { isConnected, connect: reconnect } = useSocket();

  // Vérification des permissions admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  // Afficher un loader pendant la vérification auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <LoadingSkeleton type="stats" />
        </main>
      </div>
    );
  }

  // Définition des onglets
  const tabs = [
    { id: 'overview', label: t('admin.tabs.overview', 'Vue d\'ensemble'), icon: Activity },
    { id: 'users', label: t('admin.tabs.users', 'Utilisateurs'), icon: Users },
    { id: 'oeuvres', label: t('admin.tabs.works', 'Œuvres'), icon: BookOpen },
    { id: 'evenements', label: t('admin.tabs.events', 'Événements'), icon: Calendar },
    { id: 'patrimoine', label: t('admin.tabs.heritage', 'Patrimoine'), icon: MapPin },
    { id: 'services', label: t('admin.tabs.services', 'Services'), icon: Package },
    { id: 'moderation', label: t('admin.tabs.moderation', 'Modération'), icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">
              {t('admin.dashboard.title', 'Administration')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.dashboard.subtitle', 'Gérez votre plateforme culturelle')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Indicateur de connexion WebSocket */}
            <Button
              variant="ghost"
              size="icon"
              onClick={reconnect}
              title={isConnected ? 'Connecté' : 'Déconnecté - Cliquez pour reconnecter'}
            >
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </Button>

            {/* Bouton notifications */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setNotificationModalOpen(true)}
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* Bouton paramètres */}
            <Button variant="outline" size="icon" onClick={() => navigate('/admin/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Alerte si WebSocket déconnecté */}
        {!isConnected && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <WifiOff className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('admin.alerts.disconnected', 'Connexion temps réel perdue. Les données peuvent ne pas être à jour.')}
              <Button variant="link" size="sm" onClick={reconnect} className="ml-2">
                {t('common.reconnect', 'Reconnecter')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation par onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto p-1 h-auto gap-1 bg-muted/50 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Contenu des onglets avec ErrorBoundary et Suspense */}
          <ErrorBoundary>
            <TabsContent value="overview">
              <Suspense fallback={<TabFallback />}>
                <AdminOverview />
              </Suspense>
            </TabsContent>

            <TabsContent value="users">
              <Suspense fallback={<TabFallback />}>
                <AdminUsersTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="oeuvres">
              <Suspense fallback={<TabFallback />}>
                <AdminOeuvresTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="evenements">
              <Suspense fallback={<TabFallback />}>
                <AdminEvenementsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="patrimoine">
              <Suspense fallback={<TabFallback />}>
                <AdminPatrimoineTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="services">
              <Suspense fallback={<TabFallback />}>
                <AdminServicesTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="moderation">
              <Suspense fallback={<TabFallback />}>
                <AdminModerationTab />
              </Suspense>
            </TabsContent>
          </ErrorBoundary>
        </Tabs>

        {/* Modal de notifications (lazy) */}
        {notificationModalOpen && (
          <Suspense fallback={null}>
            <AdminNotificationsModal
              isOpen={notificationModalOpen}
              onClose={() => setNotificationModalOpen(false)}
            />
          </Suspense>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DashboardAdmin;