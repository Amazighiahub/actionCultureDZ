/**
 * Page d'accueil avec intégration complète des API, traductions i18n et design amélioré
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Skeleton } from '@/components/UI/skeleton';
import { useToast } from '@/components/UI/use-toast';
import { 
  TrendingUp, Users, Calendar, Palette, Map, Info, Bell, Hammer,
  MapPin, Clock, Star, Eye, Download, AlertCircle, RefreshCw,
  ChevronRight, Trophy, ArrowRight, Sparkles, Heart
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

// Composant HeroSection amélioré avec carousel d'images
const EnhancedHeroSection = () => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Images du carousel
  const heroImages = [
    {
      url: 'https://images.pexels.com/photos/19738955/pexels-photo-19738955.jpeg',
      title: 'Casbah d\'Alger',
      subtitle: 'Patrimoine mondial UNESCO'
    },
    {
      url: 'https://as2.ftcdn.net/v2/jpg/03/58/66/17/1000_F_358661751_f23PhAChuJmTE4JWAeXa15uPYcwaDclj.jpg',
      title: 'Timgad',
      subtitle: 'Patrimoine mondial UNESCO'
    },
    {
      url: 'https://images.pexels.com/photos/9180227/pexels-photo-9180227.jpeg',
      title: 'Sahara Algérien',
      subtitle: 'Beauté naturelle exceptionnelle'
    },
    {
      url: 'https://images.pexels.com/photos/9254283/pexels-photo-9254283.jpeg',
      title: 'Timgad',
      subtitle: 'Art et savoir-faire ancestral'
    },
    {
      url: 'https://thumbs.dreamstime.com/z/ruines-d-une-maison-de-berber-au-canyon-ghoufi-en-alg%C3%A9rie-121973610.jpg?ct=jpeg',
      title: 'Ghoufi',
      subtitle: 'Art et savoir-faire ancestral'
    },
    {
      url: 'https://as2.ftcdn.net/v2/jpg/02/24/00/37/1000_F_224003731_IaY7muvK4NXdBNH1d1mLoBh6vQakVa2d.jpg',
      title: 'kabylie village',
      subtitle: 'Art et savoir-faire ancestral'
    }
  ];

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[600px] md:h-[700px] overflow-hidden">
      {/* Carousel d'images */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
        ))}
      </div>

      {/* Contenu */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container">
          <div className="max-w-3xl text-white">
            {/* Badge animé */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6 animate-fade-in">
              <Sparkles className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
              <span className="text-sm font-medium">
                {t('home.hero.badge', 'Découvrez le patrimoine culturel algérien')}
              </span>
            </div>

            {/* Titre principal avec animation */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up font-serif">
              {t('common.appName', 'Patrimoine culturel')}
            </h1>

            {/* Sous-titre */}
            <p className="text-xl md:text-2xl mb-8 text-gray-200 animate-slide-up animation-delay-200">
              {t('home.hero.subtitle', 'Explorez, préservez et partagez la richesse culturelle de l\'Algérie')}
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-wrap gap-4 animate-slide-up animation-delay-400`}>
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all"
                onClick={() => navigate('/patrimoine')}
              >
                {t('home.hero.explore', 'Explorer le patrimoine')}
                <ChevronRight className={`${rtlClasses.marginStart(2)} h-5 w-5`} />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-white border-white hover:bg-white/20 backdrop-blur-sm"
                onClick={() => navigate('/auth')}
              >
                {t('home.hero.contribute', 'Contribuer')}
              </Button>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 animate-fade-in animation-delay-600">
              {[
                { icon: MapPin, value: '1000+', label: t('home.stats.heritage', 'Sites patrimoniaux') },
                { icon: Calendar, value: '500+', label: t('home.stats.events', 'Événements') },
                { icon: Palette, value: '2000+', label: t('home.stats.works', 'Œuvres') },
                { icon: Users, value: '10k+', label: t('home.stats.members', 'Membres') }
              ].map((stat, index) => (
                <div key={index} className="text-center group cursor-pointer">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary-foreground/80 group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicateurs de carousel */}
          <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2`}>
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'w-8 bg-white' : 'bg-white/50'
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Motif décoratif en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

// Composant StatCard amélioré avec animations
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
  const [displayValue, setDisplayValue] = useState(0);

  // Animation du compteur
  useEffect(() => {
    if (!loading && typeof value === 'number') {
      const duration = 2000;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value, loading]);
  
  return (
    <Card className="hover-lift group overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full">
          <pattern id={`pattern-${title}`} x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
          <rect width="100%" height="100%" fill={`url(#pattern-${title})`} />
        </svg>
      </div>

      <CardContent className="p-6 relative">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              {trend && (
                <div className={`flex items-center text-sm text-green-600 ${rtlClasses.flexRow}`}>
                  <TrendingUp className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                  {trend}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? formatNumber(displayValue) : value}
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

// Séparateur avec motif géométrique islamique
const IslamicPatternDivider = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative py-8 ${className}`}>
      <svg 
        className="w-full h-16" 
        viewBox="0 0 1200 64" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="islamic-divider" x="0" y="0" width="100" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M50 0 L70 20 L50 40 L30 20 Z"
              fill="currentColor"
              className="text-primary/20"
            />
            <circle cx="50" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/30" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-divider)" />
      </svg>
    </div>
  );
};

// Composant PatrimoineDynamique amélioré
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
      <div className="text-center space-y-4 reveal-on-scroll">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl font-serif">
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
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  {site.classement === 'mondial' && (
                    <Badge className="bg-accent text-accent-foreground shadow-lg">
                      UNESCO
                    </Badge>
                  )}
                </div>
                <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    {site.type}
                  </Badge>
                </div>
                {/* Overlay au hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate(`/patrimoine/${site.id}`)}
                  >
                    {t('sections.heritage.discover')}
                    <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)}`} />
                  </Button>
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
                    <Eye className="h-3 w-3" />
                    <span>{formatNumber(site.nombre_avis || 0)} {t('sections.heritage.reviews')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/patrimoine')} className="group">
          {t('sections.heritage.seeAll')}
          <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
        </Button>
      </div>
    </div>
  );
};

// Composant EvenementsDynamique amélioré
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
    return t(`sections.events.status.${statut}`, statut.replace(/_/g, ' '));
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvenements} />;
  }

  const evenementsArray = Array.isArray(evenements) ? evenements : [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl font-serif">
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
            <Card key={event.id_evenement} className="overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {event.Media && event.Media[0] ? (
                  <img
                    src={event.Media[0].url}
                    alt={event.nom_evenement}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.nom_evenement}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  <Badge className={`${getStatusColor(event.statut)} backdrop-blur-sm`}>
                    {getStatusText(event.statut)}
                  </Badge>
                </div>
                {/* Date badge */}
                {event.date_debut && (
                  <div className={`absolute bottom-4 ${rtlClasses.end(4)} bg-background/90 backdrop-blur-sm rounded-lg p-2`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{new Date(event.date_debut).getDate()}</div>
                      <div className="text-xs uppercase">{new Date(event.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                  </div>
                )}
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
                        <span className="font-semibold text-primary">
                          {formatPrice(event.tarif)}
                        </span>
                      )}
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${((event.nombre_participants || 0) / event.capacite_max) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {event.inscription_requise && (
                  <Button 
                    className="w-full group" 
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
                    <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/evenements')} className="group">
          {t('sections.events.seeAllEvents')}
          <Calendar className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} />
        </Button>
      </div>
    </div>
  );
};

// Composant OeuvresDynamique amélioré
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
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl font-serif">
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
            <Card key={oeuvre.id_oeuvre} className="overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {oeuvre.Media && oeuvre.Media[0] ? (
                  <img
                    src={oeuvre.Media[0].url}
                    alt={oeuvre.titre}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Palette className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  {oeuvre.TypeOeuvre && (
                    <Badge className="bg-primary/90 text-primary-foreground shadow-lg">
                      {oeuvre.TypeOeuvre.nom_type}
                    </Badge>
                  )}
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className={`flex gap-2`}>
                    <Button size="icon" variant="secondary" className="rounded-full">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
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
                    <Badge variant="outline" >
                      {oeuvre.Langue.nom}
                    </Badge>
                  )}
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full group"
                  onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                >
                  {t('sections.works.details')}
                  <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/oeuvres')} className="group">
          {t('sections.works.exploreLibrary')}
          <Palette className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} />
        </Button>
      </div>
    </div>
  );
};

// Composant ArtisanatDynamique amélioré
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
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl font-serif">
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
            <Card key={artisanat.id} className="overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {artisanat.medias && artisanat.medias[0] ? (
                  <img
                    src={artisanat.medias[0].url}
                    alt={artisanat.nom}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <Hammer className="h-12 w-12 text-orange-500" />
                  </div>
                )}
                {artisanat.sur_commande && (
                  <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                      {t('sections.crafts.onOrder')}
                    </Badge>
                  </div>
                )}
                {/* Like button */}
                <button className={`absolute top-4 ${rtlClasses.start(4)} p-2 rounded-full bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <Heart className="h-4 w-4" />
                </button>
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
                    <span className={`text-muted-foreground ${artisanat.en_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                  className="w-full group"
                  onClick={() => navigate(`/artisanat/${artisanat.id}`)}
                >
                  {t('sections.crafts.seeDetails')}
                  <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" onClick={() => navigate('/artisanat')} className="group">
          {t('sections.crafts.exploreAll')}
          <Hammer className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} />
        </Button>
      </div>
    </div>
  );
};

// Section CTA améliorée avec image de fond
const EnhancedCTASection = () => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Image de fond avec overlay */}
      
        {/* Overlay avec gradient */}
       
    

      {/* Contenu */}
      <div className="container relative z-10">
        <Card className="max-w-5xl mx-auto bg-white/95 dark:bg-green-900/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="p-8 md:p-12">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('home.professionals.badge', 'Espace Professionnels')}
                </span>
              </div>

              {/* Titre avec icône */}
             

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('home.professionals.subtitle')}
              </p>

             
        

              {/* Boutons CTA */}
              <div className={`flex flex-col sm:flex-row justify-center gap-4`}>
                <Button 
                  size="lg" 
                  className="group shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ajouter-oeuvre');
                    } else {
                      navigate('/auth');
                    }
                  }}
                >
                  <Palette className={`h-5 w-5 ${rtlClasses.marginEnd(2)} group-hover:rotate-12 transition-transform`} />
                  {t('home.professionals.createWork')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="shadow-lg hover:shadow-xl transition-all bg-white hover:bg-gray-50"
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

              {/* Avantages */}
              <div className={`flex flex-wrap justify-center gap-6 text-sm text-muted-foreground pt-4`}>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Visibilité accrue
                </div>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Outils de gestion
                </div>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Communauté active
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
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
  const direction = i18n.language === 'ar' || i18n.language === 'ar-DZ' ? 'rtl' : 'ltr';;
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

  // Import dynamique de la carte
  const CartePatrimoine = React.lazy(() => import('@/components/CartePatrimoine'));
  
  return (
    <div className={`min-h-screen bg-background`} dir={direction}>
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

        {/* Hero Section amélioré */}
        <EnhancedHeroSection />

        {/* Section statistiques avec image de fond */}
       

        {/* Séparateur décoratif */}
        <IslamicPatternDivider />

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
                <TabsTrigger value="patrimoine" className="group">
                  <MapPin className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.heritage')}
                </TabsTrigger>
                <TabsTrigger value="carte" className="group">
                  <Map className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.map')}
                </TabsTrigger>
                <TabsTrigger value="evenements" className="group">
                  <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.events')}
                </TabsTrigger>
                <TabsTrigger value="oeuvres" className="group">
                  <Palette className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.works')}
                </TabsTrigger>
                <TabsTrigger value="artisanat" className="group">
                  <Hammer className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.crafts')}
                </TabsTrigger>
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
                <React.Suspense fallback={<Skeleton className="h-[500px] w-full rounded-lg" />}>
                  <CartePatrimoine />
                </React.Suspense>
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

        {/* Section CTA pour les professionnels avec image */}
        <EnhancedCTASection />

        {/* Section Mission et Ressources avec images de fond */}
        <section className="py-16 relative overflow-hidden">
          {/* Background décoratif */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full">
              <pattern id="dots-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="currentColor" className="text-primary" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dots-pattern)" />
            </svg>
          </div>

          <div className="container relative">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Mission */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent hover-lift overflow-hidden group">
                <div className={`absolute top-0 ${rtlClasses.end(0)} w-32 h-32 opacity-10`}>
                  <img 
                    src="https://images.unsplash.com/photo-1569163139394-de4798a9f0d5?w=400"
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <CardContent className="p-8 relative">
                  <div className={`flex items-start space-x-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Info className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        {t('home.mission.title')}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {t('home.mission.description')}
                      </p>
                      <Button variant="link" className="p-0 group" onClick={() => navigate('/a-propos')}>
                        {t('home.mission.learnMore')}
                        <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ressources */}
              <Card className="bg-gradient-to-br from-accent/5 to-transparent hover-lift overflow-hidden group">
                <div className={`absolute top-0 ${rtlClasses.end(0)} w-32 h-32 opacity-10`}>
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <CardContent className="p-8 relative">
                  <div className={`flex items-start space-x-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
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
                      <Button variant="link" className="p-0 mt-4 group" onClick={() => navigate('/a-propos#ressources')}>
                        {t('home.resources.access')}
                        <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
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