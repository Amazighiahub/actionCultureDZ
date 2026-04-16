import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  BookOpen,
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  Users,
  RefreshCw,
  MapPin,
  Search,
  Briefcase,
  Settings,
  Hammer,
  ChevronDown,
  AlertCircle,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardPro } from '@/hooks/useDashboardPro';
import { useTranslation } from "react-i18next";
import { useTranslateData } from '@/hooks/useTranslateData';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import GestionEvenement from '@/components/event/GestionEvenement';

/** Generic dashboard item with fields used across oeuvre/evenement/service/patrimoine/artisanat */
interface DashboardItem {
  id?: number;
  id_oeuvre?: number;
  id_evenement?: number;
  id_site?: number;
  id_service?: number;
  id_artisanat?: number;
  titre?: unknown;
  nom?: unknown;
  nom_evenement?: unknown;
  description?: unknown;
  lieu?: unknown;
  type?: unknown;
  type_service?: unknown;
  type_oeuvre?: { nom_type?: unknown };
  TypeOeuvre?: { nom_type?: unknown };
  vues?: number;
  visites?: number;
  note_moyenne?: number;
  statut?: string;
  date_debut?: string;
  Lieu?: { nom?: unknown; adresse?: unknown };
  nombre_participants?: number;
  wilaya?: unknown;
  tarif_min?: number;
  tarif_max?: number;
  horaires?: unknown;
  en_stock?: number;
  sur_commande?: boolean;
  prix_min?: number;
  prix_max?: number;
  Materiau?: { nom?: unknown };
  Technique?: { nom?: unknown };
  materiau?: unknown;
  technique?: unknown;
  [key: string]: unknown;
}

interface ItemRowProps {
  item: DashboardItem;
  type: string;
  onView: (item: DashboardItem) => void;
  onEdit: (item: DashboardItem) => void;
  onDelete: (item: DashboardItem) => void;
}

type MultiLangValue = string | Record<string, string> | undefined | null;

// Helper pour le badge statut événement
const getEventStatusBadge = (statut: string | undefined, t: (key: string, fallback?: string) => string) => {
  const s = statut || 'brouillon';
  const labels: Record<string, string> = {
    brouillon: t('events.status.draft', 'Brouillon'),
    planifie: t('events.status.planned', 'Planifié'),
    publie: t('events.status.published', 'Publié'),
    a_venir: t('events.status.upcoming', 'À venir'),
    en_cours: t('events.status.ongoing', 'En cours'),
    termine: t('events.status.finished', 'Terminé'),
    annule: t('events.status.cancelled', 'Annulé'),
  };
  const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    brouillon: 'outline',
    planifie: 'default',
    publie: 'default',
    a_venir: 'default',
    en_cours: 'secondary',
    termine: 'outline',
    annule: 'destructive',
  };
  return { label: labels[s] || s, variant: variants[s] || 'outline' };
};

