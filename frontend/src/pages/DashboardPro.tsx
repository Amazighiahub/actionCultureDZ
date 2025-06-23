/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardPro } from '@/hooks/useDashboardPro';

const DashboardPro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('oeuvres');
  const [searchQuery, setSearchQuery] = useState('');

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
    refreshAll,
  } = useDashboardPro();

  // Log pour déboguer
  console.log('Dashboard - Mes œuvres:', mesOeuvres);

  // Fonction de filtrage par recherche
  const filterBySearch = (items: any[]) => {
    if (!items || !searchQuery) return items;
    return items.filter(item => {
      const searchFields = [
        item.titre,
        item.nom,
        item.nom_evenement,
        item.description,
        item.lieu,
        item.type
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchFields.includes(searchQuery.toLowerCase());
    });
  };

  // Composant pour afficher une ligne d'item avec bordure pointillée
  const ItemRow = ({ item, type, onView, onEdit, onDelete }: any) => {
    const getItemTitle = () => {
      switch(type) {
        case 'oeuvre': return item.titre;
        case 'evenement': return item.nom_evenement;
        case 'patrimoine': return item.nom;
        case 'service': return item.nom;
        default: return 'Sans titre';
      }
    };

    const getItemInfo = () => {
      switch(type) {
        case 'oeuvre': 
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{item.TypeOeuvre?.nom_type || item.type_oeuvre?.nom_type || 'Non catégorisé'}</span>
              {item.vues !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.vues}
                </span>
              )}
              {item.note_moyenne !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {item.note_moyenne.toFixed(1)}
                </span>
              )}
              <Badge variant={item.statut === 'publie' ? 'default' : 'secondary'}>
                {item.statut || 'brouillon'}
              </Badge>
            </div>
          );
        case 'evenement':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {item.date_debut && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.date_debut).toLocaleDateString('fr-FR')}
                </span>
              )}
              {item.Lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.Lieu.nom}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {item.nombre_participants || 0} participants
              </span>
              <Badge variant={
                item.statut === 'a_venir' ? 'default' : 
                item.statut === 'en_cours' ? 'secondary' : 
                'outline'
              }>
                {item.statut}
              </Badge>
            </div>
          );
        case 'patrimoine':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{item.type}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.wilaya}
              </span>
              {item.visites !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.visites} visites
                </span>
              )}
            </div>
          );
        case 'service':
          return (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{item.type}</span>
              {item.prix && (
                <span className="font-medium text-primary">
                  {item.prix} DA
                </span>
              )}
              {item.duree && (
                <span>{item.duree}</span>
              )}
            </div>
          );
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
              onClick={() => onView(item)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(item)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
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
              <h1 className="text-2xl font-bold">Dashboard Professionnel</h1>
              <p className="text-muted-foreground mt-1">Gérez vos créations culturelles</p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => refreshAll?.()} 
              disabled={loadingStats || loadingOeuvres || loadingEvenements}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loadingStats || loadingOeuvres || loadingEvenements) ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Stats simplifiées */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {loadingStats ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : dashboardStats ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Œuvres</p>
                    <p className="text-xl font-bold">{dashboardStats.oeuvres.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Événements</p>
                    <p className="text-xl font-bold">{dashboardStats.evenements.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Services</p>
                    <p className="text-xl font-bold">{dashboardStats.artisanats.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Vues totales</p>
                    <p className="text-xl font-bold">{dashboardStats.oeuvres.vues_total}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>

        {/* Zone principale avec onglets */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                  <TabsTrigger value="oeuvres" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Œuvres
                  </TabsTrigger>
                  <TabsTrigger value="evenements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Calendar className="h-4 w-4 mr-2" />
                    Événements
                  </TabsTrigger>
                  <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Services
                  </TabsTrigger>
                  <TabsTrigger value="patrimoine" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <MapPin className="h-4 w-4 mr-2" />
                    Patrimoine
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Barre de recherche */}
              <div className="p-4 border-b bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Contenu des onglets */}
              <TabsContent value="oeuvres" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">
                    Mes œuvres ({filterBySearch(mesOeuvres?.items || []).length})
                  </h2>
                  <Link to="/ajouter-oeuvre">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle œuvre
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingOeuvres ? (
                    <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </>
                  ) : mesOeuvres?.items && mesOeuvres.items.length > 0 ? (
                    filterBySearch(mesOeuvres.items).map((oeuvre: any) => (
                      <ItemRow
                        key={oeuvre.id_oeuvre}
                        item={oeuvre}
                        type="oeuvre"
                        onView={() => handleView('oeuvre', oeuvre)}
                        onEdit={() => handleEdit('oeuvre', oeuvre)}
                        onDelete={() => handleDeleteItem('oeuvre', oeuvre)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucune œuvre créée</p>
                      <Link to="/ajouter-oeuvre">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer ma première œuvre
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Les autres onglets suivent le même pattern... */}
              <TabsContent value="evenements" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">
                    Mes événements ({filterBySearch(mesEvenements?.items || []).length})
                  </h2>
                  <Link to="/ajouter-evenement">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel événement
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingEvenements ? (
                    <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </>
                  ) : mesEvenements?.items && mesEvenements.items.length > 0 ? (
                    filterBySearch(mesEvenements.items).map((evenement: any) => (
                      <ItemRow
                        key={evenement.id_evenement}
                        item={evenement}
                        type="evenement"
                        onView={() => handleView('evenement', evenement)}
                        onEdit={() => handleEdit('evenement', evenement)}
                        onDelete={() => handleDeleteItem('evenement', evenement)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun événement créé</p>
                      <Link to="/ajouter-evenement">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer mon premier événement
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="services" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">
                    Mes services ({filterBySearch(mesArtisanats?.items || []).length})
                  </h2>
                  <Link to="/ajouter-service">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau service
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingArtisanats ? (
                    <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </>
                  ) : mesArtisanats?.items && mesArtisanats.items.length > 0 ? (
                    filterBySearch(mesArtisanats.items).map((item: any) => (
                      <ItemRow
                        key={item.id_artisanat || item.id}
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
                      <p className="text-muted-foreground">Aucun service créé</p>
                      <Link to="/ajouter-service">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer mon premier service
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="patrimoine" className="p-6 m-0">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">
                    Mon patrimoine ({filterBySearch(mesPatrimoines?.items || []).length})
                  </h2>
                  <Link to="/ajouter-patrimoine">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau site
                    </Button>
                  </Link>
                </div>

                <div>
                  {loadingPatrimoines ? (
                    <>
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16 mb-4" />
                      <Skeleton className="h-16" />
                    </>
                  ) : mesPatrimoines?.items && mesPatrimoines.items.length > 0 ? (
                    filterBySearch(mesPatrimoines.items).map((site: any) => (
                      <ItemRow
                        key={site.id_site || site.id}
                        item={site}
                        type="patrimoine"
                        onView={() => handleView('patrimoine', site)}
                        onEdit={() => handleEdit('patrimoine', site)}
                        onDelete={() => handleDeleteItem('patrimoine', site)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun site patrimoine enregistré</p>
                      <Link to="/ajouter-patrimoine">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter mon premier site
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPro;