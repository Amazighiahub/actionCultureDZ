/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Calendar, 
  Settings, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  Star,
  Users,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Activity,
  AlertCircle,
  Bell,
  MapPin
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardPro } from '@/hooks/useDashboardPro';

const DashboardPro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const {
    dashboardStats,
    calendarEvents,
    recommendations,
    mesOeuvres,
    mesEvenements,
    notifications,
    loading,
    loadingStats,
    loadingOeuvres,
    loadingEvenements,
    exportData,
    exportPending,
    refreshAll,
    engagementRate,
  } = useDashboardPro();

  // Fonction pour formater les nombres
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Fonction pour formater les dates
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Gérer l'export
  const handleExport = async (type: 'oeuvres' | 'evenements') => {
    if (exportData) {
      await exportData({
        type,
        format: 'excel',
        dateDebut: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        dateFin: new Date().toISOString().split('T')[0]
      });
    }
  };

  // Gérer la suppression d'une œuvre
  const handleDeleteOeuvre = (id: number) => {
    toast({
      title: "Suppression",
      description: "Fonctionnalité en cours de développement"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Dashboard Professionnel</h1>
            <p className="text-muted-foreground mt-1">Gérez vos œuvres et événements culturels</p>
          </div>
          
          <div className="flex items-center gap-3">
            {notifications?.pagination?.total ? (
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {notifications.pagination.total}
                </span>
              </Button>
            ) : null}
            
            <Button 
              variant="outline" 
              onClick={() => refreshAll?.()} 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <Link to="/ajouter-oeuvre">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle œuvre
              </Button>
            </Link>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {loadingStats ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : dashboardStats ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Œuvres publiées</p>
                      <p className="text-2xl font-bold">{dashboardStats.oeuvres.total}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNumber(dashboardStats.oeuvres.vues_total)} vues totales
                      </p>
                    </div>
                    <BookOpen className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                      <p className="text-2xl font-bold">{engagementRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Note moyenne: {dashboardStats.engagement.note_moyenne}/5
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-secondary opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Événements</p>
                      <p className="text-2xl font-bold">{dashboardStats.evenements.total}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.evenements.a_venir} à venir
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-accent opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Abonnés</p>
                      <p className="text-2xl font-bold">{dashboardStats.followers_count || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.engagement.evolution_mois || 0}% ce mois
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="oeuvres">Mes œuvres</TabsTrigger>
            <TabsTrigger value="evenements">Événements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recommandations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  {recommendations && recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <Alert key={index}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{rec.title}</strong>
                            <br />
                            {rec.description}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucune recommandation pour le moment
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Événements à venir */}
              <Card>
                <CardHeader>
                  <CardTitle>Prochains événements</CardTitle>
                </CardHeader>
                <CardContent>
                  {calendarEvents && calendarEvents.length > 0 ? (
                    <div className="space-y-3">
                      {calendarEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.start)}
                            </p>
                          </div>
                          <Badge variant="outline">{event.type}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun événement à venir
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top œuvres */}
            {dashboardStats?.oeuvres?.top_viewed && dashboardStats.oeuvres.top_viewed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Œuvres les plus vues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboardStats.oeuvres.top_viewed.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="font-medium">{item.titre}</span>
                        <span className="text-sm text-muted-foreground">{item.vues} vues</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Mes œuvres */}
          <TabsContent value="oeuvres" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Mes œuvres</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleExport('oeuvres')}
                  disabled={exportPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Link to="/ajouter-oeuvre">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle œuvre
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {loadingOeuvres ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : mesOeuvres?.items && mesOeuvres.items.length > 0 ? (
                mesOeuvres.items.map((oeuvre: any) => (
                  <Card key={oeuvre.id_oeuvre}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{oeuvre.titre}</h3>
                            <Badge variant={oeuvre.statut === 'publie' ? 'default' : 'secondary'}>
                              {oeuvre.statut}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              {oeuvre.TypeOeuvre?.nom_type || 'Non catégorisé'}
                            </span>
                            {oeuvre.vues !== undefined && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {oeuvre.vues} vues
                              </span>
                            )}
                            {oeuvre.note_moyenne !== undefined && (
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {oeuvre.note_moyenne.toFixed(1)}
                              </span>
                            )}
                            {oeuvre.prix !== undefined && (
                              <span className="font-medium text-primary">
                                {oeuvre.prix} DA
                              </span>
                            )}
                          </div>

                          {/* Barre de progression */}
                          {oeuvre.vues !== undefined && dashboardStats?.oeuvres?.vues_total && dashboardStats.oeuvres.vues_total > 0 && (
                            <div className="space-y-1 mt-3">
                              <div className="flex justify-between text-xs">
                                <span>Performance</span>
                                <span>
                                  {((oeuvre.vues / dashboardStats.oeuvres.vues_total) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={(oeuvre.vues / dashboardStats.oeuvres.vues_total) * 100} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/modifier-oeuvre/${oeuvre.id_oeuvre}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteOeuvre(oeuvre.id_oeuvre)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Aucune œuvre publiée</p>
                    <p className="text-muted-foreground mb-4">
                      Commencez à partager vos créations
                    </p>
                    <Link to="/ajouter-oeuvre">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer ma première œuvre
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Événements */}
          <TabsContent value="evenements" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Mes événements</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleExport('evenements')}
                  disabled={exportPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Link to="/ajouter-evenement">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel événement
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {loadingEvenements ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : mesEvenements?.items && mesEvenements.items.length > 0 ? (
                mesEvenements.items.map((evenement: any) => (
                  <Card key={evenement.id_evenement}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{evenement.nom_evenement}</h3>
                            <Badge variant={
                              evenement.statut === 'a_venir' ? 'default' : 
                              evenement.statut === 'en_cours' ? 'secondary' : 
                              'outline'
                            }>
                              {evenement.statut}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {evenement.date_debut && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(evenement.date_debut)}
                              </span>
                            )}
                            {evenement.Lieu && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {evenement.Lieu.nom}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {evenement.nombre_participants || 0}
                              {evenement.capacite_max && `/${evenement.capacite_max}`} participants
                            </span>
                          </div>

                          {/* Taux de remplissage */}
                          {evenement.capacite_max && (
                            <div className="space-y-1 mt-3">
                              <div className="flex justify-between text-xs">
                                <span>Taux de remplissage</span>
                                <span>
                                  {((evenement.nombre_participants || 0) / evenement.capacite_max * 100).toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={(evenement.nombre_participants || 0) / evenement.capacite_max * 100} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/evenements/${evenement.id_evenement}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/modifier-evenement/${evenement.id_evenement}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toast({
                              title: "Suppression",
                              description: "Fonctionnalité en développement"
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Aucun événement</p>
                    <p className="text-muted-foreground mb-4">
                      Créez votre premier événement culturel
                    </p>
                    <Link to="/ajouter-evenement">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un événement
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques détaillées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>Les graphiques détaillés arrivent bientôt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPro;