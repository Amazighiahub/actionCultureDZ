// pages/DashboardAdmin.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Database,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  FileText,
  BarChart3,
  PieChart,
  Filter,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Trash2,
  Edit,
  Edit2,
  UserCog,
  Lock,
  Unlock,
  Key,
  Mail,
  Phone,
  Building,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useConfirmedActionWithDialog } from '@/hooks/useConfirmedAction';
import { cn } from '@/lib/utils';

// Hook personnalisé pour le debounce
const useDebouncedValue = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

const DashboardAdmin = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 500);
  
  // États pour la sélection multiple
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // États pour les modals
  const [editUserModal, setEditUserModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [suspendUserModal, setSuspendUserModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  
  // État du formulaire d'édition
  const [editFormData, setEditFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    type_user: '',
    statut: '',
    biographie: '',
    entreprise: '',
    site_web: ''
  });
  
  // État du formulaire de suspension
  const [suspendFormData, setSuspendFormData] = useState({
    duree: 7,
    raison: ''
  });

  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    // Données
    overview,
    stats,
    patrimoineStats,
    pendingUsers,
    pendingOeuvres,
    moderationQueue,
    alerts,
    
    // États
    loading,
    loadingOverview,
    loadingPendingUsers,
    loadingPendingOeuvres,
    loadingModeration,
    
    // Actions
    validateUser,
    validateOeuvre,
    moderateSignalement,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    resetUserPassword,
    refreshAll,
    changePeriod,
    exportReport,
    clearCache,
    bulkUserAction,
    exportUsers,
    searchUsers,
    
    // État
    selectedPeriod,
  } = useDashboardAdmin();

  // Actions confirmées avec dialog
  const deleteUserAction = useConfirmedActionWithDialog(
    async ({ userId }: { userId: number }) => {
      await deleteUser({ userId });
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    },
    {
      dialogTitle: 'Supprimer l\'utilisateur',
      dialogDescription: 'Cette action est irréversible. Toutes les données de l\'utilisateur seront marquées comme supprimées.',
      confirmButtonText: 'Supprimer définitivement',
      cancelButtonText: 'Annuler',
      confirmButtonVariant: 'destructive',
      cooldownPeriod: 3000,
    }
  );

  const validateUserAction = useConfirmedActionWithDialog(
    async ({ userId, validated }: { userId: number; validated: boolean }) => {
      await validateUser({ userId, validated });
    },
    {
      dialogTitle: (validated: boolean) => validated ? 'Valider l\'utilisateur' : 'Rejeter l\'utilisateur',
      dialogDescription: (validated: boolean) => validated 
        ? 'Voulez-vous valider cet utilisateur et lui donner accès à la plateforme ?'
        : 'Voulez-vous rejeter la demande de cet utilisateur ?',
      confirmButtonText: (validated: boolean) => validated ? 'Valider' : 'Rejeter',
      confirmButtonVariant: (validated: boolean) => validated ? 'default' : 'destructive',
      cooldownPeriod: 2000,
    }
  );

  const bulkDeleteAction = useConfirmedActionWithDialog(
    async (userIds: number[]) => {
      await bulkUserAction(userIds, 'delete');
      setSelectedUsers([]);
      setIsSelectMode(false);
    },
    {
      dialogTitle: 'Supprimer plusieurs utilisateurs',
      dialogDescription: `Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ? Cette action est irréversible.`,
      confirmButtonText: 'Supprimer tout',
      confirmButtonVariant: 'destructive',
      cooldownPeriod: 5000,
    }
  );

  // Cast pour gérer les deux formats possibles
  const pendingUsersData = pendingUsers as any;
  const pendingOeuvresData = pendingOeuvres as any;
  const moderationQueueData = moderationQueue as any;

  // Filtrer et paginer les utilisateurs
  const filteredAndPaginatedUsers = useMemo(() => {
    let users = pendingUsersData?.items || pendingUsersData?.users || [];
    
    // Appliquer la recherche
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      users = users.filter((user: any) => 
        user.nom?.toLowerCase().includes(query) ||
        user.prenom?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.type_user?.toLowerCase().includes(query) ||
        user.entreprise?.toLowerCase().includes(query)
      );
    }

    // Calculer la pagination
    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      totalItems,
      totalPages,
      currentPage,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }, [pendingUsersData, debouncedSearchQuery, currentPage, itemsPerPage]);

  // Fonction pour formater les nombres
  const formatNumber = (num?: number): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Fonction pour formater les dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Gérer la sélection d'utilisateurs
  const toggleUserSelection = useCallback((userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const selectAllUsers = useCallback(() => {
    const currentUserIds = filteredAndPaginatedUsers.users.map((u: any) => u.id_user);
    if (selectedUsers.length === currentUserIds.length && 
        selectedUsers.every(id => currentUserIds.includes(id))) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUserIds);
    }
  }, [filteredAndPaginatedUsers.users, selectedUsers]);

  // Gérer la modification d'un utilisateur
  const handleEditUser = (user: any) => {
    setEditFormData({
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      type_user: user.type_user || '',
      statut: user.statut || 'actif',
      biographie: user.biographie || '',
      entreprise: user.entreprise || '',
      site_web: user.site_web || ''
    });
    setEditUserModal({ open: true, user });
  };

  // Gérer la suspension d'un utilisateur
  const handleSuspendUser = (user: any) => {
    setSuspendFormData({ duree: 7, raison: '' });
    setSuspendUserModal({ open: true, user });
  };

  // Soumettre la modification
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUserModal.user) return;
    
    await updateUser({
      userId: editUserModal.user.id_user,
      data: editFormData
    });
    
    setEditUserModal({ open: false, user: null });
  };

  // Confirmer la suspension
  const confirmSuspendUser = async () => {
    if (!suspendUserModal.user || !suspendFormData.raison) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer une raison pour la suspension",
        variant: "destructive",
      });
      return;
    }
    
    await suspendUser({
      userId: suspendUserModal.user.id_user,
      duration: suspendFormData.duree,
      reason: suspendFormData.raison
    });
    
    setSuspendUserModal({ open: false, user: null });
  };

  // Gérer la réinitialisation du mot de passe
  const handleResetPassword = async (user: any) => {
    if (confirm(`Réinitialiser le mot de passe de ${user.prenom} ${user.nom} ?`)) {
      await resetUserPassword({ userId: user.id_user });
    }
  };

  // Gérer la réactivation d'un utilisateur
  const handleReactivateUser = async (user: any) => {
    if (confirm(`Réactiver l'utilisateur ${user.prenom} ${user.nom} ?`)) {
      await reactivateUser({ userId: user.id_user });
    }
  };

  // Carte de statistique
  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: any) => {
    const colorClasses = {
      primary: 'text-primary bg-primary/10',
      secondary: 'text-secondary bg-secondary/10',
      success: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      danger: 'text-red-600 bg-red-100'
    };

    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn("p-3 rounded-full", colorClasses[color] || colorClasses.primary)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {trend !== undefined && (
            <div className="mt-3 flex items-center text-xs">
              <TrendingUp className={cn("h-3 w-3 mr-1", trend > 0 ? "text-green-600" : "text-red-600")} />
              <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(trend)}% vs période précédente
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Composant de pagination
  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-muted-foreground">
        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredAndPaginatedUsers.totalItems)} sur {filteredAndPaginatedUsers.totalItems} résultats
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={!filteredAndPaginatedUsers.hasPrev}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => prev - 1)}
          disabled={!filteredAndPaginatedUsers.hasPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex items-center px-3 text-sm">
          Page {currentPage} sur {filteredAndPaginatedUsers.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={!filteredAndPaginatedUsers.hasNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(filteredAndPaginatedUsers.totalPages)}
          disabled={!filteredAndPaginatedUsers.hasNext}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Tableau de bord administrateur</h1>
            <p className="text-muted-foreground mt-1">Vue d'ensemble de la plateforme Action Culture</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(value: any) => changePeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => refreshAll?.()} 
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportReport && exportReport('activity')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Rapport d'activité
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport && exportReport('moderation')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Rapport de modération
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport && exportReport('patrimoine')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Rapport patrimoine
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" onClick={() => clearCache && clearCache()}>
              <Database className="h-4 w-4 mr-2" />
              Vider cache
            </Button>
          </div>
        </div>

        {/* Alertes importantes */}
        {alerts && alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high').map((alert, index) => (
              <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {alert.type === 'security' ? 'Alerte de sécurité' :
                   alert.type === 'performance' ? 'Performance' :
                   alert.type === 'content' ? 'Contenu' : 'Système'}
                </AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Cartes de statistiques */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {loadingOverview ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : overview ? (
            <>
              <StatCard
                title="Utilisateurs"
                value={formatNumber(overview.users?.total)}
                subtitle={`+${overview.users?.nouveaux_mois || 0} ce mois`}
                icon={Users}
                trend={overview.growth?.users_growth_percent}
                color="primary"
              />
              
              <StatCard
                title="Contenus"
                value={formatNumber(overview.content?.oeuvres_total)}
                subtitle={`${overview.content?.oeuvres_en_attente || 0} en attente`}
                icon={BookOpen}
                trend={overview.growth?.content_growth_percent}
                color="secondary"
              />
              
              <StatCard
                title="Événements"
                value={formatNumber(overview.content?.evenements_total)}
                subtitle={`${overview.content?.evenements_actifs || 0} actifs`}
                icon={Calendar}
                color="success"
              />
              
              <StatCard
                title="Patrimoine"
                value={formatNumber(overview.content?.sites_patrimoine)}
                subtitle={`${patrimoineStats?.sites_unesco || 0} UNESCO`}
                icon={MapPin}
                color="warning"
              />
            </>
          ) : null}
        </div>

        {/* Actions rapides */}
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {/* Utilisateurs en attente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Utilisateurs en attente</span>
                <Badge variant="secondary">
                  {pendingUsersData?.pagination?.total || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPendingUsers ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (pendingUsersData?.items || pendingUsersData?.users) && (pendingUsersData?.items?.length > 0 || pendingUsersData?.users?.length > 0) ? (
                <div className="space-y-3">
                  {(pendingUsersData.items || pendingUsersData.users).slice(0, 3).map((user: any) => (
                    <div key={user.id_user} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.prenom} {user.nom}</p>
                        <p className="text-sm text-muted-foreground">{user.type_user}</p>
                        {user.statut_validation && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {user.statut_validation}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => validateUserAction.execute({ userId: user.id_user, validated: true })}
                          disabled={validateUserAction.isLoading}
                          title="Valider"
                        >
                          {validateUserAction.isLoading && validateUserAction.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => validateUserAction.execute({ userId: user.id_user, validated: false })}
                          disabled={validateUserAction.isLoading}
                          title="Rejeter"
                        >
                          {validateUserAction.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(pendingUsersData.items?.length > 3 || pendingUsersData.users?.length > 3) && (
                    <Button 
                      variant="link" 
                      className="w-full" 
                      onClick={() => setActiveTab('users')}
                    >
                      Voir tous les utilisateurs en attente →
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun utilisateur en attente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Œuvres en attente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Œuvres en attente</span>
                <Badge variant="secondary">
                  {pendingOeuvresData?.pagination?.total || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPendingOeuvres ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (pendingOeuvresData?.items || pendingOeuvresData?.oeuvres) && (pendingOeuvresData?.items?.length > 0 || pendingOeuvresData?.oeuvres?.length > 0) ? (
                <div className="space-y-3">
                  {(pendingOeuvresData.items || pendingOeuvresData.oeuvres).slice(0, 3).map((oeuvre: any) => (
                    <div key={oeuvre.id_oeuvre} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{oeuvre.titre}</p>
                        <p className="text-sm text-muted-foreground">
                          {oeuvre.auteur?.prenom} {oeuvre.auteur?.nom}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => validateOeuvre && validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => validateOeuvre && validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(pendingOeuvresData.items?.length > 3 || pendingOeuvresData.oeuvres?.length > 3) && (
                    <Button 
                      variant="link" 
                      className="w-full" 
                      onClick={() => setActiveTab('content')}
                    >
                      Voir toutes les œuvres en attente →
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune œuvre en attente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Signalements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Signalements</span>
                <Badge variant="destructive">
                  {moderationQueueData?.pagination?.total || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingModeration ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (moderationQueueData?.items || moderationQueueData?.signalements) && (moderationQueueData?.items?.length > 0 || moderationQueueData?.signalements?.length > 0) ? (
                <div className="space-y-3">
                  {(moderationQueueData.items || moderationQueueData.signalements).slice(0, 3).map((item: any) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{item.entity_title}</p>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(moderationQueueData.items?.length > 3 || moderationQueueData.signalements?.length > 3) && (
                    <Button 
                      variant="link" 
                      className="w-full" 
                      onClick={() => setActiveTab('moderation')}
                    >
                      Voir tous les signalements →
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun signalement en attente
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Onglets détaillés */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="moderation">Modération</TabsTrigger>
            <TabsTrigger value="patrimoine">Patrimoine</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6">
              {/* Graphique d'activité (placeholder) */}
              <Card>
                <CardHeader>
                  <CardTitle>Activité de la plateforme</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-muted rounded">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Graphiques d'activité</p>
                      <p className="text-sm text-muted-foreground">Les données seront affichées ici</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistiques détaillées */}
              {stats && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Répartition des utilisateurs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(stats.charts?.content_by_type || {}).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{type}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-secondary rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${(count as number / stats.stats.total_users) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{count as number}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activité récente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-[200px]">
                        <Activity className="h-12 w-12 text-muted-foreground animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Utilisateurs */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>
                  Liste complète des utilisateurs ({filteredAndPaginatedUsers.totalItems} résultats)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Barre de recherche et actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, email, entreprise..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset à la première page lors d'une recherche
                      }}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={isSelectMode ? "secondary" : "outline"}
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedUsers([]);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSelectMode ? 'Annuler sélection' : 'Mode sélection'}
                    </Button>
                    
                    {isSelectMode && selectedUsers.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          onClick={selectAllUsers}
                        >
                          {selectedUsers.length === filteredAndPaginatedUsers.users.length ? 'Désélectionner' : 'Sélectionner'} tout
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary">
                              Actions ({selectedUsers.length})
                              <MoreVertical className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => bulkUserAction(selectedUsers, 'activate')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => bulkUserAction(selectedUsers, 'deactivate')}>
                              <UserX className="h-4 w-4 mr-2" />
                              Désactiver
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => bulkDeleteAction.execute(selectedUsers)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => exportUsers('excel', { search: searchQuery })}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>

                {/* Liste des utilisateurs */}
                {loadingPendingUsers ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                ) : filteredAndPaginatedUsers.users.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {filteredAndPaginatedUsers.users.map((user: any) => (
                        <Card key={user.id_user} className={cn(
                          "p-4 transition-all duration-200",
                          selectedUsers.includes(user.id_user) && "ring-2 ring-primary shadow-lg"
                        )}>
                          <div className="flex items-start justify-between">
                            {isSelectMode && (
                              <Checkbox
                                checked={selectedUsers.includes(user.id_user)}
                                onCheckedChange={() => toggleUserSelection(user.id_user)}
                                className="mt-1 mr-3"
                              />
                            )}
                            
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold">{user.prenom} {user.nom}</h4>
                                <Badge variant="outline">{user.type_user}</Badge>
                                {user.statut_validation && (
                                  <Badge 
                                    variant={user.statut_validation === 'en_attente' ? 'secondary' : 'default'}
                                  >
                                    {user.statut_validation.replace('_', ' ')}
                                  </Badge>
                                )}
                                {user.statut === 'suspendu' && (
                                  <Badge variant="destructive">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Suspendu
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                                {user.telephone && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {user.telephone}
                                  </p>
                                )}
                                {user.entreprise && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Building className="h-3 w-3" />
                                    {user.entreprise}
                                  </p>
                                )}
                                {user.site_web && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Globe className="h-3 w-3" />
                                    <a href={user.site_web} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      {user.site_web}
                                    </a>
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  Inscrit le {formatDate(user.date_inscription || user.date_creation)}
                                </p>
                              </div>
                              {user.biographie && (
                                <p className="text-sm mt-2 text-gray-700 line-clamp-2">{user.biographie}</p>
                              )}
                              {user.specialites && user.specialites.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {user.specialites.map((spec: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{spec}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              {/* Boutons principaux */}
                              <Button 
                                size="sm" 
                                onClick={() => validateUserAction.execute({ userId: user.id_user, validated: true })}
                                disabled={validateUserAction.isLoading || validateUserAction.cooldown}
                                title="Valider"
                              >
                                {validateUserAction.isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Valider
                                  </>
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => validateUserAction.execute({ userId: user.id_user, validated: false })}
                                disabled={validateUserAction.isLoading || validateUserAction.cooldown}
                                title="Rejeter"
                              >
                                {validateUserAction.isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    Rejeter
                                  </>
                                )}
                              </Button>
                              
                              {/* Menu déroulant pour plus d'actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  
                                  {user.statut !== 'suspendu' ? (
                                    <DropdownMenuItem onClick={() => handleSuspendUser(user)}>
                                      <Lock className="h-4 w-4 mr-2" />
                                      Suspendre
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleReactivateUser(user)}>
                                      <Unlock className="h-4 w-4 mr-2" />
                                      Réactiver
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                    <Key className="h-4 w-4 mr-2" />
                                    Réinitialiser MDP
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    onClick={() => deleteUserAction.execute({ userId: user.id_user })}
                                    disabled={deleteUserAction.isLoading || deleteUserAction.cooldown}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                    {deleteUserAction.cooldown && (
                                      <span className="ml-2 text-xs">
                                        ({Math.ceil(deleteUserAction.timeUntilNextExecution / 1000)}s)
                                      </span>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    <PaginationControls />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? `Aucun résultat pour "${searchQuery}"`
                        : 'Aucun utilisateur à afficher'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenu */}
          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion du contenu</CardTitle>
                <CardDescription>
                  Œuvres en attente de validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPendingOeuvres ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                ) : (pendingOeuvresData?.items || pendingOeuvresData?.oeuvres) && (pendingOeuvresData?.items?.length > 0 || pendingOeuvresData?.oeuvres?.length > 0) ? (
                  <div className="space-y-4">
                    {(pendingOeuvresData.items || pendingOeuvresData.oeuvres).map((oeuvre: any) => (
                      <Card key={oeuvre.id_oeuvre} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{oeuvre.titre}</h4>
                              <Badge variant="outline">{oeuvre.type_oeuvre}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Par {oeuvre.auteur?.prenom} {oeuvre.auteur?.nom}
                            </p>
                            {oeuvre.description && (
                              <p className="text-sm line-clamp-2">{oeuvre.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Soumis le {formatDate(oeuvre.date_creation)}
                            </p>
                          </div>
                          {oeuvre.medias && oeuvre.medias.length > 0 && (
                            <div className="ml-4">
                              <img 
                                src={oeuvre.medias[0].url} 
                                alt={oeuvre.titre}
                                className="w-24 h-24 object-cover rounded"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => validateOeuvre && validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => validateOeuvre && validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir détails
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aucune œuvre en attente de validation
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modération */}
          <TabsContent value="moderation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>File de modération</CardTitle>
                <CardDescription>
                  Signalements et contenus à modérer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingModeration ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                ) : (moderationQueueData?.items || moderationQueueData?.signalements) && (moderationQueueData?.items?.length > 0 || moderationQueueData?.signalements?.length > 0) ? (
                  <div className="space-y-4">
                    {(moderationQueueData.items || moderationQueueData.signalements).map((item: any) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{item.entity_title}</h4>
                              <Badge variant="destructive">{item.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Raison : {item.reason}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Signalé par : {item.reported_by?.nom || 'Anonyme'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Date : {formatDate(item.date_signalement)}
                            </p>
                          </div>
                          <Badge 
                            variant={item.status === 'pending' ? 'secondary' : 
                                    item.status === 'reviewed' ? 'default' : 'outline'}
                          >
                            {item.status === 'pending' ? 'En attente' :
                             item.status === 'reviewed' ? 'Examiné' : 'Résolu'}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm"
                            onClick={() => moderateSignalement && moderateSignalement({ signalementId: item.id, action: 'approve' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => moderateSignalement && moderateSignalement({ signalementId: item.id, action: 'reject' })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => moderateSignalement && moderateSignalement({ signalementId: item.id, action: 'warn' })}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Avertir
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aucun signalement en attente
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patrimoine */}
          <TabsContent value="patrimoine" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion du patrimoine</CardTitle>
                <CardDescription>
                  Sites patrimoniaux et statistiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patrimoineStats ? (
                  <div className="space-y-6">
                    {/* Statistiques générales */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Total sites</p>
                        <p className="text-2xl font-bold">{patrimoineStats.total_sites}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Sites UNESCO</p>
                        <p className="text-2xl font-bold">{patrimoineStats.sites_unesco}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Visites ce mois</p>
                        <p className="text-2xl font-bold">{formatNumber(patrimoineStats.visites_mois)}</p>
                      </div>
                    </div>
                    
                    {/* Répartition par type */}
                    {Object.keys(patrimoineStats.sites_par_type || {}).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Répartition par type</h4>
                        <div className="space-y-2">
                          {Object.entries(patrimoineStats.sites_par_type).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm capitalize">{type}</span>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Top wilayas */}
                    {patrimoineStats.sites_par_wilaya && patrimoineStats.sites_par_wilaya.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Top wilayas</h4>
                        <div className="space-y-2">
                          {patrimoineStats.sites_par_wilaya.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{item.wilaya}</span>
                              <Badge variant="secondary">{item.count} sites</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Chargement des données du patrimoine...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de modification */}
      <Dialog open={editUserModal.open} onOpenChange={(open) => !open && setEditUserModal({ open: false, user: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur
            </DialogDescription>
          </DialogHeader>
          
          {editUserModal.user && (
            <form onSubmit={handleUpdateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input 
                      id="nom" 
                      value={editFormData.nom}
                      onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input 
                      id="prenom" 
                      value={editFormData.prenom}
                      onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input 
                    id="telephone" 
                    value={editFormData.telephone}
                    onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type_user">Type d'utilisateur</Label>
                    <Select 
                      value={editFormData.type_user} 
                      onValueChange={(value) => setEditFormData({ ...editFormData, type_user: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visiteur">Visiteur</SelectItem>
                        <SelectItem value="artisan">Artisan</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="statut">Statut</Label>
                    <Select 
                      value={editFormData.statut}
                      onValueChange={(value) => setEditFormData({ ...editFormData, statut: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                        <SelectItem value="suspendu">Suspendu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {editFormData.type_user !== 'visiteur' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="entreprise">Entreprise</Label>
                      <Input 
                        id="entreprise" 
                        value={editFormData.entreprise}
                        onChange={(e) => setEditFormData({ ...editFormData, entreprise: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="site_web">Site web</Label>
                      <Input 
                        id="site_web" 
                        type="url"
                        value={editFormData.site_web}
                        onChange={(e) => setEditFormData({ ...editFormData, site_web: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="biographie">Biographie</Label>
                      <Textarea 
                        id="biographie" 
                        rows={4}
                        value={editFormData.biographie}
                        onChange={(e) => setEditFormData({ ...editFormData, biographie: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUserModal({ open: false, user: null })}>
                  Annuler
                </Button>
                <Button type="submit">
                  <UserCog className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de suspension */}
      <Dialog open={suspendUserModal.open} onOpenChange={(open) => !open && setSuspendUserModal({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre l'utilisateur</DialogTitle>
            <DialogDescription>
              Suspendre temporairement l'accès de cet utilisateur
            </DialogDescription>
          </DialogHeader>
          
          {suspendUserModal.user && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Suspension de compte</AlertTitle>
                <AlertDescription>
                  Vous allez suspendre l'utilisateur <strong>{suspendUserModal.user.prenom} {suspendUserModal.user.nom}</strong>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="duree">Durée de suspension (jours)</Label>
                <Input 
                  id="duree" 
                  type="number"
                  min="1"
                  max="365"
                  value={suspendFormData.duree}
                  onChange={(e) => setSuspendFormData({ ...suspendFormData, duree: parseInt(e.target.value) || 7 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="raison">Raison de la suspension *</Label>
                <Textarea 
                  id="raison" 
                  rows={3}
                  placeholder="Indiquez la raison de la suspension..."
                  value={suspendFormData.raison}
                  onChange={(e) => setSuspendFormData({ ...suspendFormData, raison: e.target.value })}
                  required
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendUserModal({ open: false, user: null })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmSuspendUser}>
              <Lock className="h-4 w-4 mr-2" />
              Suspendre pour {suspendFormData.duree} jours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajouter les dialogs des actions confirmées */}
      {deleteUserAction.dialog}
      {validateUserAction.dialog}
      {bulkDeleteAction.dialog}

      <Footer />
    </div>
  );
};

export default DashboardAdmin;