const DashboardPro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('oeuvres');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; item: DashboardItem | null }>({ open: false, type: '', item: null });

  // État pour la gestion d'événement
  const [gestionEvenement, setGestionEvenement] = useState<{id: number; nom: string} | null>(null);

  // Utiliser le hook pour récupérer les vraies données de l'API
  const {
    dashboardStats,
    mesOeuvres,
    mesEvenements,
    mesArtisanats,
    mesServices,
    mesPatrimoines,
    loadingStats,
    loadingOeuvres,
    loadingEvenements,
    loadingArtisanats,
    loadingServices,
    loadingPatrimoines,
    error: errorStats,
    errorOeuvres,
    errorEvenements,
    errorArtisanats,
    errorServices,
    errorPatrimoines,
    deleteItem,
    cancelEvent,
    refreshAll
  } = useDashboardPro();

  const { t } = useTranslation();
  const { td, safe } = useTranslateData();
  const { formatDate } = useFormatDate();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const oeuvresTotal = dashboardStats?.oeuvres?.total ?? 0;
  const evenementsTotal = dashboardStats?.evenements?.total ?? 0;
  const servicesTotal = mesServices?.pagination?.total ?? 0;
  const artisanatsTotal = mesArtisanats?.pagination?.total ?? dashboardStats?.artisanats?.total ?? 0;
  const vuesTotal = dashboardStats?.oeuvres?.vues_total ?? 0;

  // Fonction de filtrage par recherche (utilise la valeur debouncée)
  const filterBySearch = useCallback((items: DashboardItem[]) => {
    if (!items || !debouncedSearch) return items;
    return items.filter((item) => {
      // Extraire les valeurs string des champs (y compris objets multilingues)
      const getValue = (field: MultiLangValue): string => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        if (typeof field === 'object' && !Array.isArray(field)) {
          // Objet multilingue - prendre la première valeur disponible
          return Object.values(field).find(v => typeof v === 'string') as string || '';
        }
        return '';
      };

      const searchFields = [
        getValue(item.titre),
        getValue(item.nom),
        getValue(item.nom_evenement),
        getValue(item.description),
        getValue(item.lieu),
        getValue(item.type),
        getValue(item.type_service)
      ].filter(Boolean).join(' ').toLowerCase();

      return searchFields.includes(debouncedSearch.toLowerCase());
    });
  }, [debouncedSearch]);

  // Composant pour afficher une ligne d'item avec bordure pointillée
  const ItemRow = ({ item, type, onView, onEdit, onDelete }: ItemRowProps) => {
    const getItemTitle = () => {
      switch (type) {
        case 'oeuvre':return td(item.titre);
        case 'evenement':return td(item.nom_evenement);
        case 'patrimoine':return td(item.nom);
        case 'service':return td(item.nom);
        default:return t('common.untitled', 'Sans titre');
      }
    };

    const getItemInfo = () => {
      switch (type) {
        case 'oeuvre':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{td(item.TypeOeuvre?.nom_type) || td(item.type_oeuvre?.nom_type) || t('common.uncategorized', 'Non catégorisé')}</span>
              {typeof item.vues === 'number' &&
              <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.vues}
                </span>
              }
              {typeof item.note_moyenne === 'number' &&
              <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {item.note_moyenne.toFixed(1)}
                </span>
              }
              <Badge variant={item.statut === 'publie' ? 'default' : 'secondary'}>
                {typeof item.statut === 'string' ? item.statut : 'brouillon'}
              </Badge>
            </div>);

        case 'evenement':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {item.date_debut &&
              <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.date_debut)}
                </span>
              }
              {item.Lieu &&
              <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {td(item.Lieu.nom)}
                </span>
              }
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {typeof item.nombre_participants === 'number' ? item.nombre_participants : 0} {t("dashboardpro.participants")}
              </span>
              {(() => { const b = getEventStatusBadge(item.statut, t); return <Badge variant={b.variant}>{b.label}</Badge>; })()}
            </div>);

        case 'patrimoine':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{td(item.type) || t('common.heritage', 'Patrimoine')}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {td(item.wilaya) || t('common.unspecified', 'Non spécifié')}
              </span>
              {typeof item.visites === 'number' &&
              <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.visites} {t("dashboardpro.visites")}
              </span>
              }
            </div>);

        case 'service':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{td(item.type_service) || td(item.type) || t('common.service', 'Service')}</span>
              {(typeof item.tarif_min === 'number' || typeof item.tarif_max === 'number') && (
                <span className="font-medium text-primary">
                  {item.tarif_min ?? '0'} - {item.tarif_max ?? '?'} {t("dashboardpro.da")}
                </span>
              )}
              {item.horaires && typeof item.horaires === 'object' && (
                <span>{td(item.horaires) || '-'}</span>
              )}
              {item.Lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {td(item.Lieu.nom) || td(item.lieu?.nom) || '-'}
                </span>
              )}
            </div>);

        default:
          return null;
      }
    };

    return (
      <div className="py-4 border-b border-dashed border-gray-200 last:border-0">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">{getItemTitle()}</h3>
            {getItemInfo()}
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(item)}>

              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}>

              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item)}
              className="text-destructive hover:text-destructive">

              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>);

  };

  // Handlers pour les actions
  const handleView = useCallback((type: string, item: DashboardItem) => {
    const routes: Record<string, string> = {
      oeuvre: `/oeuvres/${item.id_oeuvre}`,
      evenement: `/evenements/${item.id_evenement}`,
      patrimoine: `/patrimoine/${item.id_site || item.id}`,
      service: `/modifier-service/${item.id || item.id_service}`
    };
    navigate(routes[type] || '/');
  }, [navigate]);

  const handleEdit = useCallback((type: string, item: DashboardItem) => {
    const routes: Record<string, string> = {
      oeuvre: `/modifier-oeuvre/${item.id_oeuvre}`,
      evenement: `/modifier-evenement/${item.id_evenement}`,
      patrimoine: `/modifier-patrimoine/${item.id_site || item.id}`,
      service: `/modifier-service/${item.id || item.id_service}`
    };
    navigate(routes[type] || '/');
  }, [navigate]);

  const handleDeleteItem = useCallback((type: string, item: DashboardItem) => {
    setDeleteDialog({ open: true, type, item });
  }, []);

  const confirmDeleteItem = async () => {
    const { type, item } = deleteDialog;
    setDeleteDialog({ open: false, type: '', item: null });
    const ids: Record<string, number | undefined> = {
      oeuvre: item?.id_oeuvre,
      evenement: item?.id_evenement,
      patrimoine: item?.id_site || item?.id,
      service: item?.id || item?.id_service
    };
    await deleteItem(type, ids[type]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* En-tête simplifié */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{t("dashboardpro.dashboard_professionnel")}</h1>
              <p className="text-muted-foreground mt-1">{t("dashboardpro.grez_vos_crations")}</p>
            </div>

            <div className="flex gap-2">
              {/* Menu d'ajout rapide */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("dashboardpro.ajouter", "Ajouter")}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/ajouter-oeuvre')}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t("dashboardpro.nouvelle_uvre", "Nouvelle œuvre")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/ajouter-evenement')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t("dashboardpro.nouvel_vnement", "Nouvel événement")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/ajouter-patrimoine')}>
                    <MapPin className="h-4 w-4 mr-2" />
                    {t("dashboardpro.nouveau_patrimoine", "Nouveau patrimoine")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/ajouter-service')}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    {t("dashboardpro.nouveau_service", "Nouveau service")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/ajouter-artisanat')}>
                    <Hammer className="h-4 w-4 mr-2" />
                    {t("dashboardpro.nouvel_artisanat", "Nouvel artisanat")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={() => refreshAll?.()}
                disabled={loadingStats || loadingOeuvres || loadingEvenements}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats || loadingOeuvres || loadingEvenements ? 'animate-spin' : ''}`} />
                {t("dashboardpro.actualiser")}
              </Button>
            </div>
          </div>

          {/* Stats simplifiées */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {loadingStats ?
            <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </> :
            dashboardStats ?
            <>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.uvres_1")}</p>
                    <p className="text-xl font-bold">{oeuvresTotal}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.vnements_1")}</p>
                    <p className="text-xl font-bold">{evenementsTotal}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.services_1")}</p>
                    <p className="text-xl font-bold">{servicesTotal + artisanatsTotal}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.vues_totales")}</p>
                    <p className="text-xl font-bold">{vuesTotal}</p>
                  </CardContent>
                </Card>
              </> :
            null}
          </div>
        </div>

        {/* Zone principale avec onglets */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                  <TabsTrigger value="oeuvres" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <BookOpen className="h-4 w-4 mr-2" />{t("dashboardpro.uvres_1")}

                  </TabsTrigger>
                  <TabsTrigger value="evenements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Calendar className="h-4 w-4 mr-2" />{t("dashboardpro.vnements_1")}

                  </TabsTrigger>
                  <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Briefcase className="h-4 w-4 mr-2" />{t("dashboardpro.services_1")}
                  </TabsTrigger>
                  <TabsTrigger value="artisanat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Hammer className="h-4 w-4 mr-2" />{t("dashboardpro.artisanat", "Artisanat")}
                  </TabsTrigger>
                  <TabsTrigger value="patrimoine" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <MapPin className="h-4 w-4 mr-2" />{t("dashboardpro.patrimoine")}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Barre de recherche */}
              <div className="p-4 border-b bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("dashboardpro.placeholder_rechercher")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10" />

                </div>
              </div>

              {/* Contenu des onglets */}
              <TabsContent value="oeuvres" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_uvres")} ({filterBySearch(mesOeuvres?.items || []).length})</h2>
                  <Link to="/ajouter-oeuvre">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouvelle_uvre")}

                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingOeuvres ?
                  <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </> :
                  errorOeuvres ?
                  <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <p className="text-destructive mb-4">{t('dashboardpro.loadOeuvresFailed', 'Erreur lors du chargement des œuvres')}</p>
                      <Button onClick={refreshAll} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                      </Button>
                    </div> :
                  mesOeuvres?.items && mesOeuvres.items.length > 0 ?
                  filterBySearch(mesOeuvres.items as DashboardItem[]).map((oeuvre) =>
                  <ItemRow
                    key={oeuvre.id_oeuvre}
                    item={oeuvre}
                    type="oeuvre"
                    onView={() => handleView('oeuvre', oeuvre)}
                    onEdit={() => handleEdit('oeuvre', oeuvre)}
                    onDelete={() => handleDeleteItem('oeuvre', oeuvre)} />

                  ) :

                  <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucune_uvre_cre")}</p>
                      <Link to="/ajouter-oeuvre">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.crer_premire_uvre")}

                      </Button>
                      </Link>
                    </div>
                  }
                </div>
              </TabsContent>

              {/* Les autres onglets suivent le même pattern... */}
              <TabsContent value="evenements" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_vnements")} ({filterBySearch(mesEvenements?.items || []).length})</h2>
                  <Link to="/ajouter-evenement">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouvel_vnement")}

                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingEvenements ?
                  <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </> :
                  errorEvenements ?
                  <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <p className="text-destructive mb-4">{t('dashboardpro.loadEventsFailed', 'Erreur lors du chargement des événements')}</p>
                      <Button onClick={refreshAll} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                      </Button>
                    </div> :
                  mesEvenements?.items && mesEvenements.items.length > 0 ?
                  filterBySearch(mesEvenements.items as DashboardItem[]).map((evenement) =>
                  <div key={evenement.id_evenement} className="py-4 border-b border-dashed border-gray-200 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">{td(evenement.nom_evenement)}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {evenement.date_debut &&
                          <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(evenement.date_debut)}
                            </span>
                          }
                          {evenement.Lieu &&
                          <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {td(evenement.Lieu.nom) || td(evenement.Lieu.adresse) || t('common.unspecifiedLocation', 'Lieu non spécifié')}
                            </span>
                          }
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {typeof evenement.nombre_participants === 'number' ? evenement.nombre_participants : 0} {t("dashboardpro.participants")}
                          </span>
                          {(() => { const b = getEventStatusBadge(evenement.statut, t); return <Badge variant={b.variant}>{b.label}</Badge>; })()}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGestionEvenement({
                            id: evenement.id_evenement,
                            nom: td(evenement.nom_evenement)
                          })}
                          title={t("dashboardpro.manage_event", "Gérer programmes et œuvres")}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {t("dashboardpro.manage", "Gérer")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView('evenement', evenement)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {evenement.statut === 'brouillon' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit('evenement', evenement)}
                            title={t('common.edit', 'Modifier')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {evenement.statut !== 'brouillon' && evenement.statut !== 'annule' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelEvent(evenement.id_evenement)}
                            className="text-orange-500 hover:text-orange-600"
                            title={t('events.cancel', 'Annuler l\'événement')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {evenement.statut === 'brouillon' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem('evenement', evenement)}
                            className="text-destructive hover:text-destructive"
                            title={t('common.delete', 'Supprimer')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  ) :

                  <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucun_vnement")}</p>
                      <Link to="/ajouter-evenement">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.crer_mon_premier")}

                      </Button>
                      </Link>
                    </div>
                  }
                </div>
              </TabsContent>

              <TabsContent value="services" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_services")} ({filterBySearch(mesServices?.items || []).length})</h2>
                  <Link to="/ajouter-service">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouveau_service")}
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingServices ? (
                    <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </>
                  ) : errorServices ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <p className="text-destructive mb-4">{t('dashboardpro.loadServicesFailed', 'Erreur lors du chargement des services')}</p>
                      <Button onClick={refreshAll} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                      </Button>
                    </div>
                  ) : mesServices?.items && mesServices.items.length > 0 ? (
                    filterBySearch(mesServices.items as DashboardItem[]).map((item) => (
                      <ItemRow
                        key={item.id || item.id_service}
                        item={item}
                        type="service"
                        onView={() => handleView('service', item)}
                        onEdit={() => handleEdit('service', item)}
                        onDelete={() => handleDeleteItem('service', item)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucun_service")}</p>
                      <Link to="/ajouter-service">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.crer_mon_premier_1")}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="artisanat" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_artisanats", "Mes artisanats")} ({filterBySearch(mesArtisanats?.items || []).length})</h2>
                  <Link to="/ajouter-artisanat">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouvel_artisanat", "Nouvel artisanat")}
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingArtisanats ?
                  <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </> :
                  errorArtisanats ?
                  <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <p className="text-destructive mb-4">{t('dashboardpro.loadArtisanatsFailed', 'Erreur lors du chargement des artisanats')}</p>
                      <Button onClick={refreshAll} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                      </Button>
                    </div> :
                  mesArtisanats?.items && mesArtisanats.items.length > 0 ?
                  filterBySearch(mesArtisanats.items as DashboardItem[]).map((item) =>
                  <div key={item.id_artisanat || item.id} className="py-4 border-b border-dashed border-gray-200 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">{td(item.nom) || td(item.titre)}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{td(item.Materiau?.nom) || td(item.materiau) || t("dashboardpro.non_defini", "Non défini")}</span>
                          <span>{td(item.Technique?.nom) || td(item.technique) || ""}</span>
                          {typeof item.prix_min === 'number' && typeof item.prix_max === 'number' && (
                            <span className="font-medium text-primary">
                              {item.prix_min} - {item.prix_max} {t("dashboardpro.da", "DA")}
                            </span>
                          )}
                          <Badge variant={typeof item.en_stock === 'number' && item.en_stock > 0 ? 'default' : item.sur_commande ? 'secondary' : 'outline'}>
                            {typeof item.en_stock === 'number' && item.en_stock > 0 ? `${item.en_stock} ${t("dashboardpro.en_stock", "en stock")}` :
                             item.sur_commande ? t("dashboardpro.sur_commande", "Sur commande") :
                             t("dashboardpro.indisponible", "Indisponible")}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/artisanat/${item.id_artisanat || item.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/modifier-artisanat/${item.id_artisanat || item.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem('artisanat', item)}
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ) :

                  <div className="text-center py-12">
                      <Hammer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucun_artisanat", "Aucun artisanat créé")}</p>
                      <Link to="/ajouter-artisanat">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.creer_premier_artisanat", "Créer mon premier artisanat")}
                      </Button>
                      </Link>
                    </div>
                  }
                </div>
              </TabsContent>

              <TabsContent value="patrimoine" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mon_patrimoine")} ({filterBySearch(mesPatrimoines?.items || []).length})</h2>
                  <Link to="/ajouter-patrimoine">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouveau_site")}
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingPatrimoines ?
                  <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </> :
                  errorPatrimoines ?
                  <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <p className="text-destructive mb-4">{t('dashboardpro.loadPatrimoinesFailed', 'Erreur lors du chargement des sites patrimoine')}</p>
                      <Button onClick={refreshAll} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                      </Button>
                    </div> :
                  mesPatrimoines?.items && mesPatrimoines.items.length > 0 ?
                  filterBySearch(mesPatrimoines.items as DashboardItem[]).map((site) =>
                  <ItemRow
                    key={site.id_site || site.id}
                    item={site}
                    type="patrimoine"
                    onView={() => handleView('patrimoine', site)}
                    onEdit={() => handleEdit('patrimoine', site)}
                    onDelete={() => handleDeleteItem('patrimoine', site)} />

                  ) :

                  <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucun_site_patrimoine")}</p>
                      <Link to="/ajouter-patrimoine">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.ajouter_mon_premier")}

                      </Button>
                      </Link>
                    </div>
                  }
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Dialog de gestion d'événement (programmes, œuvres) */}
      <Dialog
        open={gestionEvenement !== null}
        onOpenChange={(open) => !open && setGestionEvenement(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {gestionEvenement && (
            <GestionEvenement
              evenementId={gestionEvenement.id}
              evenementNom={gestionEvenement.nom}
              onClose={() => setGestionEvenement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete', 'Confirmer la suppression')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.confirmDeleteDesc', 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Annuler')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete', 'Supprimer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default DashboardPro;