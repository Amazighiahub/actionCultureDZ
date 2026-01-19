import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/UI/alert';
import { Skeleton } from '@/components/UI/skeleton';
import {
  User,
  Heart,
  Settings,
  Calendar,
  Palette,
  MapPin,
  Clock,
  Info,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";
import { useFavoris } from '@/hooks/useFavoris';
import type { GroupedFavoris } from '@/services/favori.service';

const DashboardUser = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Utiliser le hook useFavoris pour récupérer les vraies données
  const {
    favoris,
    stats,
    loading,
    refresh,
    removeFavorite
  } = useFavoris({ grouped: true, autoFetch: true });

  // Typer les favoris groupés
  const groupedFavoris = favoris as GroupedFavoris | null;

  // Extraire les données des favoris
  const mesFavoris = {
    oeuvres: groupedFavoris?.oeuvres?.map(fav => ({
      id: fav.id_entite,
      favoriId: fav.id_favori,
      titre: fav.entite?.titre || 'Sans titre',
      type: fav.entite?.TypeOeuvre?.nom_type || 'Œuvre',
      auteur: fav.entite?.Users?.[0]?.nom || fav.entite?.auteur || 'Auteur inconnu',
      ajouteLe: fav.date_ajout || fav.date_creation
    })) || [],
    evenements: groupedFavoris?.evenements?.map(fav => ({
      id: fav.id_entite,
      favoriId: fav.id_favori,
      nom: fav.entite?.nom_evenement || fav.entite?.titre || 'Sans titre',
      date: fav.entite?.date_debut,
      lieu: fav.entite?.Lieu?.nom || fav.entite?.lieu || '',
      ajouteLe: fav.date_ajout || fav.date_creation
    })) || [],
    sites: groupedFavoris?.lieux?.map(fav => ({
      id: fav.id_entite,
      favoriId: fav.id_favori,
      nom: fav.entite?.nom || 'Sans nom',
      type: fav.entite?.type_lieu || 'Site',
      wilaya: fav.entite?.Commune?.Daira?.Wilaya?.nom || fav.entite?.wilaya || '',
      ajouteLe: fav.date_ajout || fav.date_creation
    })) || []
  };

  // Handler pour retirer un favori
  const handleRemoveFavorite = async (favoriId: number) => {
    if (confirm(t('dashboarduser.confirm_remove_favorite', 'Voulez-vous retirer cet élément de vos favoris ?'))) {
      removeFavorite(favoriId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif">{t("dashboarduser.mon_espace_personnel")}

              </h1>
              <p className="text-lg text-muted-foreground mt-1">{t("dashboarduser.bienvenue")}
                {user?.prenom}{t("dashboarduser.grez_votre_profil")}
              </p>
            </div>
          </div>

          {/* Bouton actualiser */}
          <Button
            variant="outline"
            onClick={() => refresh()}
            disabled={loading}
            className="mb-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t("dashboarduser.actualiser", "Actualiser")}
          </Button>

          {/* Message d'information pour les visiteurs */}
          <Alert className="border-blue-200 bg-blue-50/50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">{t("dashboarduser.compte_visiteur")}</AlertTitle>
            <AlertDescription className="text-blue-700">{t("dashboarduser.tant_que_visiteur")}


              <Link to="/auth" className="text-blue-800 underline ml-1 font-medium">{t("dashboarduser.inscrivezvous_comme_professionnel")}

              </Link>.
            </AlertDescription>
          </Alert>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (
            <>
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">
                      {stats?.total || (mesFavoris.oeuvres.length + mesFavoris.evenements.length + mesFavoris.sites.length)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("dashboarduser.total_favoris")}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <Palette className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.byType?.oeuvre || mesFavoris.oeuvres.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("dashboarduser.uvres_favorites_1")}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.byType?.evenement || mesFavoris.evenements.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("dashboarduser.vnements_suivis_1")}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-cultural-sand" />
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.byType?.lieu || mesFavoris.sites.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("dashboarduser.sites_favoris")}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Contenu principal avec onglets */}
        <Tabs defaultValue="favoris" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:grid sm:grid-cols-3">
            <TabsTrigger value="favoris" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>{t("dashboarduser.mes_favoris")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>{t("dashboarduser.notifications_1")}</span>
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>{t("dashboarduser.mon_profil")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Favoris */}
          <TabsContent value="favoris" className="space-y-6">
            {/* Œuvres favorites */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.uvres_favorites_1")}</h2>
              {loading ? (
                <div className="grid gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : mesFavoris.oeuvres.length > 0 ? (
                <div className="grid gap-4">
                  {mesFavoris.oeuvres.map((oeuvre) => (
                    <Card key={oeuvre.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{oeuvre.titre}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {oeuvre.type} {t("dashboarduser.par")} {oeuvre.auteur}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                            {oeuvre.ajouteLe ? new Date(oeuvre.ajouteLe).toLocaleDateString('fr-FR') : '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/oeuvres/${oeuvre.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveFavorite(oeuvre.favoriId)}
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucune_uvre_favorite")}</p>
                  <Link to="/oeuvres">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.explorer_les_uvres")}</Button>
                  </Link>
                </Card>
              )}
            </div>

            {/* Événements favoris */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.vnements_suivis_1")}</h2>
              {loading ? (
                <div className="grid gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : mesFavoris.evenements.length > 0 ? (
                <div className="grid gap-4">
                  {mesFavoris.evenements.map((event) => (
                    <Card key={event.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{event.nom}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : '-'} • {event.lieu}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                            {event.ajouteLe ? new Date(event.ajouteLe).toLocaleDateString('fr-FR') : '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/evenements/${event.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveFavorite(event.favoriId)}
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucun_vnement_suivi")}</p>
                  <Link to="/evenements">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.dcouvrir_les_vnements")}</Button>
                  </Link>
                </Card>
              )}
            </div>

            {/* Sites favoris */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.sites_patrimoniaux_favoris")}</h2>
              {loading ? (
                <div className="grid gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : mesFavoris.sites.length > 0 ? (
                <div className="grid gap-4">
                  {mesFavoris.sites.map((site) => (
                    <Card key={site.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{site.nom}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {site.type} • {site.wilaya}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                            {site.ajouteLe ? new Date(site.ajouteLe).toLocaleDateString('fr-FR') : '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/patrimoine/${site.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveFavorite(site.favoriId)}
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucun_site_favori")}</p>
                  <Link to="/patrimoine">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.explorer_patrimoine")}</Button>
                  </Link>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Onglet Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 font-serif">{t("dashboarduser.notifications_1")}</h2>
              <div className="space-y-4">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertTitle>{t("dashboarduser.nouvel_vnement_dans")}</AlertTitle>
                  <AlertDescription>{t("dashboarduser.festival_musique_andalouse")}

                  </AlertDescription>
                </Alert>
                
                <p className="text-center text-muted-foreground mt-8">{t("dashboarduser.aucune_autre_notification")}

                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Profil */}
          <TabsContent value="profil" className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 font-serif">{t("dashboarduser.informations_personnelles")}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.prnom")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      value={user?.prenom || ''}
                      readOnly />

                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.nom")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      value={user?.nom || ''}
                      readOnly />

                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.email")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      value={user?.email || ''}
                      readOnly />

                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.type_compte")}</label>
                    <div className="p-3 border rounded-lg bg-muted">
                      <Badge variant="secondary">{t("dashboarduser.visiteur")}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.membre_depuis")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      value={user?.date_creation ? new Date(user.date_creation).toLocaleDateString('fr-FR') : ''}
                      readOnly />

                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-8 pt-8 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("dashboarduser.vous_souhaitez_crer")}

                  </p>
                  <Link to="/auth">
                    <Button variant="outline">{t("dashboarduser.devenir_professionnel")}

                    </Button>
                  </Link>
                </div>
                <Button className="btn-hover">{t("dashboarduser.modifier_profil")}

                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>);

};

export default DashboardUser;