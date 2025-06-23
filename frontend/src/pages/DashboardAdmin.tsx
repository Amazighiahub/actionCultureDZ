// pages/DashboardAdmin.tsx - VERSION COMPLÈTE ET CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Loader2,
  Star,
  DollarSign,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  Tag,
  Heart,
  Share2,
  Play,
  Pause,
  Ban,
  Award,
  Briefcase,
  Package,
  ShoppingBag,
  Hammer,
  Image,
  Clock3,
  Euro,
  ChevronDown,
  SlidersHorizontal,
  X as XIcon,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardAdmin, useAdminFilters } from '@/hooks/useDashboardAdmin';
import { useConfirmedActionWithDialog } from '@/hooks/useConfirmedAction';
import { cn } from '@/lib/utils';

// Hook personnalisé pour le debounce
const useDebouncedValue = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Constantes pour les options de filtres
const TYPES_OEUVRE = [
  'peinture', 'sculpture', 'photographie', 'artisanat', 'calligraphie', 'ceramique', 'textile', 'bijouterie'
];

const TYPES_EVENEMENT = [
  'exposition', 'concert', 'festival', 'conference', 'atelier', 'visite_guidee', 'spectacle', 'concours'
];

const TYPES_PATRIMOINE = [
  'monument', 'site_archeologique', 'musee', 'batiment_historique', 'site_naturel', 'medina', 'kasbah'
];

const TYPES_SERVICE = [
  'guide_touristique', 'transport', 'hebergement', 'restauration', 'artisanat', 'formation', 'consultation'
];

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'MSila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane'
];

