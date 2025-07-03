/**
 * Page d'accueil avec intégration complète des API et traductions i18n
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

// Import des hooks de localisation
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';

// Import des services
import { dashboardService } from '@/services/dashboard.service';
import { evenementService } from '@/services/evenement.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { patrimoineService } from '@/services/patrimoine.service';
import { artisanatService } from '@/services/artisanat.service';
import { notificationService } from '@/services/notification.service';
import { authService } from '@/services/auth.service';
import { metadataService } from '@/services/metadata.service';

// Import des types
import {
  Evenement,
  Oeuvre,
  Wilaya
} from '@/types';

import type { SitePatrimoine } from '@/services/patrimoine.service';
import type { Artisanat } from '@/services/artisanat.service';
import type { OverviewStats } from '@/services/dashboard.service';
import type { Notification } from '@/services/notification.service';
import { PaginatedResponse } from '@/config/api';

// État global pour les wilayas
let wilayasCache: Wilaya[] = [];

// Helper pour obtenir le nom de la wilaya
const getWilayaName = (wilayaId: number): string => {
  const wilaya = wilayasCache.find(w => w.id_wilaya === wilayaId);
  return wilaya ? wilaya.wilaya_name : `Wilaya ${wilayaId}`;
};

// Helper pour extraire les données d'une réponse
function extractDataFromResponse<T>(responseData: any): T[] {
  if (!responseData) return [];
  
  if (typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
    return responseData.data;
  }
  
  if (Array.isArray(responseData)) {
    return responseData;
  }
  
  if (typeof responseData === 'object' && 'items' in responseData && Array.isArray(responseData.items)) {
    return responseData.items;
  }
  
  console.warn('extractDataFromResponse: format non reconnu:', responseData);
  return [];
}

// Composant StatCard avec traductions
interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  trend?: string | null;
  loading?: boolean;
}

const StatCard = ({ icon: Icon, title, value, trend, loading = false }: StatCardProps) => {
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  
  return (
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
                  <TrendingUp className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                  {trend}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? formatNumber(value) : value}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Composant ErrorMessage avec traductions
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry?: () => void }) => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="p-6">
        <div className={`flex items-center space-x-2 text-destructive mb-2 ${rtlClasses.flexRow}`}>
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">{t('errors.loadingError')}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
            {t('common.retry')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Composant PatrimoineDynamique avec traductions
const PatrimoineDynamique = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
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
      
      if (response.success && response.data) {
        const sitesData = Array.isArray(response.data) ? response.data : [];
        setSites(sitesData);
      } else {
        throw new Error(response.error || t('errors.loadingError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic.message'));
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadSites} />;
  }

  const sitesArray = Array.isArray(sites) ? sites : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {t('sections.heritage.title')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('sections.heritage.subtitle')}
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
            <p className="text-muted-foreground">{t('sections.heritage.noResults')}</p>
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
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  {site.classement === 'mondial' && (
                    <Badge className="bg-accent text-accent-foreground">
                      UNESCO
                    </Badge>
                  )}
                </div>
                <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                  <Badge variant="secondary" className="bg-background/90">
                    {site.type}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{site.nom}</CardTitle>
                  {site.note_moyenne && (
                    <div className={`flex items-center space-x-1 text-sm ${rtlClasses.flexRow}`}>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{formatNumber(site.note_moyenne, { maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>
                <div className={`flex items-center space-x-2 text-sm text-muted-foreground ${rtlClasses.flexRow}`}>
                  <MapPin className="h-4 w-4" />
                  <span>{getWilayaName(site.wilaya_id)}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {site.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-1 text-xs text-muted-foreground ${rtlClasses.flexRow}`}>
                    <Clock className="h-3 w-3" />
                    <span>{formatNumber(site.nombre_avis || 0)} {t('sections.heritage.reviews')}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-primary"
                    onClick={() => navigate(`/patrimoine/${site.id}`)}
                  >
                    {t('sections.heritage.discover')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/patrimoine')}>
          {t('sections.heritage.seeAll')}
        </Button>
      </div>
    </div>
  );
};

// Composant EvenementsDynamique avec traductions
const EvenementsDynamique = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
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
      
      if (response.success && response.data) {
        const evenements = extractDataFromResponse<Evenement>(response.data);
        setEvenements(evenements);
      } else {
        throw new Error(response.error || t('errors.loadingError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic.message'));
      setEvenements([]);
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

  const getStatusText = (statut: string) => {
    // Utiliser les traductions pour les statuts
    return t(`sections.events.status.${statut}`, statut.replace(/_/g, ' '));
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvenements} />;
  }

  const evenementsArray = Array.isArray(evenements) ? evenements : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {t('sections.events.title')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('sections.events.subtitle')}
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
            <p className="text-muted-foreground">{t('sections.events.noEvents')}</p>
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
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  <Badge className={getStatusColor(event.statut)}>
                    {getStatusText(event.statut)}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 leading-tight">
                  {event.nom_evenement}
                </CardTitle>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className={`flex items-center space-x-2 ${rtlClasses.flexRow}`}>
                    <Calendar className="h-4 w-4" />
                    <span>
                      {event.date_debut ? formatDate(event.date_debut) : t('sections.events.dateToConfirm')}
                      {event.date_fin && event.date_fin !== event.date_debut && 
                        ` - ${formatDate(event.date_fin)}`
                      }
                    </span>
                  </div>
                  {event.Lieu && (
                    <div className={`flex items-center space-x-2 ${rtlClasses.flexRow}`}>
                      <MapPin className="h-4 w-4" />
                      <span>{event.Lieu.nom}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description || t('common.noDescription')}
                </p>
                
                {event.capacite_max && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className={`flex items-center space-x-1 ${rtlClasses.flexRow}`}>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(event.nombre_participants || 0)}/{formatNumber(event.capacite_max)}</span>
                      </div>
                      {event.tarif !== undefined && (
                        <span className="font-semibold">
                          {formatPrice(event.tarif)}
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
                        toast({
                          title: t('sections.events.registration'),
                          description: t('common.featureInDevelopment'),
                        });
                      } else {
                        navigate('/auth');
                      }
                    }}
                  >
                    {t('sections.events.register')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/evenements')}>
          {t('sections.events.seeAllEvents')}
        </Button>
      </div>
    </div>
  );
};

// Composant OeuvresDynamique
const OeuvresDynamique = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
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
      const response = await oeuvreService.getRecentOeuvres();
      
      if (response.success && response.data) {
        const oeuvresData = Array.isArray(response.data) ? response.data : [];
        setOeuvres(oeuvresData as Oeuvre[]);
      } else {
        throw new Error(response.error || t('errors.loadingError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic.message'));
      setOeuvres([]);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadOeuvres} />;
  }

  const oeuvresArray = Array.isArray(oeuvres) ? oeuvres : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {t('sections.works.title')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('sections.works.subtitle')}
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
            <p className="text-muted-foreground">{t('sections.works.noWorks')}</p>
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
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
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
                      {t('common.by')} {oeuvre.Saiseur.prenom} {oeuvre.Saiseur.nom}
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {oeuvre.description || t('common.noDescription')}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {oeuvre.annee_creation && (
                    <span>{t('sections.works.createdIn', { year: oeuvre.annee_creation })}</span>
                  )}
                  {oeuvre.Langue && (
                    <span>{oeuvre.Langue.nom}</span>
                  )}
                </div>
                
                <div className={`flex space-x-2 ${rtlClasses.flexRow}`}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                  >
                    <Eye className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                    {t('sections.works.preview')}
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                  >
                    <Download className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                    {t('sections.works.details')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/oeuvres')}>
          {t('sections.works.exploreLibrary')}
        </Button>
      </div>
    </div>
  );
};

// Composant ArtisanatDynamique
const ArtisanatDynamique = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
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
      
      if (response.success && response.data) {
        const artisanats = extractDataFromResponse<Artisanat>(response.data);
        setArtisanats(artisanats);
      } else {
        throw new Error(response.error || t('errors.loadingError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic.message'));
      setArtisanats([]);
      toast({
        title: t('errors.generic.title'),
        description: t('errors.loadingCraftsError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadArtisanats} />;
  }

  const artisanatsArray = Array.isArray(artisanats) ? artisanats : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {t('sections.crafts.title')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('sections.crafts.subtitle')}
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
            <p className="text-muted-foreground">{t('sections.crafts.noCrafts')}</p>
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
                  <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                    <Badge variant="secondary" className="bg-background/90">
                      {t('sections.crafts.onOrder')}
                    </Badge>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{artisanat.nom}</CardTitle>
                {(artisanat.prix_min !== undefined || artisanat.prix_max !== undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {artisanat.prix_min !== undefined && artisanat.prix_max !== undefined && artisanat.prix_max !== artisanat.prix_min ? (
                        t('sections.crafts.price.range', { 
                          min: formatPrice(artisanat.prix_min), 
                          max: formatPrice(artisanat.prix_max) 
                        })
                      ) : artisanat.prix_min !== undefined ? (
                        t('sections.crafts.price.from', { min: formatPrice(artisanat.prix_min) })
                      ) : artisanat.prix_max !== undefined ? (
                        t('sections.crafts.price.upTo', { max: formatPrice(artisanat.prix_max) })
                      ) : null}
                    </span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {artisanat.description || t('common.noDescription')}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  {artisanat.en_stock !== undefined && !artisanat.sur_commande && (
                    <span className="text-muted-foreground">
                      {artisanat.en_stock > 0 ? 
                        t('sections.crafts.stock.inStock', { count: artisanat.en_stock }) : 
                        t('sections.crafts.stock.outOfStock')}
                    </span>
                  )}
                  {artisanat.note_moyenne !== undefined && (
                    <div className={`flex items-center space-x-1 ${rtlClasses.flexRow}`}>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{formatNumber(artisanat.note_moyenne, { maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/artisanat/${artisanat.id}`)}
                >
                  {t('sections.crafts.seeDetails')}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/artisanat')}>
          {t('sections.crafts.exploreAll')}
        </Button>
      </div>
    </div>
  );
};

// Composant principal Index
const Index = () => {
  console.log('=== Index component mounted ===');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  
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
      
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Charger les wilayas
      const wilayasResponse = await metadataService.getWilayas();
      if (wilayasResponse.success && wilayasResponse.data) {
        wilayasCache = wilayasResponse.data;
      }

      // Charger les stats si authentifié
      if (authenticated) {
        try {
          const statsResponse = await dashboardService.getOverview();
          if (statsResponse.success && statsResponse.data) {
            setStats(statsResponse.data);
          }
        } catch (statsError) {
          console.log('Stats error:', statsError);
        }
      }

      // Charger les notifications si connecté
      if (authenticated) {
        try {
          const notifSummary = await notificationService.getSummary();
          if (notifSummary && notifSummary.dernieres && Array.isArray(notifSummary.dernieres)) {
            setNotifications((notifSummary.dernieres as any) || []);
          }
        } catch (notifError) {
          console.log('Notifications error:', notifError);
        }
      }
    } catch (error) {
      console.error('Erreur dans checkAuthAndLoadData:', error);
      toast({
        title: t('errors.generic.title'),
        description: t('errors.partialDataLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background`} dir={rtlClasses.direction}>
      <Header />
      
      <main>
        {/* Notifications pour les utilisateurs connectés */}
        {isAuthenticated && notifications.length > 0 && (
          <div className="container mt-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Bell className="h-4 w-4" />
              <AlertDescription>
                {t('notifications.youHave', { count: notifications.length })}
                <Button 
                  variant="link" 
                  size="sm" 
                  className={`${rtlClasses.marginStart(2)} p-0 h-auto`}
                  onClick={() => navigate('/notifications')}
                >
                  {t('common.viewAll')}
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
              <h2 className="text-2xl font-bold font-serif">{t('home.stats.title')}</h2>
              <p className="text-muted-foreground mt-2">
                {t('home.stats.subtitle')}
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Map}
                title={t('home.stats.heritage')}
                value={stats?.content?.sites_patrimoine || "-"}
                trend={stats ? "+12%" : null}
                loading={loading}
              />
              <StatCard
                icon={Calendar}
                title={t('home.stats.events')}
                value={stats?.content?.evenements_total || "-"}
                trend={stats ? "+8%" : null}
                loading={loading}
              />
              <StatCard
                icon={Palette}
                title={t('home.stats.works')}
                value={stats?.content?.oeuvres_total || "-"}
                trend={stats ? "+15%" : null}
                loading={loading}
              />
              <StatCard
                icon={Users}
                title={t('home.stats.members')}
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
                {t('home.explore.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('home.explore.subtitle')}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5 mb-12">
                <TabsTrigger value="patrimoine">{t('home.explore.tabs.heritage')}</TabsTrigger>
                <TabsTrigger value="carte">{t('home.explore.tabs.map')}</TabsTrigger>
                <TabsTrigger value="evenements">{t('home.explore.tabs.events')}</TabsTrigger>
                <TabsTrigger value="oeuvres">{t('home.explore.tabs.works')}</TabsTrigger>
                <TabsTrigger value="artisanat">{t('home.explore.tabs.crafts')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="patrimoine" className="space-y-8">
                <PatrimoineDynamique />
              </TabsContent>
              
              <TabsContent value="carte" className="space-y-8">
                <div className="text-center space-y-4 mb-8">
                  <h3 className="text-2xl font-bold tracking-tight font-serif">
                    {t('sections.heritage.interactiveMap')}
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t('sections.heritage.mapDescription')}
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
                    {t('home.professionals.title')}
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {t('home.professionals.subtitle')}
                  </p>
                  <div className={`flex flex-col sm:flex-row justify-center gap-4`}>
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
                      <Palette className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                      {t('home.professionals.createWork')}
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
                      <Calendar className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                      {t('home.professionals.organizeEvent')}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('home.professionals.benefits')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section Mission et Ressources */}
        <section className="py-16">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Mission */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8">
                  <div className={`flex items-start space-x-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Info className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        {t('home.mission.title')}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {t('home.mission.description')}
                      </p>
                      <Button variant="link" className="p-0" onClick={() => navigate('/a-propos')}>
                        {t('home.mission.learnMore')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ressources */}
              <Card className="bg-gradient-to-br from-accent/5 to-transparent">
                <CardContent className="p-8">
                  <div className={`flex items-start space-x-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Hammer className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        {t('home.resources.title')}
                      </h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.guide')}
                        </li>
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.calendar')}
                        </li>
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.directory')}
                        </li>
                      </ul>
                      <Button variant="link" className="p-0 mt-4" onClick={() => navigate('/a-propos#ressources')}>
                        {t('home.resources.access')}
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