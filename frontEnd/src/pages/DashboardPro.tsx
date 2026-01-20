/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Input } from '@/components/UI/input';
import { Skeleton } from '@/components/UI/skeleton';
import {
  Dialog,
  DialogContent,
} from '@/components/UI/dialog';
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
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';
import { useToast } from '@/components/UI/use-toast';
import { useDashboardPro } from '@/hooks/useDashboardPro';
import { useTranslation } from "react-i18next";
import { useTranslateData } from '@/hooks/useTranslateData';
import GestionEvenement from '@/components/event/GestionEvenement';

const DashboardPro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('oeuvres');
  const [searchQuery, setSearchQuery] = useState('');

  // État pour la gestion d'événement
  const [gestionEvenement, setGestionEvenement] = useState<{id: number; nom: string} | null>(null);

  // Utiliser le hook pour récupérer les vraies données de l'API
  const {
    dashboardStats,
    mesOeuvres,
    mesEvenements,
    mesArtisanats,
    mesPatrimoines,
    loadingStats,
    loadingOeuvres,
    loadingEvenements,
    loadingArtisanats,
    loadingPatrimoines,
    deleteItem,
    refreshAll
  } = useDashboardPro();

  // Log pour déboguer
  const { t } = useTranslation();
  const { td, safe } = useTranslateData();
  console.log('Dashboard - Mes œuvres:', mesOeuvres);

  // Fonction de filtrage par recherche
  const filterBySearch = (items: any[]) => {
    if (!items || !searchQuery) return items;
    return items.filter((item) => {
      // Extraire les valeurs string des champs (y compris objets multilingues)
      const getValue = (field: any): string => {
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
        getValue(item.type)
      ].filter(Boolean).join(' ').toLowerCase();

      return searchFields.includes(searchQuery.toLowerCase());
    });
  };

  // Composant pour afficher une ligne d'item avec bordure pointillée
  const ItemRow = ({ item, type, onView, onEdit, onDelete }: any) => {
    const getItemTitle = () => {
      switch (type) {
        case 'oeuvre':return td(item.titre);
        case 'evenement':return td(item.nom_evenement);
        case 'patrimoine':return td(item.nom);
        case 'service':return td(item.nom);
        default:return 'Sans titre';
      }
    };

    const getItemInfo = () => {
      switch (type) {
        case 'oeuvre':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{td(item.TypeOeuvre?.nom_type) || td(item.type_oeuvre?.nom_type) || 'Non catégorisé'}</span>
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
                  {new Date(item.date_debut).toLocaleDateString('fr-FR')}
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
              <Badge variant={
              item.statut === 'a_venir' || item.statut === 'planifie' ? 'default' :
              item.statut === 'en_cours' ? 'secondary' :
              'outline'
              }>
                {typeof item.statut === 'string' ? item.statut : 'planifie'}
              </Badge>
            </div>);

        case 'patrimoine':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{td(item.type) || 'Patrimoine'}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {td(item.wilaya) || 'Non spécifié'}
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
              <span>{td(item.type) || 'Service'}</span>
              {typeof item.prix === 'number' &&
              <span className="font-medium text-primary">
                  {item.prix} {t("dashboardpro.da")}
              </span>
              }
              {item.duree && typeof item.duree === 'string' &&
              <span>{item.duree}</span>
              }
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
  const handleView = (type: string, item: any) => {
    const routes: any = {
      oeuvre: `/oeuvres/${item.id_oeuvre}`,
      evenement: `/evenements/${item.id_evenement}`,
      patrimoine: `/patrimoine/${item.id_site || item.id}`,
      service: `/services/${item.id_service || item.id_artisanat}`
    };
    navigate(routes[type] || '/');
  };

  const handleEdit = (type: string, item: any) => {
    const routes: any = {
      oeuvre: `/modifier-oeuvre/${item.id_oeuvre}`,
      evenement: `/modifier-evenement/${item.id_evenement}`,
      patrimoine: `/modifier-patrimoine/${item.id_site || item.id}`,
      service: `/modifier-service/${item.id_service || item.id_artisanat}`
    };
    navigate(routes[type] || '/');
  };

  const handleDeleteItem = async (type: string, item: any) => {
    const ids: any = {
      oeuvre: item.id_oeuvre,
      evenement: item.id_evenement,
      patrimoine: item.id_site || item.id,
      service: item.id_service || item.id_artisanat
    };

    if (confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
      await deleteItem(type, ids[type]);
    }
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
                    <p className="text-xl font-bold">{dashboardStats.oeuvres.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.vnements_1")}</p>
                    <p className="text-xl font-bold">{dashboardStats.evenements.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.services_1")}</p>
                    <p className="text-xl font-bold">{dashboardStats.artisanats.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("dashboardpro.vues_totales")}</p>
                    <p className="text-xl font-bold">{dashboardStats.oeuvres.vues_total}</p>
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
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_uvres")}
                    {filterBySearch(mesOeuvres?.items || []).length})
                  </h2>
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
                  mesOeuvres?.items && mesOeuvres.items.length > 0 ?
                  filterBySearch(mesOeuvres.items).map((oeuvre: any) =>
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
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_vnements")}
                    {filterBySearch(mesEvenements?.items || []).length})
                  </h2>
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
                  mesEvenements?.items && mesEvenements.items.length > 0 ?
                  filterBySearch(mesEvenements.items).map((evenement: any) =>
                  <div key={evenement.id_evenement} className="py-4 border-b border-dashed border-gray-200 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">{td(evenement.nom_evenement)}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {evenement.date_debut &&
                          <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(evenement.date_debut).toLocaleDateString('fr-FR')}
                            </span>
                          }
                          {evenement.Lieu &&
                          <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {td(evenement.Lieu.nom) || td(evenement.Lieu.adresse) || 'Lieu non spécifié'}
                            </span>
                          }
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {typeof evenement.nombre_participants === 'number' ? evenement.nombre_participants : 0} {t("dashboardpro.participants")}
                          </span>
                          <Badge variant={
                          evenement.statut === 'a_venir' || evenement.statut === 'planifie' ? 'default' :
                          evenement.statut === 'en_cours' ? 'secondary' :
                          'outline'
                          }>
                            {typeof evenement.statut === 'string' ? evenement.statut : 'planifie'}
                          </Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit('evenement', evenement)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem('evenement', evenement)}
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_services")}
                    {filterBySearch(mesArtisanats?.items || []).length})
                  </h2>
                  <Link to="/ajouter-service">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.nouveau_service")}

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
                  mesArtisanats?.items && mesArtisanats.items.length > 0 ?
                  filterBySearch(mesArtisanats.items).map((item: any) =>
                  <ItemRow
                    key={item.id_artisanat || item.id}
                    item={item}
                    type="service"
                    onView={() => handleView('service', item)}
                    onEdit={() => handleEdit('service', item)}
                    onDelete={() => handleDeleteItem('service', item)} />

                  ) :

                  <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t("dashboardpro.aucun_service")}</p>
                      <Link to="/ajouter-service">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />{t("dashboardpro.crer_mon_premier_1")}

                      </Button>
                      </Link>
                    </div>
                  }
                </div>
              </TabsContent>

              <TabsContent value="artisanat" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mes_artisanats", "Mes artisanats")} (
                    {filterBySearch(mesArtisanats?.items || []).length})
                  </h2>
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
                  mesArtisanats?.items && mesArtisanats.items.length > 0 ?
                  filterBySearch(mesArtisanats.items).map((item: any) =>
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
                  <h2 className="text-lg font-semibold">{t("dashboardpro.mon_patrimoine")} (
                    {filterBySearch(mesPatrimoines?.items || []).length})
                  </h2>
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
                  mesPatrimoines?.items && mesPatrimoines.items.length > 0 ?
                  filterBySearch(mesPatrimoines.items).map((site: any) =>
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
    </div>);

};

export default DashboardPro;