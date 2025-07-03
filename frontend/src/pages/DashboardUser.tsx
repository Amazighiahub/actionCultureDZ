import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  User,
  Heart,
  Settings,
  Calendar,
  Palette,
  MapPin,
  Clock,
  Info,
  Bell } from
'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';import { useTranslation } from "react-i18next";

const DashboardUser = () => {
  const { user } = useAuth();

  // Données simulées pour les favoris
  const { t } = useTranslation();const mesFavoris = {
    oeuvres: [
    {
      id: 1,
      titre: "L'art contemporain algérien",
      type: "Livre",
      auteur: "Mohamed Khadda",
      ajouteLe: "2024-01-15"
    },
    {
      id: 2,
      titre: "La Casbah d'Alger",
      type: "Documentaire",
      auteur: "Assia Djebar",
      ajouteLe: "2024-01-20"
    }],

    evenements: [
    {
      id: 1,
      nom: "Festival de Timgad",
      date: "2024-07-15",
      lieu: "Batna",
      ajouteLe: "2024-01-10"
    }],

    sites: [
    {
      id: 1,
      nom: "Tipasa",
      type: "Site archéologique",
      wilaya: "Tipaza",
      ajouteLe: "2024-01-05"
    }]

  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif">{t("dashboarduser.mon_espace_personnel")}

              </h1>
              <p className="text-lg text-muted-foreground mt-1">{t("dashboarduser.bienvenue")}
                {user?.prenom}{t("dashboarduser.grez_votre_profil")}
              </p>
            </div>
          </div>

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {mesFavoris.oeuvres.length + mesFavoris.evenements.length + mesFavoris.sites.length}
                </p>
                <p className="text-sm text-muted-foreground">{t("dashboarduser.total_favoris")}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <Palette className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{mesFavoris.oeuvres.length}</p>
                <p className="text-sm text-muted-foreground">{t("dashboarduser.uvres_favorites_1")}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{mesFavoris.evenements.length}</p>
                <p className="text-sm text-muted-foreground">{t("dashboarduser.vnements_suivis_1")}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-cultural-sand" />
              <div>
                <p className="text-2xl font-bold">{mesFavoris.sites.length}</p>
                <p className="text-sm text-muted-foreground">{t("dashboarduser.sites_favoris")}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contenu principal avec onglets */}
        <Tabs defaultValue="favoris" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="favoris" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>{t("dashboarduser.mes_favoris")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>{t("dashboarduser.notifications_1")}</span>
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>{t("dashboarduser.mon_profil")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Favoris */}
          <TabsContent value="favoris" className="space-y-6">
            {/* Œuvres favorites */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.uvres_favorites_1")}</h2>
              {mesFavoris.oeuvres.length > 0 ?
              <div className="grid gap-4">
                  {mesFavoris.oeuvres.map((oeuvre) =>
                <Card key={oeuvre.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{oeuvre.titre}</h3>
                          <p className="text-sm text-muted-foreground">
                            {oeuvre.type}{t("dashboarduser.par")}{oeuvre.auteur}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                        {new Date(oeuvre.ajouteLe).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/oeuvres/${oeuvre.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                )}
                </div> :

              <Card className="p-8 text-center">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucune_uvre_favorite")}</p>
                  <Link to="/oeuvres">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.explorer_les_uvres")}

                  </Button>
                  </Link>
                </Card>
              }
            </div>

            {/* Événements favoris */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.vnements_suivis_1")}</h2>
              {mesFavoris.evenements.length > 0 ?
              <div className="grid gap-4">
                  {mesFavoris.evenements.map((event) =>
                <Card key={event.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{event.nom}</h3>
                          <p className="text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(event.date).toLocaleDateString('fr-FR')} • {event.lieu}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                        {new Date(event.ajouteLe).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/evenements/${event.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                )}
                </div> :

              <Card className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucun_vnement_suivi")}</p>
                  <Link to="/evenements">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.dcouvrir_les_vnements")}

                  </Button>
                  </Link>
                </Card>
              }
            </div>

            {/* Sites favoris */}
            <div>
              <h2 className="text-2xl font-semibold font-serif mb-4">{t("dashboarduser.sites_patrimoniaux_favoris")}</h2>
              {mesFavoris.sites.length > 0 ?
              <div className="grid gap-4">
                  {mesFavoris.sites.map((site) =>
                <Card key={site.id} className="p-4 hover-lift">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{site.nom}</h3>
                          <p className="text-sm text-muted-foreground">
                            {site.type} • {site.wilaya}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                        {new Date(site.ajouteLe).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/patrimoine/${site.id}`}>
                            <Button variant="outline" size="sm">{t("dashboarduser.voir_2")}</Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                )}
                </div> :

              <Card className="p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("dashboarduser.aucun_site_favori")}</p>
                  <Link to="/patrimoine">
                    <Button variant="outline" className="mt-4">{t("dashboarduser.explorer_patrimoine")}

                  </Button>
                  </Link>
                </Card>
              }
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