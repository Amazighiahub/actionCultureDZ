/**
 * EvenementsDynamique - Section événements avec lazy loading des images
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { evenementService } from '@/services/evenement.service';
import { authService } from '@/services/auth.service';
import { Evenement } from '@/types';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';
import ErrorMessage from './ErrorMessage';

// Lien « étiré » : le titre porte le lien, son ::after couvre toute la carte (cliquable + crawlable)
const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

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
  return [];
}

const EvenementsDynamique: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatDate: formatDateLocale } = useFormatDate();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  const lang = (i18n.language || 'fr') as SupportedLanguage;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  // React Query : données gardées en cache (5 min) quand on revient sur l'accueil
  const { data: evenements = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['home', 'evenements', 'upcoming', 3, i18n.language],
    queryFn: async (): Promise<Evenement[]> => {
      const response = await evenementService.getUpcoming({ limit: 3 });
      if (response.success && response.data) {
        return extractDataFromResponse<Evenement>(response.data);
      }
      throw new Error(response.error || t('errors.loadingError'));
    },
  });
  const error = queryError ? (queryError instanceof Error ? queryError.message : t('errors.generic.message')) : null;
  const loadEvenements = () => { void refetch(); };

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
            <Card key={event.id_evenement} className="relative overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {event.Media && event.Media[0] ? (
                  <img
                    src={getAssetUrl(event.Media[0].url, { width: 640 })}
                    alt={getTranslation(event.nom_evenement, lang) || 'Événement culturel'}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={192}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : event.image_url ? (
                  <img
                    src={getAssetUrl(event.image_url, { width: 640 })}
                    alt={getTranslation(event.nom_evenement, lang) || 'Événement culturel'}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={192}
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
                      <div className="text-xs uppercase">{formatDateLocale(event.date_debut, { month: 'short' })}</div>
                    </div>
                  </div>
                )}
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 leading-tight">
                  <Link to={`/evenements/${event.id_evenement}`} className={STRETCHED_LINK_CLASS}>
                    {getTranslation(event.nom_evenement, lang)}
                  </Link>
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
                      <span>{typeof event.Lieu.nom === 'object' ? getTranslation(event.Lieu.nom, lang) : event.Lieu.nom}</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {(typeof event.description === 'object' ? getTranslation(event.description, lang) : event.description) || t('common.noDescription')}
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
                  <Button asChild className="relative z-10 w-full group" size="sm">
                    <Link
                      to={isAuthenticated
                        ? `/evenements/${event.id_evenement}`
                        : `/auth?redirect=/evenements/${event.id_evenement}`}
                      aria-label={`${t('sections.events.register', "S'inscrire")} : ${getTranslation(event.nom_evenement, lang)}`}
                    >
                      {t('sections.events.register')}
                      <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button asChild size="lg" variant="outline" className="group">
          <Link to="/evenements">
            {t('sections.events.seeAllEvents')}
            <Calendar className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default EvenementsDynamique;