const DashboardAdmin = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // États pour les recherches de chaque onglet
  const [searchOeuvres, setSearchOeuvres] = useState('');
  const [searchEvenements, setSearchEvenements] = useState('');
  const [searchPatrimoine, setSearchPatrimoine] = useState('');
  const [searchServices, setSearchServices] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  
  // Debounced searches
  const debouncedSearchOeuvres = useDebouncedValue(searchOeuvres, 500);
  const debouncedSearchEvenements = useDebouncedValue(searchEvenements, 500);
  const debouncedSearchPatrimoine = useDebouncedValue(searchPatrimoine, 500);
  const debouncedSearchServices = useDebouncedValue(searchServices, 500);
  const debouncedSearchUsers = useDebouncedValue(searchUsers, 500);
  
  // États pour les filtres
  const {
    oeuvreFilters,
    setOeuvreFilters,
    resetOeuvreFilters,
    evenementFilters,
    setEvenementFilters,
    resetEvenementFilters,
    patrimoineFilters,
    setPatrimoineFilters,
    resetPatrimoineFilters,
    serviceFilters,
    setServiceFilters,
    resetServiceFilters
  } = useAdminFilters();
  
  // États pour les sélections multiples
  const [selectedOeuvres, setSelectedOeuvres] = useState<number[]>([]);
  const [selectedEvenements, setSelectedEvenements] = useState<number[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // États pour les modes sélection
  const [isSelectModeOeuvres, setIsSelectModeOeuvres] = useState(false);
  const [isSelectModeEvenements, setIsSelectModeEvenements] = useState(false);
  const [isSelectModeServices, setIsSelectModeServices] = useState(false);
  const [isSelectModeUsers, setIsSelectModeUsers] = useState(false);
  
  // États pour l'affichage des filtres
  const [showOeuvreFilters, setShowOeuvreFilters] = useState(false);
  const [showEvenementFilters, setShowEvenementFilters] = useState(false);
  const [showPatrimoineFilters, setShowPatrimoineFilters] = useState(false);
  const [showServiceFilters, setShowServiceFilters] = useState(false);
  
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
  const [currentPageOeuvres, setCurrentPageOeuvres] = useState(1);
  const [currentPageEvenements, setCurrentPageEvenements] = useState(1);
  const [currentPagePatrimoine, setCurrentPagePatrimoine] = useState(1);
  const [currentPageServices, setCurrentPageServices] = useState(1);
  const [currentPageUsers, setCurrentPageUsers] = useState(1);
  const itemsPerPage = 10;

  const {
    // Données existantes
    overview,
    stats,
    patrimoineStats,
    pendingUsers,
    pendingOeuvres,
    moderationQueue,
    alerts,
    
    // Nouvelles données
    oeuvres,
    evenements,
    patrimoineItems,
    services,
    
    // États de chargement existants
    loading,
    loadingOverview,
    loadingPendingUsers,
    loadingPendingOeuvres,
    loadingModeration,
    
    // Nouveaux états de chargement
    loadingOeuvres,
    loadingEvenements,
    loadingPatrimoine,
    loadingServices,
    
    // Actions existantes
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
    
    // Nouvelles actions
    updateOeuvreStatus,
    deleteOeuvre,
    updateEvenementStatus,
    deleteEvenement,
    updateServiceStatus,
    deleteService,
    
    // Nouvelles fonctions de chargement avec filtres
    loadOeuvres,
    loadEvenements,
    loadPatrimoineItems,
    loadServices,
    
    // État
    selectedPeriod,
  } = useDashboardAdmin();

  // Charger les données initiales quand l'onglet devient actif
  useEffect(() => {
    if (activeTab === 'oeuvres' && !oeuvres) {
      loadOeuvres({ page: 1, limit: itemsPerPage });
    }
  }, [activeTab, oeuvres, loadOeuvres]);

  useEffect(() => {
    if (activeTab === 'evenements' && !evenements) {
      loadEvenements({ page: 1, limit: itemsPerPage });
    }
  }, [activeTab, evenements, loadEvenements]);

  useEffect(() => {
    if (activeTab === 'patrimoine' && !patrimoineItems) {
      loadPatrimoineItems({ page: 1, limit: itemsPerPage });
    }
  }, [activeTab, patrimoineItems, loadPatrimoineItems]);

  useEffect(() => {
    if (activeTab === 'services' && !services) {
      loadServices({ page: 1, limit: itemsPerPage });
    }
  }, [activeTab, services, loadServices]);

  // Appliquer les filtres seulement quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'oeuvres' && debouncedSearchOeuvres !== undefined) {
      const filters = {
        ...oeuvreFilters,
        search: debouncedSearchOeuvres || undefined,
        page: currentPageOeuvres,
        limit: itemsPerPage
      };
      loadOeuvres(filters);
    }
  }, [oeuvreFilters, debouncedSearchOeuvres, currentPageOeuvres, activeTab]);

  useEffect(() => {
    if (activeTab === 'evenements' && debouncedSearchEvenements !== undefined) {
      const filters = {
        ...evenementFilters,
        search: debouncedSearchEvenements || undefined,
        page: currentPageEvenements,
        limit: itemsPerPage
      };
      loadEvenements(filters);
    }
  }, [evenementFilters, debouncedSearchEvenements, currentPageEvenements, activeTab]);

  useEffect(() => {
    if (activeTab === 'patrimoine' && debouncedSearchPatrimoine !== undefined) {
      const filters = {
        ...patrimoineFilters,
        search: debouncedSearchPatrimoine || undefined,
        page: currentPagePatrimoine,
        limit: itemsPerPage
      };
      loadPatrimoineItems(filters);
    }
  }, [patrimoineFilters, debouncedSearchPatrimoine, currentPagePatrimoine, activeTab]);

  useEffect(() => {
    if (activeTab === 'services' && debouncedSearchServices !== undefined) {
      const filters = {
        ...serviceFilters,
        search: debouncedSearchServices || undefined,
        page: currentPageServices,
        limit: itemsPerPage
      };
      loadServices(filters);
    }
  }, [serviceFilters, debouncedSearchServices, currentPageServices, activeTab]);

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

  const deleteOeuvreAction = useConfirmedActionWithDialog(
    async ({ oeuvreId }: { oeuvreId: number }) => {
      await deleteOeuvre(oeuvreId);
      setSelectedOeuvres(prev => prev.filter(id => id !== oeuvreId));
    },
    {
      dialogTitle: 'Supprimer l\'œuvre',
      dialogDescription: 'Cette action est irréversible. L\'œuvre sera définitivement supprimée.',
      confirmButtonText: 'Supprimer',
      confirmButtonVariant: 'destructive',
      cooldownPeriod: 2000,
    }
  );

  const deleteEvenementAction = useConfirmedActionWithDialog(
    async ({ evenementId }: { evenementId: number }) => {
      await deleteEvenement(evenementId);
      setSelectedEvenements(prev => prev.filter(id => id !== evenementId));
    },
    {
      dialogTitle: 'Supprimer l\'événement',
      dialogDescription: 'Cette action est irréversible. L\'événement sera définitivement supprimé.',
      confirmButtonText: 'Supprimer',
      confirmButtonVariant: 'destructive',
      cooldownPeriod: 2000,
    }
  );

  const deleteServiceAction = useConfirmedActionWithDialog(
    async ({ serviceId }: { serviceId: number }) => {
      await deleteService(serviceId);
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    },
    {
      dialogTitle: 'Supprimer le service',
      dialogDescription: 'Cette action est irréversible. Le service sera définitivement supprimé.',
      confirmButtonText: 'Supprimer',
      confirmButtonVariant: 'destructive',
      cooldownPeriod: 2000,
    }
  );

  // Cast pour gérer les deux formats possibles
  const pendingUsersData = pendingUsers as any;
  const pendingOeuvresData = pendingOeuvres as any;
  const moderationQueueData = moderationQueue as any;

  // Nouvelles données filtrées et paginées
  const filteredAndPaginatedOeuvres = useMemo(() => {
    const items = oeuvres?.items || [];
    const totalItems = oeuvres?.pagination?.total || items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      items: items,
      totalItems,
      totalPages,
      currentPage: currentPageOeuvres,
      hasNext: currentPageOeuvres < totalPages,
      hasPrev: currentPageOeuvres > 1
    };
  }, [oeuvres, currentPageOeuvres]);

  const filteredAndPaginatedEvenements = useMemo(() => {
    const items = evenements?.items || [];
    const totalItems = evenements?.pagination?.total || items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      items: items,
      totalItems,
      totalPages,
      currentPage: currentPageEvenements,
      hasNext: currentPageEvenements < totalPages,
      hasPrev: currentPageEvenements > 1
    };
  }, [evenements, currentPageEvenements]);

  const filteredAndPaginatedPatrimoine = useMemo(() => {
    const items = patrimoineItems?.items || [];
    const totalItems = patrimoineItems?.pagination?.total || items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      items: items,
      totalItems,
      totalPages,
      currentPage: currentPagePatrimoine,
      hasNext: currentPagePatrimoine < totalPages,
      hasPrev: currentPagePatrimoine > 1
    };
  }, [patrimoineItems, currentPagePatrimoine]);

  const filteredAndPaginatedServices = useMemo(() => {
    const items = services?.items || [];
    const totalItems = services?.pagination?.total || items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      items: items,
      totalItems,
      totalPages,
      currentPage: currentPageServices,
      hasNext: currentPageServices < totalPages,
      hasPrev: currentPageServices > 1
    };
  }, [services, currentPageServices]);

  const filteredAndPaginatedUsers = useMemo(() => {
    let users = pendingUsersData?.items || pendingUsersData?.users || [];
    
    if (debouncedSearchUsers) {
      const query = debouncedSearchUsers.toLowerCase();
      users = users.filter((user: any) => 
        user.nom?.toLowerCase().includes(query) ||
        user.prenom?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.type_user?.toLowerCase().includes(query) ||
        user.entreprise?.toLowerCase().includes(query)
      );
    }

    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPageUsers - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      totalItems,
      totalPages,
      currentPage: currentPageUsers,
      hasNext: currentPageUsers < totalPages,
      hasPrev: currentPageUsers > 1
    };
  }, [pendingUsersData, debouncedSearchUsers, currentPageUsers]);

  // Fonctions utilitaires
  const formatNumber = (num?: number): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

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

  const formatPrice = (price?: number, unit?: string) => {
    if (!price) return 'Gratuit';
    return `${price} ${unit || 'DA'}`;
  };

  const formatRating = (rating?: number) => {
    if (!rating) return 'N/A';
    return `${rating.toFixed(1)}/5`;
  };

  // Gérer la sélection d'éléments
  const toggleOeuvreSelection = useCallback((oeuvreId: number) => {
    setSelectedOeuvres(prev => 
      prev.includes(oeuvreId) 
        ? prev.filter(id => id !== oeuvreId)
        : [...prev, oeuvreId]
    );
  }, []);

  const toggleEvenementSelection = useCallback((evenementId: number) => {
    setSelectedEvenements(prev => 
      prev.includes(evenementId) 
        ? prev.filter(id => id !== evenementId)
        : [...prev, evenementId]
    );
  }, []);

  const toggleServiceSelection = useCallback((serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const toggleUserSelection = useCallback((userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

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

  const handleSuspendUser = (user: any) => {
    setSuspendFormData({ duree: 7, raison: '' });
    setSuspendUserModal({ open: true, user });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUserModal.user) return;
    
    await updateUser({
      userId: editUserModal.user.id_user,
      data: editFormData
    });
    
    setEditUserModal({ open: false, user: null });
  };

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

  const handleResetPassword = async (user: any) => {
    if (confirm(`Réinitialiser le mot de passe de ${user.prenom} ${user.nom} ?`)) {
      await resetUserPassword({ userId: user.id_user });
    }
  };

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

  // Composant de pagination générique
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    totalItems, 
    hasNext, 
    hasPrev, 
    onPageChange,
    itemsPerPage 
  }: any) => (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-muted-foreground">
        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} résultats
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPrev}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex items-center px-3 text-sm">
          Page {currentPage} sur {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
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
                title="Œuvres"
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
                          {validateUserAction.isLoading ? (
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
                      onClick={() => setActiveTab('oeuvres')}
                    >
                      Voir toutes les œuvres →
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" type="button">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users" type="button">Utilisateurs</TabsTrigger>
            <TabsTrigger value="oeuvres" type="button">Œuvres</TabsTrigger>
            <TabsTrigger value="evenements" type="button">Événements</TabsTrigger>
            <TabsTrigger value="patrimoine" type="button">Patrimoine</TabsTrigger>
            <TabsTrigger value="services" type="button">Services</TabsTrigger>
            <TabsTrigger value="moderation" type="button">Modération</TabsTrigger>
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
                      value={searchUsers}
                      onChange={(e) => {
                        setSearchUsers(e.target.value);
                        setCurrentPageUsers(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={isSelectModeUsers ? "secondary" : "outline"}
                      onClick={() => {
                        setIsSelectModeUsers(!isSelectModeUsers);
                        setSelectedUsers([]);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSelectModeUsers ? 'Annuler sélection' : 'Mode sélection'}
                    </Button>
                    
                    {isSelectModeUsers && selectedUsers.length > 0 && (
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
                            onClick={() => {
                              if (selectedUsers.length > 0) {
                                bulkUserAction(selectedUsers, 'delete');
                                setSelectedUsers([]);
                                setIsSelectModeUsers(false);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => exportUsers('excel', { search: searchUsers })}
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
                            {isSelectModeUsers && (
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
                    
                    <PaginationControls 
                      currentPage={filteredAndPaginatedUsers.currentPage}
                      totalPages={filteredAndPaginatedUsers.totalPages}
                      totalItems={filteredAndPaginatedUsers.totalItems}
                      hasNext={filteredAndPaginatedUsers.hasNext}
                      hasPrev={filteredAndPaginatedUsers.hasPrev}
                      onPageChange={setCurrentPageUsers}
                      itemsPerPage={itemsPerPage}
                    />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchUsers 
                        ? `Aucun résultat pour "${searchUsers}"`
                        : 'Aucun utilisateur à afficher'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Œuvres */}
          <TabsContent value="oeuvres" className="mt-6">
            <div className="space-y-6">
              {/* Panneau de filtres */}
              {showOeuvreFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Filtres avancés
                      <Button variant="ghost" size="sm" onClick={() => setShowOeuvreFilters(false)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Type d'œuvre</Label>
                        <Select 
                          value={oeuvreFilters.type_oeuvre || ''} 
                          onValueChange={(value) => setOeuvreFilters({ ...oeuvreFilters, type_oeuvre: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les types</SelectItem>
                            {TYPES_OEUVRE.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select 
                          value={oeuvreFilters.statut || ''} 
                          onValueChange={(value) => setOeuvreFilters({ ...oeuvreFilters, statut: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les statuts</SelectItem>
                            <SelectItem value="en_attente">En attente</SelectItem>
                            <SelectItem value="valide">Validé</SelectItem>
                            <SelectItem value="rejete">Rejeté</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Wilaya</Label>
                        <Select 
                          value={oeuvreFilters.wilaya || ''} 
                          onValueChange={(value) => setOeuvreFilters({ ...oeuvreFilters, wilaya: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Toutes les wilayas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Toutes les wilayas</SelectItem>
                            {WILAYAS.map(wilaya => (
                              <SelectItem key={wilaya} value={wilaya}>{wilaya}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Prix maximum</Label>
                        <Input
                          type="number"
                          placeholder="Prix max"
                          value={oeuvreFilters.prix_max || ''}
                          onChange={(e) => setOeuvreFilters({ ...oeuvreFilters, prix_max: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => {
                        resetOeuvreFilters();
                        setCurrentPageOeuvres(1);
                      }}>
                        Réinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des œuvres</CardTitle>
                  <CardDescription>
                    Liste complète des œuvres ({filteredAndPaginatedOeuvres.totalItems} résultats)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Barre de recherche et actions */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre, auteur, type..."
                        value={searchOeuvres}
                        onChange={(e) => {
                          setSearchOeuvres(e.target.value);
                          setCurrentPageOeuvres(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowOeuvreFilters(!showOeuvreFilters)}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filtres
                      </Button>
                      
                      <Button
                        variant={isSelectModeOeuvres ? "secondary" : "outline"}
                        onClick={() => {
                          setIsSelectModeOeuvres(!isSelectModeOeuvres);
                          setSelectedOeuvres([]);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSelectModeOeuvres ? 'Annuler sélection' : 'Mode sélection'}
                      </Button>
                      
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>

                  {/* Liste des œuvres */}
                  {loadingOeuvres ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : filteredAndPaginatedOeuvres.items.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {filteredAndPaginatedOeuvres.items.map((oeuvre: any) => (
                          <Card key={oeuvre.id_oeuvre} className={cn(
                            "p-4 transition-all duration-200",
                            selectedOeuvres.includes(oeuvre.id_oeuvre) && "ring-2 ring-primary shadow-lg"
                          )}>
                            <div className="flex items-start justify-between">
                              {isSelectModeOeuvres && (
                                <Checkbox
                                  checked={selectedOeuvres.includes(oeuvre.id_oeuvre)}
                                  onCheckedChange={() => toggleOeuvreSelection(oeuvre.id_oeuvre)}
                                  className="mt-1 mr-3"
                                />
                              )}
                              
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold">{oeuvre.titre}</h4>
                                  <Badge variant="outline">{oeuvre.type_oeuvre}</Badge>
                                  <Badge 
                                    variant={oeuvre.statut === 'valide' ? 'default' : 
                                            oeuvre.statut === 'en_attente' ? 'secondary' : 'destructive'}
                                  >
                                    {oeuvre.statut?.replace('_', ' ')}
                                  </Badge>
                                  {oeuvre.prix && (
                                    <Badge variant="outline">
                                      <Euro className="h-3 w-3 mr-1" />
                                      {formatPrice(oeuvre.prix)}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    Par {oeuvre.auteur?.prenom} {oeuvre.auteur?.nom} 
                                    {oeuvre.auteur?.type_user && ` (${oeuvre.auteur.type_user})`}
                                  </p>
                                  
                                  {oeuvre.description && (
                                    <p className="text-sm line-clamp-2">{oeuvre.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      {formatDate(oeuvre.date_creation)}
                                    </span>
                                    
                                    {oeuvre.wilaya && (
                                      <span className="flex items-center gap-1">
                                        <MapPinIcon className="h-3 w-3" />
                                        {oeuvre.wilaya}
                                      </span>
                                    )}
                                    
                                    {oeuvre.nombre_vues && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {oeuvre.nombre_vues} vues
                                      </span>
                                    )}
                                    
                                    {oeuvre.note_moyenne && (
                                      <span className="flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        {formatRating(oeuvre.note_moyenne)}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {oeuvre.tags && oeuvre.tags.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {oeuvre.tags.slice(0, 3).map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          <Tag className="h-2 w-2 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))}
                                      {oeuvre.tags.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{oeuvre.tags.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                              {oeuvre.statut === 'en_attente' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateOeuvreStatus(oeuvre.id_oeuvre, 'valide')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approuver
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateOeuvreStatus(oeuvre.id_oeuvre, 'rejete')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeter
                                  </Button>
                                </>
                              )}
                              
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4 mr-1" />
                                Voir détails
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Award className="h-4 w-4 mr-2" />
                                    Mettre en avant
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteOeuvreAction.execute({ oeuvreId: oeuvre.id_oeuvre })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <PaginationControls 
                        currentPage={filteredAndPaginatedOeuvres.currentPage}
                        totalPages={filteredAndPaginatedOeuvres.totalPages}
                        totalItems={filteredAndPaginatedOeuvres.totalItems}
                        hasNext={filteredAndPaginatedOeuvres.hasNext}
                        hasPrev={filteredAndPaginatedOeuvres.hasPrev}
                        onPageChange={setCurrentPageOeuvres}
                        itemsPerPage={itemsPerPage}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchOeuvres 
                          ? `Aucun résultat pour "${searchOeuvres}"`
                          : 'Aucune œuvre à afficher'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Événements */}
          <TabsContent value="evenements" className="mt-6">
            <div className="space-y-6">
              {/* Panneau de filtres */}
              {showEvenementFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Filtres avancés
                      <Button variant="ghost" size="sm" onClick={() => setShowEvenementFilters(false)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Type d'événement</Label>
                        <Select 
                          value={evenementFilters.type_evenement || ''} 
                          onValueChange={(value) => setEvenementFilters({ ...evenementFilters, type_evenement: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les types</SelectItem>
                            {TYPES_EVENEMENT.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select 
                          value={evenementFilters.statut || ''} 
                          onValueChange={(value) => setEvenementFilters({ ...evenementFilters, statut: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les statuts</SelectItem>
                            <SelectItem value="a_venir">À venir</SelectItem>
                            <SelectItem value="en_cours">En cours</SelectItem>
                            <SelectItem value="termine">Terminé</SelectItem>
                            <SelectItem value="annule">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Wilaya</Label>
                        <Select 
                          value={evenementFilters.wilaya || ''} 
                          onValueChange={(value) => setEvenementFilters({ ...evenementFilters, wilaya: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Toutes les wilayas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Toutes les wilayas</SelectItem>
                            {WILAYAS.map(wilaya => (
                              <SelectItem key={wilaya} value={wilaya}>{wilaya}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date de début</Label>
                        <Input
                          type="date"
                          value={evenementFilters.date_debut || ''}
                          onChange={(e) => setEvenementFilters({ ...evenementFilters, date_debut: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => {
                        resetEvenementFilters();
                        setCurrentPageEvenements(1);
                      }}>
                        Réinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des événements</CardTitle>
                  <CardDescription>
                    Liste complète des événements ({filteredAndPaginatedEvenements.totalItems} résultats)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Barre de recherche et actions */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre, organisateur, lieu..."
                        value={searchEvenements}
                        onChange={(e) => {
                          setSearchEvenements(e.target.value);
                          setCurrentPageEvenements(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEvenementFilters(!showEvenementFilters)}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filtres
                      </Button>
                      
                      <Button
                        variant={isSelectModeEvenements ? "secondary" : "outline"}
                        onClick={() => {
                          setIsSelectModeEvenements(!isSelectModeEvenements);
                          setSelectedEvenements([]);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSelectModeEvenements ? 'Annuler sélection' : 'Mode sélection'}
                      </Button>
                      
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>

                  {/* Liste des événements */}
                  {loadingEvenements ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : filteredAndPaginatedEvenements.items.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {filteredAndPaginatedEvenements.items.map((evenement: any) => (
                          <Card key={evenement.id_evenement} className={cn(
                            "p-4 transition-all duration-200",
                            selectedEvenements.includes(evenement.id_evenement) && "ring-2 ring-primary shadow-lg"
                          )}>
                            <div className="flex items-start justify-between">
                              {isSelectModeEvenements && (
                                <Checkbox
                                  checked={selectedEvenements.includes(evenement.id_evenement)}
                                  onCheckedChange={() => toggleEvenementSelection(evenement.id_evenement)}
                                  className="mt-1 mr-3"
                                />
                              )}
                              
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold">{evenement.titre}</h4>
                                  <Badge variant="outline">{evenement.type_evenement}</Badge>
                                  <Badge 
                                    variant={evenement.statut === 'en_cours' ? 'default' : 
                                            evenement.statut === 'a_venir' ? 'secondary' : 
                                            evenement.statut === 'termine' ? 'outline' : 'destructive'}
                                  >
                                    {evenement.statut?.replace('_', ' ')}
                                  </Badge>
                                  {evenement.prix && (
                                    <Badge variant="outline">
                                      <Euro className="h-3 w-3 mr-1" />
                                      {formatPrice(evenement.prix)}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    Organisé par {evenement.organisateur?.prenom} {evenement.organisateur?.nom}
                                  </p>
                                  
                                  {evenement.description && (
                                    <p className="text-sm line-clamp-2">{evenement.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      {formatDate(evenement.date_debut)}
                                    </span>
                                    
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="h-3 w-3" />
                                      {evenement.lieu}, {evenement.wilaya}
                                    </span>
                                    
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {evenement.participants_count} participants
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {evenement.image && (
                                <div className="ml-4">
                                  <img 
                                    src={evenement.image} 
                                    alt={evenement.titre}
                                    className="w-24 h-24 object-cover rounded"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              {evenement.statut === 'a_venir' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateEvenementStatus(evenement.id_evenement, 'en_cours')}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Démarrer
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateEvenementStatus(evenement.id_evenement, 'annule')}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Annuler
                                  </Button>
                                </>
                              )}
                              
                              {evenement.statut === 'en_cours' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => updateEvenementStatus(evenement.id_evenement, 'termine')}
                                >
                                  <Pause className="h-4 w-4 mr-1" />
                                  Terminer
                                </Button>
                              )}
                              
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4 mr-1" />
                                Voir détails
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Award className="h-4 w-4 mr-2" />
                                    Mettre en avant
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteEvenementAction.execute({ evenementId: evenement.id_evenement })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <PaginationControls 
                        currentPage={filteredAndPaginatedEvenements.currentPage}
                        totalPages={filteredAndPaginatedEvenements.totalPages}
                        totalItems={filteredAndPaginatedEvenements.totalItems}
                        hasNext={filteredAndPaginatedEvenements.hasNext}
                        hasPrev={filteredAndPaginatedEvenements.hasPrev}
                        onPageChange={setCurrentPageEvenements}
                        itemsPerPage={itemsPerPage}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchEvenements 
                          ? `Aucun résultat pour "${searchEvenements}"`
                          : 'Aucun événement à afficher'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patrimoine */}
          <TabsContent value="patrimoine" className="mt-6">
            <div className="space-y-6">
              {/* Panneau de filtres patrimoine */}
              {showPatrimoineFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Filtres avancés
                      <Button variant="ghost" size="sm" onClick={() => setShowPatrimoineFilters(false)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Type de patrimoine</Label>
                        <Select 
                          value={patrimoineFilters.type_patrimoine || ''} 
                          onValueChange={(value) => setPatrimoineFilters({ ...patrimoineFilters, type_patrimoine: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les types</SelectItem>
                            {TYPES_PATRIMOINE.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Wilaya</Label>
                        <Select 
                          value={patrimoineFilters.wilaya || ''} 
                          onValueChange={(value) => setPatrimoineFilters({ ...patrimoineFilters, wilaya: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Toutes les wilayas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Toutes les wilayas</SelectItem>
                            {WILAYAS.map(wilaya => (
                              <SelectItem key={wilaya} value={wilaya}>{wilaya}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Classement</Label>
                        <Select 
                          value={patrimoineFilters.classement || ''} 
                          onValueChange={(value) => setPatrimoineFilters({ ...patrimoineFilters, classement: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les classements" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous</SelectItem>
                            <SelectItem value="unesco">UNESCO</SelectItem>
                            <SelectItem value="national">National</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => {
                        resetPatrimoineFilters();
                        setCurrentPagePatrimoine(1);
                      }}>
                        Réinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Gestion du patrimoine</CardTitle>
                  <CardDescription>
                    Liste des sites patrimoniaux ({filteredAndPaginatedPatrimoine.totalItems} résultats)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Barre de recherche */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom, wilaya, type..."
                        value={searchPatrimoine}
                        onChange={(e) => {
                          setSearchPatrimoine(e.target.value);
                          setCurrentPagePatrimoine(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowPatrimoineFilters(!showPatrimoineFilters)}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filtres
                      </Button>
                      
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>

                  {/* Liste */}
                  {loadingPatrimoine ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : filteredAndPaginatedPatrimoine.items.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {filteredAndPaginatedPatrimoine.items.map((site: any) => (
                          <Card key={site.id_patrimoine} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold">{site.nom}</h4>
                                  <Badge variant="outline">{site.type_patrimoine}</Badge>
                                  {site.classement_unesco && (
                                    <Badge variant="default">UNESCO</Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  {site.description && (
                                    <p className="text-sm line-clamp-2">{site.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="h-3 w-3" />
                                      {site.commune}, {site.wilaya}
                                    </span>
                                    
                                    {site.date_construction && (
                                      <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        {site.date_construction}
                                      </span>
                                    )}
                                    
                                    {site.nombre_visites && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {site.nombre_visites} visites
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {site.image_principale && (
                                <div className="ml-4">
                                  <img 
                                    src={site.image_principale} 
                                    alt={site.nom}
                                    className="w-24 h-24 object-cover rounded"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4 mr-1" />
                                Voir détails
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Award className="h-4 w-4 mr-2" />
                                    Mettre en avant
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <PaginationControls 
                        currentPage={filteredAndPaginatedPatrimoine.currentPage}
                        totalPages={filteredAndPaginatedPatrimoine.totalPages}
                        totalItems={filteredAndPaginatedPatrimoine.totalItems}
                        hasNext={filteredAndPaginatedPatrimoine.hasNext}
                        hasPrev={filteredAndPaginatedPatrimoine.hasPrev}
                        onPageChange={setCurrentPagePatrimoine}
                        itemsPerPage={itemsPerPage}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchPatrimoine 
                          ? `Aucun résultat pour "${searchPatrimoine}"`
                          : 'Aucun site patrimonial à afficher'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="mt-6">
            <div className="space-y-6">
              {/* Panneau de filtres services */}
              {showServiceFilters && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Filtres avancés
                      <Button variant="ghost" size="sm" onClick={() => setShowServiceFilters(false)}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Type de service</Label>
                        <Select 
                          value={serviceFilters.type_service || ''} 
                          onValueChange={(value) => setServiceFilters({ ...serviceFilters, type_service: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous les types</SelectItem>
                            {TYPES_SERVICE.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select 
                          value={serviceFilters.statut || ''} 
                          onValueChange={(value) => setServiceFilters({ ...serviceFilters, statut: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Tous</SelectItem>
                            <SelectItem value="actif">Actif</SelectItem>
                            <SelectItem value="inactif">Inactif</SelectItem>
                            <SelectItem value="suspendu">Suspendu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Wilaya</Label>
                        <Select 
                          value={serviceFilters.wilaya || ''} 
                          onValueChange={(value) => setServiceFilters({ ...serviceFilters, wilaya: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Toutes les wilayas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Toutes les wilayas</SelectItem>
                            {WILAYAS.map(wilaya => (
                              <SelectItem key={wilaya} value={wilaya}>{wilaya}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Prix maximum</Label>
                        <Input
                          type="number"
                          placeholder="Prix max"
                          value={serviceFilters.prix_max || ''}
                          onChange={(e) => setServiceFilters({ ...serviceFilters, prix_max: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => {
                        resetServiceFilters();
                        setCurrentPageServices(1);
                      }}>
                        Réinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des services</CardTitle>
                  <CardDescription>
                    Liste des services proposés ({filteredAndPaginatedServices.totalItems} résultats)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Barre de recherche */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre, prestataire, type..."
                        value={searchServices}
                        onChange={(e) => {
                          setSearchServices(e.target.value);
                          setCurrentPageServices(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowServiceFilters(!showServiceFilters)}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filtres
                      </Button>
                      
                      <Button
                        variant={isSelectModeServices ? "secondary" : "outline"}
                        onClick={() => {
                          setIsSelectModeServices(!isSelectModeServices);
                          setSelectedServices([]);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSelectModeServices ? 'Annuler sélection' : 'Mode sélection'}
                      </Button>
                      
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </div>

                  {/* Liste */}
                  {loadingServices ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : filteredAndPaginatedServices.items.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {filteredAndPaginatedServices.items.map((service: any) => (
                          <Card key={service.id_service} className={cn(
                            "p-4 transition-all duration-200",
                            selectedServices.includes(service.id_service) && "ring-2 ring-primary shadow-lg"
                          )}>
                            <div className="flex items-start justify-between">
                              {isSelectModeServices && (
                                <Checkbox
                                  checked={selectedServices.includes(service.id_service)}
                                  onCheckedChange={() => toggleServiceSelection(service.id_service)}
                                  className="mt-1 mr-3"
                                />
                              )}
                              
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold">{service.titre}</h4>
                                  <Badge variant="outline">{service.type_service}</Badge>
                                  <Badge 
                                    variant={service.statut === 'actif' ? 'default' : 
                                            service.statut === 'suspendu' ? 'destructive' : 'secondary'}
                                  >
                                    {service.statut}
                                  </Badge>
                                  {service.prix && (
                                    <Badge variant="outline">
                                      <Euro className="h-3 w-3 mr-1" />
                                      {formatPrice(service.prix, service.unite_prix)}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    Par {service.prestataire?.prenom} {service.prestataire?.nom}
                                    {service.prestataire?.entreprise && ` - ${service.prestataire.entreprise}`}
                                  </p>
                                  
                                  {service.description && (
                                    <p className="text-sm line-clamp-2">{service.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="h-3 w-3" />
                                      {service.wilaya}
                                    </span>
                                    
                                    {service.note_moyenne && (
                                      <span className="flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        {formatRating(service.note_moyenne)}
                                      </span>
                                    )}
                                    
                                    {service.nombre_reservations && (
                                      <span className="flex items-center gap-1">
                                        <ShoppingBag className="h-3 w-3" />
                                        {service.nombre_reservations} réservations
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              {service.statut === 'actif' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateServiceStatus(service.id_service, 'suspendu')}
                                >
                                  <Pause className="h-4 w-4 mr-1" />
                                  Suspendre
                                </Button>
                              )}
                              
                              {service.statut === 'suspendu' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => updateServiceStatus(service.id_service, 'actif')}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Réactiver
                                </Button>
                              )}
                              
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4 mr-1" />
                                Voir détails
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteServiceAction.execute({ serviceId: service.id_service })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <PaginationControls 
                        currentPage={filteredAndPaginatedServices.currentPage}
                        totalPages={filteredAndPaginatedServices.totalPages}
                        totalItems={filteredAndPaginatedServices.totalItems}
                        hasNext={filteredAndPaginatedServices.hasNext}
                        hasPrev={filteredAndPaginatedServices.hasPrev}
                        onPageChange={setCurrentPageServices}
                        itemsPerPage={itemsPerPage}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchServices 
                          ? `Aucun résultat pour "${searchServices}"`
                          : 'Aucun service à afficher'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{item.type}</Badge>
                              <Badge 
                                variant={item.status === 'pending' ? 'secondary' : 
                                        item.status === 'reviewed' ? 'default' : 'outline'}
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{item.entity_title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Raison : {item.reason}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Signalé par {item.reported_by?.nom} le {formatDate(item.date_signalement)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => moderateSignalement && moderateSignalement({ 
                                signalementId: item.id, 
                                action: 'approve' 
                              })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moderateSignalement && moderateSignalement({ 
                                signalementId: item.id, 
                                action: 'reject' 
                              })}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => moderateSignalement && moderateSignalement({ 
                                signalementId: item.id, 
                                action: 'warn' 
                              })}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Avertir
                            </Button>
                          </div>
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
        </Tabs>
      </main>

      {/* Modals */}
      {editUserModal.open && (
        <Dialog open={editUserModal.open} onOpenChange={(open) => !open && setEditUserModal({ open: false, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'utilisateur
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
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
                        <SelectItem value="artiste">Artiste</SelectItem>
                        <SelectItem value="artisan">Artisan</SelectItem>
                        <SelectItem value="organisateur">Organisateur</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
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
                    value={editFormData.site_web}
                    onChange={(e) => setEditFormData({ ...editFormData, site_web: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="biographie">Biographie</Label>
                  <Textarea
                    id="biographie"
                    value={editFormData.biographie}
                    onChange={(e) => setEditFormData({ ...editFormData, biographie: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditUserModal({ open: false, user: null })}>
                  Annuler
                </Button>
                <Button type="submit">
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de suspension */}
      {suspendUserModal.open && (
        <Dialog open={suspendUserModal.open} onOpenChange={(open) => !open && setSuspendUserModal({ open: false, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspendre l'utilisateur</DialogTitle>
              <DialogDescription>
                Suspendre {suspendUserModal.user?.prenom} {suspendUserModal.user?.nom}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duree">Durée de suspension (jours)</Label>
                <Select
                  value={suspendFormData.duree.toString()}
                  onValueChange={(value) => setSuspendFormData({ ...suspendFormData, duree: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 jour</SelectItem>
                    <SelectItem value="3">3 jours</SelectItem>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="14">14 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                    <SelectItem value="365">1 an</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="raison">Raison de la suspension</Label>
                <Textarea
                  id="raison"
                  value={suspendFormData.raison}
                  onChange={(e) => setSuspendFormData({ ...suspendFormData, raison: e.target.value })}
                  placeholder="Décrivez la raison de la suspension..."
                  rows={4}
                  required
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setSuspendUserModal({ open: false, user: null })}>
                Annuler
              </Button>
              <Button type="button" variant="destructive" onClick={confirmSuspendUser}>
                Suspendre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ajouter les dialogs des actions confirmées */}
      {deleteUserAction.dialog}
      {validateUserAction.dialog}
      {deleteOeuvreAction.dialog}
      {deleteEvenementAction.dialog}
      {deleteServiceAction.dialog}

      <Footer />
    </div>
  );
};

export default DashboardAdmin;