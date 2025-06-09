import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiUsers,
  HiDocumentText,
  HiCalendar,
  HiMapPin,
  HiExclamationTriangle,
  HiArrowTrendingUp,
  HiArrowTrendingDown,
  HiArrowPath,
  HiArrowRightOnRectangle,
  HiCog6Tooth,
  HiChartBar,
  HiUserGroup,
  HiFlag,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiEye,
  HiMagnifyingGlass,
  HiChevronRight
} from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import { dashboardService, DashboardStats, PendingItem, RecentActivity } from '../services/dashboard.service';

// Composant pour les cartes de statistiques
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  growth?: number;
  bgColor: string;
  textColor: string;
  onClick?: () => void;
}> = ({ title, value, icon, growth, bgColor, textColor, onClick }) => {
  // Fonction pour obtenir la couleur selon la croissance
  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div 
      className={`bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#0e1a13] text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${textColor} mt-2`}>{value}</p>
          {growth !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${getGrowthColor(growth)}`}>
              {growth > 0 ? <HiArrowTrendingUp className="w-4 h-4" /> : <HiArrowTrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{Math.abs(growth)}%</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  
  // États
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'moderation'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Styles personnalisés
  const customStyles = {
    bgPrimary: 'bg-[#f8fbfa]',
    textPrimary: 'text-[#0e1a13]',
    textSecondary: 'text-[#51946b]',
    bgSecondary: 'bg-[#e8f2ec]',
    bgAccent: 'bg-[#eb9f13]',
    borderColor: 'border-[#e8f2ec]',
    hoverAccent: 'hover:text-[#eb9f13]',
    textAccent: 'text-[#eb9f13]',
    cardBg: 'bg-white',
    shadowSoft: 'shadow-sm'
  };

  // Vérifier l'accès admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Charger les données au montage
  useEffect(() => {
    loadDashboardData();
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const [statsData, pendingData, activityData] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getPendingItems(),
        dashboardService.getRecentActivity()
      ]);

      setStats(statsData);
      setPendingItems(pendingData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      // Vous pourriez ajouter une notification d'erreur ici
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour formater la durée
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Gestionnaire de déconnexion
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/connexion');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Gestionnaire de recherche
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Navigation vers les sections
  const navigateToSection = (section: string) => {
    navigate(`/admin/${section}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbfa]">
        <div className="flex flex-col items-center gap-4">
          <HiArrowPath className="w-8 h-8 animate-spin text-[#eb9f13]" />
          <span className="text-[#0e1a13] text-lg">Chargement du tableau de bord...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${customStyles.bgPrimary}`}>
      {/* Header */}
      <header className={`${customStyles.cardBg} border-b ${customStyles.borderColor} sticky top-0 z-10`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="size-8 hover:opacity-70 transition-opacity"
              >
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                    fill="currentColor"
                    className={customStyles.textPrimary}
                  />
                </svg>
              </button>
              <h1 className={`${customStyles.textPrimary} text-xl font-bold`}>
                Tableau de bord administratif
              </h1>
              
              {/* Indicateur de rafraîchissement */}
              {refreshing && (
                <div className="flex items-center gap-2 text-sm text-[#51946b]">
                  <HiArrowPath className="w-4 h-4 animate-spin" />
                  <span>Mise à jour...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Barre de recherche */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-[#e8f2ec] focus:outline-none focus:border-[#eb9f13] w-64"
                />
                <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#51946b]" />
              </form>
              
              {/* Bouton de rafraîchissement */}
              <button
                onClick={() => loadDashboardData()}
                className={`p-2 rounded-lg ${customStyles.bgSecondary} ${customStyles.textPrimary} hover:bg-[#dae9e0] transition-colors`}
                title="Rafraîchir les données"
              >
                <HiArrowPath className="w-5 h-5" />
              </button>
              
              {/* Profil utilisateur */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`${customStyles.textPrimary} text-sm font-medium`}>
                    {user?.prenom} {user?.nom}
                  </p>
                  <p className={`${customStyles.textSecondary} text-xs`}>
                    Administrateur
                  </p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${customStyles.bgAccent} ${customStyles.textPrimary} font-medium hover:opacity-90 transition-opacity`}
                >
                  <HiArrowRightOnRectangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-6 mt-4 border-t pt-4">
            {['overview', 'users', 'content', 'moderation'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-2 px-1 font-medium transition-colors relative ${
                  activeTab === tab 
                    ? customStyles.textAccent 
                    : `${customStyles.textPrimary} hover:text-[#eb9f13]`
                }`}
              >
                {tab === 'overview' && 'Vue d\'ensemble'}
                {tab === 'users' && 'Utilisateurs'}
                {tab === 'content' && 'Contenu'}
                {tab === 'moderation' && 'Modération'}
                
                {/* Badges de notification */}
                {tab === 'users' && stats?.users.pendingValidation && stats.users.pendingValidation > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {stats.users.pendingValidation}
                  </span>
                )}
                {tab === 'content' && stats?.content.pendingOeuvres && stats.content.pendingOeuvres > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                    {stats.content.pendingOeuvres}
                  </span>
                )}
                {tab === 'moderation' && stats?.moderation.pendingReports && stats.moderation.pendingReports > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                    {stats.moderation.pendingReports}
                  </span>
                )}
                
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#eb9f13]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Utilisateurs"
                value={stats.users.total.toLocaleString('fr-FR')}
                icon={<HiUsers className="w-6 h-6 text-white" />}
                growth={stats.users.growth}
                bgColor="bg-blue-500"
                textColor="text-blue-600"
                onClick={() => navigateToSection('users')}
              />
              
              <StatCard
                title="Œuvres"
                value={stats.content.totalOeuvres.toLocaleString('fr-FR')}
                icon={<HiDocumentText className="w-6 h-6 text-white" />}
                bgColor="bg-green-500"
                textColor="text-green-600"
                onClick={() => navigateToSection('oeuvres')}
              />
              
              <StatCard
                title="Événements"
                value={stats.content.totalEvenements.toLocaleString('fr-FR')}
                icon={<HiCalendar className="w-6 h-6 text-white" />}
                bgColor="bg-purple-500"
                textColor="text-purple-600"
                onClick={() => navigateToSection('evenements')}
              />
              
              <StatCard
                title="Visites Aujourd'hui"
                value={stats.activity.visitsToday.toLocaleString('fr-FR')}
                icon={<HiChartBar className="w-6 h-6 text-white" />}
                growth={stats.activity.visitsGrowth}
                bgColor="bg-orange-500"
                textColor="text-orange-600"
              />
            </div>

            {/* Alertes et actions rapides */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Éléments en attente */}
              <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`${customStyles.textPrimary} text-lg font-semibold`}>
                    En attente de validation
                  </h3>
                  <span className="text-sm text-[#51946b]">
                    {pendingItems.length} éléments
                  </span>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingItems.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Aucun élément en attente</p>
                  ) : (
                    pendingItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${customStyles.bgSecondary} hover:bg-[#dae9e0] transition-colors cursor-pointer`}
                        onClick={() => {
                          if (item.type === 'user') navigateToSection(`users/pending/${item.id}`);
                          else if (item.type === 'oeuvre') navigateToSection(`oeuvres/pending/${item.id}`);
                          else navigateToSection(`evenements/pending/${item.id}`);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.type === 'user' ? 'bg-blue-100 text-blue-600' :
                            item.type === 'oeuvre' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {item.type === 'user' ? <HiUsers className="w-5 h-5" /> :
                             item.type === 'oeuvre' ? <HiDocumentText className="w-5 h-5" /> :
                             <HiCalendar className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <p className={`${customStyles.textPrimary} text-sm font-medium`}>{item.title}</p>
                            <p className={`${customStyles.textSecondary} text-xs`}>{item.author} • {item.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'urgent' && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded">
                              Urgent
                            </span>
                          )}
                          <HiChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {pendingItems.length > 0 && (
                  <button 
                    onClick={() => navigateToSection('pending')}
                    className={`w-full mt-4 py-2 rounded-lg ${customStyles.bgAccent} ${customStyles.textPrimary} font-medium hover:opacity-90 transition-opacity`}
                  >
                    Voir tout ({stats.users.pendingValidation + stats.content.pendingOeuvres})
                  </button>
                )}
              </div>

              {/* Activité récente */}
              <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`${customStyles.textPrimary} text-lg font-semibold`}>
                    Activité récente
                  </h3>
                  <button 
                    onClick={() => navigateToSection('activity')}
                    className="text-sm text-[#eb9f13] hover:underline"
                  >
                    Voir plus
                  </button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Aucune activité récente</p>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'create' ? 'bg-green-100 text-green-600' :
                          activity.type === 'update' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'delete' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {activity.type === 'create' ? <HiCheckCircle className="w-4 h-4" /> :
                           activity.type === 'update' ? <HiArrowPath className="w-4 h-4" /> :
                           activity.type === 'delete' ? <HiXCircle className="w-4 h-4" /> :
                           <HiFlag className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className={customStyles.textPrimary}>
                            <span className="font-medium">{activity.user}</span> {activity.action} <span className="font-medium">{activity.target}</span>
                          </p>
                          <p className={`${customStyles.textSecondary} text-xs mt-1`}>{activity.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Statistiques de modération */}
              <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
                <h3 className={`${customStyles.textPrimary} text-lg font-semibold mb-4`}>
                  Modération
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <HiExclamationTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className={`${customStyles.textPrimary} text-sm font-medium`}>Signalements</p>
                        <p className={`${customStyles.textSecondary} text-xs`}>En attente</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{stats.moderation.pendingReports}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <HiCheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className={`${customStyles.textPrimary} text-sm font-medium`}>Résolus</p>
                        <p className={`${customStyles.textSecondary} text-xs`}>Aujourd'hui</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{stats.moderation.resolvedToday}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <HiClock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className={`${customStyles.textPrimary} text-sm font-medium`}>Temps de réponse</p>
                        <p className={`${customStyles.textSecondary} text-xs`}>Moyenne</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{stats.moderation.avgResponseTime}h</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => navigateToSection('moderation')}
                  className={`w-full mt-4 py-2 rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-colors`}
                >
                  Centre de modération
                </button>
              </div>
            </div>

            {/* Actions rapides */}
            <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
              <h3 className={`${customStyles.textPrimary} text-lg font-semibold mb-4`}>
                Actions rapides
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigateToSection('users/new')}
                  className="p-4 rounded-lg border border-[#e8f2ec] hover:border-[#eb9f13] hover:bg-[#f8fbfa] transition-all text-center"
                >
                  <HiUsers className="w-8 h-8 text-[#51946b] mx-auto mb-2" />
                  <span className="text-sm text-[#0e1a13]">Ajouter utilisateur</span>
                </button>
                
                <button
                  onClick={() => navigateToSection('content/validate')}
                  className="p-4 rounded-lg border border-[#e8f2ec] hover:border-[#eb9f13] hover:bg-[#f8fbfa] transition-all text-center"
                >
                  <HiCheckCircle className="w-8 h-8 text-[#51946b] mx-auto mb-2" />
                  <span className="text-sm text-[#0e1a13]">Valider contenu</span>
                </button>
                
                <button
                  onClick={() => navigateToSection('reports')}
                  className="p-4 rounded-lg border border-[#e8f2ec] hover:border-[#eb9f13] hover:bg-[#f8fbfa] transition-all text-center"
                >
                  <HiFlag className="w-8 h-8 text-[#51946b] mx-auto mb-2" />
                  <span className="text-sm text-[#0e1a13]">Signalements</span>
                </button>
                
                <button
                  onClick={() => navigateToSection('settings')}
                  className="p-4 rounded-lg border border-[#e8f2ec] hover:border-[#eb9f13] hover:bg-[#f8fbfa] transition-all text-center"
                >
                  <HiCog6Tooth className="w-8 h-8 text-[#51946b] mx-auto mb-2" />
                  <span className="text-sm text-[#0e1a13]">Paramètres</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Autres onglets */}
        {activeTab === 'users' && (
          <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`${customStyles.textPrimary} text-xl font-semibold`}>
                Gestion des utilisateurs
              </h2>
              <button
                onClick={() => navigateToSection('users')}
                className={`px-4 py-2 rounded-lg ${customStyles.bgAccent} ${customStyles.textPrimary} font-medium hover:opacity-90 transition-opacity`}
              >
                Accéder à la gestion complète
              </button>
            </div>
            
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">Nouveaux aujourd'hui</p>
                  <p className="text-2xl font-bold text-[#0e1a13]">{stats.users.newToday}</p>
                </div>
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">Actifs aujourd'hui</p>
                  <p className="text-2xl font-bold text-[#0e1a13]">{stats.users.activeToday}</p>
                </div>
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">En attente de validation</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.users.pendingValidation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`${customStyles.textPrimary} text-xl font-semibold`}>
                Gestion du contenu
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateToSection('oeuvres')}
                  className={`px-4 py-2 rounded-lg border border-[#e8f2ec] ${customStyles.textPrimary} hover:border-[#eb9f13] transition-colors`}
                >
                  Œuvres
                </button>
                <button
                  onClick={() => navigateToSection('evenements')}
                  className={`px-4 py-2 rounded-lg border border-[#e8f2ec] ${customStyles.textPrimary} hover:border-[#eb9f13] transition-colors`}
                >
                  Événements
                </button>
              </div>
            </div>
            
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">Œuvres en attente</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.content.pendingOeuvres}</p>
                </div>
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">Événements à venir</p>
                  <p className="text-2xl font-bold text-[#0e1a13]">{stats.content.upcomingEvenements}</p>
                </div>
                <div className="p-4 bg-[#f8fbfa] rounded-lg">
                  <p className="text-[#51946b] text-sm">Total artisanat</p>
                  <p className="text-2xl font-bold text-[#0e1a13]">{stats.content.totalArtisanat}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className={`${customStyles.cardBg} rounded-lg p-6 ${customStyles.shadowSoft}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`${customStyles.textPrimary} text-xl font-semibold`}>
                Centre de modération
              </h2>
              <button
                onClick={() => navigateToSection('moderation')}
                className={`px-4 py-2 rounded-lg ${customStyles.bgAccent} ${customStyles.textPrimary} font-medium hover:opacity-90 transition-opacity`}
              >
                Accéder au centre complet
              </button>
            </div>
            
            {stats && stats.moderation.pendingReports > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiExclamationTriangle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 font-medium">
                      {stats.moderation.pendingReports} signalements en attente
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Temps de réponse moyen : {stats.moderation.avgResponseTime}h
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="w-6 h-6 text-green-600" />
                  <p className="text-green-800">
                    Aucun signalement en attente. Tout est sous contrôle !
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;