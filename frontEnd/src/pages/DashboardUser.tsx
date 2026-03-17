import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToast } from '@/components/ui/use-toast';
import { useFavoris } from '@/hooks/useFavoris';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/services/notification.service';
import type { GroupedFavoris } from '@/services/favori.service';

const DashboardUser = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Notifications via React Query
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loadingNotifs, error: errorNotifs, refetch: refetchNotifs } = useQuery<Notification[]>({
    queryKey: ['notifications', 'user', 'list'],
    queryFn: async () => {
      const result = await notificationService.getNotifications({ page: 1, limit: 10 });
      return result.notifications || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Notification[]>(['notifications', 'user', 'list'], (prev) =>
        prev?.map(n => n.id_notification === id ? { ...n, lu: true } : n) ?? []
      );
    },
    onError: () => {
      toast({ title: t('common.error', 'Erreur'), description: t('dashboarduser.markReadFailed', 'Impossible de marquer la notification comme lue.'), variant: 'destructive' });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(['notifications', 'user', 'list'], (prev) =>
        prev?.map(n => ({ ...n, lu: true })) ?? []
      );
    },
    onError: () => {
      toast({ title: t('common.error', 'Erreur'), description: t('dashboarduser.markAllReadFailed', 'Impossible de marquer toutes les notifications comme lues.'), variant: 'destructive' });
    },
  });

  const handleMarkAsRead = useCallback((id: number) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  // Utiliser le hook useFavoris pour récupérer les vraies données
  const {
    favoris,
    stats,
    loading,
    error: errorFavoris,
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
  const [removeFavDialog, setRemoveFavDialog] = useState<{ open: boolean; favoriId: number | null }>({ open: false, favoriId: null });

  const handleRemoveFavorite = useCallback((favoriId: number) => {
    setRemoveFavDialog({ open: true, favoriId });
  }, []);

  const confirmRemoveFavorite = useCallback(() => {
    if (removeFavDialog.favoriId) {
      removeFavorite(removeFavDialog.favoriId);
    }
    setRemoveFavDialog({ open: false, favoriId: null });
  }, [removeFavDialog.favoriId, removeFavorite]);

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
              ) : errorFavoris ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                  <p className="text-destructive mb-4">{t('dashboarduser.loadFavorisFailed', 'Erreur lors du chargement des favoris')}</p>
                  <Button onClick={refresh} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                  </Button>
                </Card>
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
                            {oeuvre.ajouteLe ? formatDate(oeuvre.ajouteLe) : '-'}
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
                            {event.date ? formatDate(event.date) : '-'} • {event.lieu}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />{t("dashboarduser.ajout_2")}
                            {event.ajouteLe ? formatDate(event.ajouteLe) : '-'}
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
                            {site.ajouteLe ? formatDate(site.ajouteLe) : '-'}
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold font-serif">{t("dashboarduser.notifications_1")}</h2>
                {notifications.some(n => !n.lu) && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('dashboarduser.markAllRead', 'Tout marquer comme lu')}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {loadingNotifs ? (
                  <>
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </>
                ) : errorNotifs ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <p className="text-destructive mb-4">{t('dashboarduser.loadNotifsFailed', 'Erreur lors du chargement des notifications')}</p>
                    <Button onClick={() => refetchNotifs()} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />{t('common.retry', 'Réessayer')}
                    </Button>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <Alert key={notif.id_notification} className={notif.lu ? 'opacity-60' : 'border-primary/30 bg-primary/5'}>
                      <Bell className="h-4 w-4" />
                      <AlertTitle className="flex justify-between items-center">
                        <span>{notif.titre}</span>
                        {!notif.lu && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notif.id_notification)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </AlertTitle>
                      <AlertDescription>
                        <p>{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {notif.date_creation ? formatDate(notif.date_creation, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t("dashboarduser.aucune_autre_notification", 'Aucune notification')}</p>
                  </div>
                )}
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
                      autoComplete="given-name"
                      value={user?.prenom || ''}
                      readOnly />

                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.nom")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      autoComplete="family-name"
                      value={user?.nom || ''}
                      readOnly />

                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("dashboarduser.email")}</label>
                    <input
                      className="w-full p-3 border rounded-lg"
                      autoComplete="email"
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
                      value={user?.date_creation ? formatDate(user.date_creation) : ''}
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
                <Button className="btn-hover" onClick={() => navigate('/dashboard-user')}>
                  {t("dashboarduser.modifier_profil")}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog de confirmation retrait favori */}
      <AlertDialog open={removeFavDialog.open} onOpenChange={(open) => setRemoveFavDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboarduser.confirm_remove_title', 'Retirer des favoris')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboarduser.confirm_remove_favorite', 'Voulez-vous retirer cet élément de vos favoris ?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Annuler')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveFavorite} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.remove', 'Retirer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>);

};

export default DashboardUser;