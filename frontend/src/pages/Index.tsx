/**
 * Page d'accueil avec intégration complète des API
 * 
 * GESTION DES TYPES :
 * 1. Les types sont importés depuis '@/types' (votre structure types/)
 * 2. Les réponses paginées utilisent PaginatedResponse<T> de '@/config/api'
 * 3. Pour les erreurs TypeScript sur response.data.data :
 *    - response.data est de type PaginatedResponse<T>
 *    - Utilisez: const paginatedData = response.data as PaginatedResponse<VotreType>
 *    - Puis accédez à: paginatedData.data pour obtenir le tableau
 * 
 * STRUCTURE DES RÉPONSES API :
 * - ApiResponse<T> = { success: boolean; data?: T; error?: string }
 * - PaginatedResponse<T> = { data: T[]; total: number; page: number; limit: number }
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import CartePatrimoine from '@/components/CartePatrimoine';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, Users, Calendar, Palette, Map, Info, Bell, Hammer,
  MapPin, Clock, Star, Eye, Download, AlertCircle, RefreshCw
} from 'lucide-react';

// Import des services
import { dashboardService } from '@/services/dashboard.service';
import { evenementService } from '@/services/evenement.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { patrimoineService } from '@/services/patrimoine.service';
import { artisanatService } from '@/services/artisanat.service';
import { notificationService } from '@/services/notification.service';
import { authService } from '@/services/auth.service';
import { metadataService } from '@/services/metadata.service';

// Import des types depuis votre structure
import {
  Evenement,
  Oeuvre,
  // Pour patrimoine et artisanat, utilisez les types depuis leurs services
  Wilaya
} from '@/types';

// Import des types spécifiques aux services
import type { SitePatrimoine } from '@/services/patrimoine.service';
import type { Artisanat } from '@/services/artisanat.service';
import type { OverviewStats } from '@/services/dashboard.service';
import type { Notification } from '@/services/notification.service';

// Import du type de réponse paginée depuis l'API config
import { PaginatedResponse } from '@/config/api';

// État global pour les wilayas
let wilayasCache: Wilaya[] = [];

// Helper pour obtenir le nom de la wilaya
const getWilayaName = (wilayaId: number): string => {
  const wilaya = wilayasCache.find(w => w.id_wilaya === wilayaId);
  return wilaya ? wilaya.nom : `Wilaya ${wilayaId}`;
};

// Helper pour extraire les données d'une réponse (paginée ou directe)
function extractDataFromResponse<T>(responseData: any): T[] {
  if (!responseData) return [];
  
  // Si c'est une réponse paginée avec une propriété 'data'
  if (typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
    return responseData.data;
  }
  
  // Si c'est directement un tableau
  if (Array.isArray(responseData)) {
    return responseData;
  }
  
  // Si c'est un objet avec une propriété 'items' (autre format possible)
  if (typeof responseData === 'object' && 'items' in responseData && Array.isArray(responseData.items)) {
    return responseData.items;
  }
  
  // Cas par défaut - log pour debug
  console.warn('extractDataFromResponse: format non reconnu:', responseData);
  return [];
}

// Composant StatCard
interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  trend?: string | null;
  loading?: boolean;
}

const StatCard = ({ icon: Icon, title, value, trend, loading = false }: StatCardProps) => (
  <Card className="hover-lift">
    <CardContent className="p-6">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {trend && (
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                {trend}
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

// Composant ErrorMessage
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Card className="border-destructive/20 bg-destructive/5">
    <CardContent className="p-6">
      <div className="flex items-center space-x-2 text-destructive mb-2">
        <AlertCircle className="h-5 w-5" />
        <p className="font-semibold">Erreur de chargement</p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      )}
    </CardContent>
  </Card>
);

// Composant PatrimoineDynamique
const PatrimoineDynamique = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<SitePatrimoine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patrimoineService.getSitesPopulaires(6);
      console.log('Sites populaires response:', response);
      
      if (response.success && response.data) {
        // Vérifier que response.data est bien un tableau
        const sitesData = Array.isArray(response.data) ? response.data : [];
        console.log('Sites data:', sitesData);
        setSites(sitesData);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setSites([]); // S'assurer que sites reste un tableau même en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadSites} />;
  }

  // Protection supplémentaire pour s'assurer que sites est un tableau
  const sitesArray = Array.isArray(sites) ? sites : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Patrimoine culturel
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explorez les trésors architecturaux et naturels qui témoignent 
          de la richesse millénaire de l'Algérie
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : sitesArray.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun site patrimonial disponible pour le moment</p>
          </div>
        ) : (
          sitesArray.map((site) => (
            <Card key={site.id} className="overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {site.medias && site.medias[0] ? (
                  <img
                    src={site.medias[0].url}
                    alt={site.nom}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {site.classement === 'mondial' && (
                    <Badge className="bg-accent text-accent-foreground">
                      UNESCO
                    </Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-background/90">
                    {site.type}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{site.nom}</CardTitle>
                  {site.note_moyenne && (
                    <div className="flex items-center space-x-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{site.note_moyenne.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{getWilayaName(site.wilaya_id)}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {site.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{site.nombre_avis || 0} avis</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-primary"
                    onClick={() => navigate(`/patrimoine/${site.id}`)}
                  >
                    Découvrir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/patrimoine')}>
          Voir tous les sites patrimoniaux
        </Button>
      </div>
    </div>
  );
};

// Composant EvenementsDynamique
const EvenementsDynamique = () => {
  const navigate = useNavigate();
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadEvenements();
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const loadEvenements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await evenementService.getUpcoming({ limit: 3 });
      console.log('Evenements response:', response);
      
      if (response.success && response.data) {
        const evenements = extractDataFromResponse<Evenement>(response.data);
        console.log('Evenements data:', evenements);
        setEvenements(evenements);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setEvenements([]); // S'assurer que evenements reste un tableau
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'a_venir':
      case 'planifie':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'en_cours':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'complet':
      case 'termine':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'annule':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvenements} />;
  }

  // Protection supplémentaire
  const evenementsArray = Array.isArray(evenements) ? evenements : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Événements culturels
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Participez aux festivals, expositions et célébrations qui animent 
          la scène culturelle algérienne
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))
        ) : evenementsArray.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun événement à venir pour le moment</p>
          </div>
        ) : (
          evenementsArray.map((event) => (
            <Card key={event.id_evenement} className="overflow-hidden hover-lift">
              <div className="relative h-48 overflow-hidden">
                {event.Media && event.Media[0] ? (
                  <img
                    src={event.Media[0].url}
                    alt={event.nom_evenement}
                    className="h-full w-full object-cover"
                  />
                ) : event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.nom_evenement}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className={getStatusColor(event.statut)}>
                    {event.statut.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 leading-tight">
                  {event.nom_evenement}
                </CardTitle>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {event.date_debut ? new Date(event.date_debut).toLocaleDateString('fr-FR') : 'Date à confirmer'}
                      {event.date_fin && event.date_fin !== event.date_debut && 
                        ` - ${new Date(event.date_fin).toLocaleDateString('fr-FR')}`
                      }
                    </span>
                  </div>
                  {event.Lieu && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.Lieu.nom}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description || 'Aucune description disponible'}
                </p>
                
                {event.capacite_max && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{event.nombre_participants || 0}/{event.capacite_max}</span>
                      </div>
                      {event.tarif !== undefined && (
                        <span className="font-semibold">
                          {event.tarif === 0 ? 'Gratuit' : `${event.tarif} DA`}
                        </span>
                      )}
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${((event.nombre_participants || 0) / event.capacite_max) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {event.inscription_requise && (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => {
                      if (isAuthenticated) {
                        // TODO: Implémenter l'inscription à l'événement
                        toast({
                          title: "Inscription",
                          description: "Fonctionnalité en cours de développement",
                        });
                      } else {
                        navigate('/auth');
                      }
                    }}
                  >
                    S'inscrire à l'événement
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/evenements')}>
          Voir tous les événements
        </Button>
      </div>
    </div>
  );
};

// Composant OeuvresDynamique
const OeuvresDynamique = () => {
  const navigate = useNavigate();
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOeuvres();
  }, []);

  const loadOeuvres = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await oeuvreService.getPopular(6);
      console.log('Oeuvres response:', response);
      
      if (response.success && response.data) {
        // Vérifier que c'est bien un tableau
        const oeuvresData = Array.isArray(response.data) ? response.data : [];
        console.log('Oeuvres data:', oeuvresData);
        setOeuvres(oeuvresData as Oeuvre[]);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setOeuvres([]); // S'assurer que oeuvres reste un tableau
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadOeuvres} />;
  }

  // Protection supplémentaire
  const oeuvresArray = Array.isArray(oeuvres) ? oeuvres : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Bibliothèque numérique
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Découvrez et téléchargez les œuvres littéraires, cinématographiques 
          et artistiques qui enrichissent le patrimoine culturel algérien
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : oeuvresArray.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune œuvre disponible pour le moment</p>
          </div>
        ) : (
          oeuvresArray.map((oeuvre) => (
            <Card key={oeuvre.id_oeuvre} className="overflow-hidden hover-lift">
              <div className="relative h-48 overflow-hidden">
                {oeuvre.Media && oeuvre.Media[0] ? (
                  <img
                    src={oeuvre.Media[0].url}
                    alt={oeuvre.titre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Palette className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {oeuvre.TypeOeuvre && (
                    <Badge className="bg-primary/90 text-primary-foreground">
                      {oeuvre.TypeOeuvre.nom_type}
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-1 text-lg">
                  {oeuvre.titre}
                </CardTitle>
                
                <div className="flex items-center justify-between">
                  {oeuvre.Saiseur && (
                    <p className="text-sm text-muted-foreground">
                      par {oeuvre.Saiseur.prenom} {oeuvre.Saiseur.nom}
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {oeuvre.description || 'Aucune description disponible'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {oeuvre.annee_creation && (
                    <span>Créée en {oeuvre.annee_creation}</span>
                  )}
                  {oeuvre.Langue && (
                    <span>{oeuvre.Langue.nom}</span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Aperçu
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/oeuvres')}>
          Explorer toute la bibliothèque
        </Button>
      </div>
    </div>
  );
};

// Composant ArtisanatDynamique
const ArtisanatDynamique = () => {
  const navigate = useNavigate();
  const [artisanats, setArtisanats] = useState<Artisanat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadArtisanats();
  }, []);

  const loadArtisanats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await artisanatService.search({ limit: 6 });
      console.log('Artisanats response:', response);
      
      if (response.success && response.data) {
        const artisanats = extractDataFromResponse<Artisanat>(response.data);
        console.log('Artisanats data:', artisanats);
        setArtisanats(artisanats);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setArtisanats([]); // S'assurer que artisanats reste un tableau
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits artisanaux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadArtisanats} />;
  }

  // Protection supplémentaire
  const artisanatsArray = Array.isArray(artisanats) ? artisanats : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Artisanat traditionnel
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Découvrez les savoir-faire ancestraux transmis de génération en génération
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : artisanatsArray.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Hammer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun produit artisanal disponible pour le moment</p>
          </div>
        ) : (
          artisanatsArray.map((artisanat) => (
            <Card key={artisanat.id} className="overflow-hidden hover-lift">
              <div className="relative h-48 overflow-hidden">
                {artisanat.medias && artisanat.medias[0] ? (
                  <img
                    src={artisanat.medias[0].url}
                    alt={artisanat.nom}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <Hammer className="h-12 w-12 text-orange-500" />
                  </div>
                )}
                {artisanat.sur_commande && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-background/90">
                      Sur commande
                    </Badge>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{artisanat.nom}</CardTitle>
                {(artisanat.prix_min !== undefined || artisanat.prix_max !== undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {artisanat.prix_min !== undefined && `${artisanat.prix_min} DA`}
                      {artisanat.prix_min !== undefined && artisanat.prix_max !== undefined && artisanat.prix_max !== artisanat.prix_min && 
                        ` - ${artisanat.prix_max} DA`}
                      {artisanat.prix_min === undefined && artisanat.prix_max !== undefined && 
                        `Jusqu'à ${artisanat.prix_max} DA`}
                    </span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {artisanat.description || 'Aucune description disponible'}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  {artisanat.en_stock !== undefined && !artisanat.sur_commande && (
                    <span className="text-muted-foreground">
                      {artisanat.en_stock > 0 ? `${artisanat.en_stock} en stock` : 'Rupture de stock'}
                    </span>
                  )}
                  {artisanat.note_moyenne !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{artisanat.note_moyenne.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/artisanat/${artisanat.id}`)}
                >
                  Voir les détails
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/artisanat')}>
          Explorer tout l'artisanat
        </Button>
      </div>
    </div>
  );
};

// Composant principal Index
const Index = () => {
  console.log('=== Index component mounted ===');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('patrimoine');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      console.log('=== checkAuthAndLoadData START ===');
      setLoading(true);
      
      // Vérifier l'authentification
      const authenticated = authService.isAuthenticated();
      console.log('Is authenticated:', authenticated);
      setIsAuthenticated(authenticated);

      // Charger les métadonnées (wilayas) en cache
      console.log('Loading wilayas...');
      const wilayasResponse = await metadataService.getWilayasCached();
      console.log('Wilayas response:', wilayasResponse);
      if (wilayasResponse.success && wilayasResponse.data) {
        wilayasCache = wilayasResponse.data;
      }

      // Charger les statistiques - Seulement si authentifié ou essayer sans bloquer
      if (authenticated) {
        console.log('Loading stats (authenticated)...');
        try {
          const statsResponse = await dashboardService.getOverview();
          console.log('Stats response:', statsResponse);
          if (statsResponse.success && statsResponse.data) {
            setStats(statsResponse.data);
          }
        } catch (statsError) {
          console.log('Stats error:', statsError);
        }
      } else {
        console.log('Skipping stats (not authenticated)');
        // Vous pouvez charger des stats publiques ici si disponibles
      }

      // Charger les notifications si connecté
      if (authenticated) {
        console.log('Loading notifications...');
        const notifResponse = await notificationService.getSummary();
        console.log('Notifications response:', notifResponse);
        if (notifResponse.success && notifResponse.data) {
          setNotifications(notifResponse.data.recent_unread || []);
        }
      }
      console.log('=== checkAuthAndLoadData END ===');
    } catch (error) {
      console.error('Erreur dans checkAuthAndLoadData:', error);
      toast({
        title: "Erreur",
        description: "Certaines données n'ont pas pu être chargées",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Notifications pour les utilisateurs connectés */}
        {isAuthenticated && notifications.length > 0 && (
          <div className="container mt-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Vous avez {notifications.length} nouvelle(s) notification(s).
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-2 p-0 h-auto"
                  onClick={() => navigate('/notifications')}
                >
                  Voir tout
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <HeroSection />

        {/* Section statistiques */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-serif">La culture algérienne en chiffres</h2>
              <p className="text-muted-foreground mt-2">
                Découvrez l'ampleur de notre patrimoine culturel
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Map}
                title="Sites patrimoniaux"
                value={stats?.content?.sites_patrimoine || "-"}
                trend={stats ? "+12%" : null}
                loading={loading}
              />
              <StatCard
                icon={Calendar}
                title="Événements actifs"
                value={stats?.content?.evenements_total || "-"}
                trend={stats ? "+8%" : null}
                loading={loading}
              />
              <StatCard
                icon={Palette}
                title="Œuvres numériques"
                value={stats?.content?.oeuvres_total || "-"}
                trend={stats ? "+15%" : null}
                loading={loading}
              />
              <StatCard
                icon={Users}
                title="Membres actifs"
                value={stats?.users?.total || "-"}
                trend={stats ? "+20%" : null}
                loading={loading}
              />
            </div>
          </div>
        </section>

        {/* Section principale avec onglets */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-serif lg:text-4xl mb-4">
                Explorez notre patrimoine culturel
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Naviguez entre les différentes facettes de la culture algérienne : 
                sites historiques, événements culturels, œuvres artistiques et artisanat traditionnel
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5 mb-12">
                <TabsTrigger value="patrimoine">Patrimoine</TabsTrigger>
                <TabsTrigger value="carte">Carte</TabsTrigger>
                <TabsTrigger value="evenements">Événements</TabsTrigger>
                <TabsTrigger value="oeuvres">Œuvres</TabsTrigger>
                <TabsTrigger value="artisanat">Artisanat</TabsTrigger>
              </TabsList>
              
              <TabsContent value="patrimoine" className="space-y-8">
                <PatrimoineDynamique />
              </TabsContent>
              
              <TabsContent value="carte" className="space-y-8">
                <div className="text-center space-y-4 mb-8">
                  <h3 className="text-2xl font-bold tracking-tight font-serif">
                    Carte interactive du patrimoine
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Explorez les sites UNESCO et monuments historiques à travers une carte interactive. 
                    Créez vos propres parcours de découverte.
                  </p>
                </div>
                <CartePatrimoine />
              </TabsContent>
              
              <TabsContent value="evenements" className="space-y-8">
                <EvenementsDynamique />
              </TabsContent>
              
              <TabsContent value="oeuvres" className="space-y-8">
                <OeuvresDynamique />
              </TabsContent>

              <TabsContent value="artisanat" className="space-y-8">
                <ArtisanatDynamique />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Section CTA pour les professionnels */}
        <section className="py-12 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="container">
            <Card className="max-w-4xl mx-auto border-none shadow-lg">
              <CardContent className="p-8 md:p-12">
                <div className="text-center space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold font-serif">
                    Vous êtes un professionnel de la culture ?
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Rejoignez notre communauté d'artistes, artisans et organisateurs. 
                    Partagez vos créations et événements avec des milliers de passionnés.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button 
                      size="lg" 
                      className="btn-hover"
                      onClick={() => {
                        if (isAuthenticated) {
                          navigate('/ajouter-oeuvre');
                        } else {
                          navigate('/auth');
                        }
                      }}
                    >
                      <Palette className="h-5 w-5 mr-2" />
                      Créer une œuvre
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => {
                        if (isAuthenticated) {
                          navigate('/ajouter-evenement');
                        } else {
                          navigate('/auth');
                        }
                      }}
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Organiser un événement
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Inscription gratuite • Validation sous 48h • Support dédié
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section d'information enrichie */}
        <section className="py-16">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* À propos */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Info className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        Notre mission
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Culture Algérie est une plateforme dédiée à la préservation et à la 
                        valorisation du patrimoine culturel algérien. Nous connectons les 
                        passionnés de culture avec les richesses artistiques, historiques et 
                        traditionnelles de notre pays.
                      </p>
                      <Button variant="link" className="p-0" onClick={() => navigate('/a-propos')}>
                        En savoir plus →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ressources */}
              <Card className="bg-gradient-to-br from-accent/5 to-transparent">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Hammer className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        Ressources utiles
                      </h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-center">
                          <span className="mr-2">•</span>
                          Guide du patrimoine algérien
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">•</span>
                          Calendrier des événements culturels
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">•</span>
                          Annuaire des artisans traditionnels
                        </li>
                      </ul>
                      <Button variant="link" className="p-0 mt-4" onClick={() => navigate('/a-propos#ressources')}>
                        Accéder aux ressources →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;