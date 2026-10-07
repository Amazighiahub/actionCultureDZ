/**
 * PatrimoineDynamique - Section patrimoine avec lazy loading des images
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Eye, ArrowRight } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { patrimoineService } from '@/services/patrimoine.service';
import type { SitePatrimoine } from '@/services/patrimoine.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import ErrorMessage from './ErrorMessage';

// Lien « étiré » : le titre porte le lien, son ::after couvre toute la carte (cliquable + crawlable)
const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

// Helper pour obtenir le nom de la wilaya
const getWilayaName = (wilayaId: number, wilayasCache: any[]): string => {
  if (!wilayasCache || !Array.isArray(wilayasCache)) {
    return `Wilaya ${wilayaId}`;
  }
  const wilaya = wilayasCache.find(w => w.id_wilaya === wilayaId);
  return wilaya ? wilaya.wilaya_name : `Wilaya ${wilayaId}`;
};

interface PatrimoineDynamiqueProps {
  wilayasCache?: any[];
}

// Constant to avoid creating new array reference on every render
const EMPTY_WILAYAS_ARRAY: any[] = [];

const PatrimoineDynamique: React.FC<PatrimoineDynamiqueProps> = ({ wilayasCache = EMPTY_WILAYAS_ARRAY }) => {
  const { t, i18n } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  // React Query : données gardées en cache (5 min) quand on revient sur l'accueil
  const { data: sites = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['home', 'patrimoine', 'popular', 6, i18n.language],
    queryFn: async (): Promise<SitePatrimoine[]> => {
      const response = await patrimoineService.getSitesPopulaires(6);
      if (response.success && response.data) {
        return (Array.isArray(response.data) ? response.data : []) as SitePatrimoine[];
      }
      throw new Error(response.error || t('errors.loadingError'));
    },
  });
  const error = queryError ? (queryError instanceof Error ? queryError.message : t('errors.generic.message')) : null;
  const loadSites = () => { void refetch(); };

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
          sitesArray.map((site, index) => (
            <Card key={site.id || site.id_lieu || `site-${index}`} className="relative overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {site.medias && site.medias[0] ? (
                  <img
                    src={getAssetUrl(site.medias[0].url, { width: 640 })}
                    alt={site.nom || 'Site patrimonial algérien'}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={192}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="w-full"
                  >
                    <Link
                      to={`/patrimoine/${site.id || site.id_lieu}`}
                      tabIndex={-1}
                      aria-label={`${t('sections.heritage.discover', 'Découvrir')} : ${site.nom}`}
                    >
                      {t('sections.heritage.discover')}
                      <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)}`} aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">
                    <Link to={`/patrimoine/${site.id || site.id_lieu}`} className={STRETCHED_LINK_CLASS}>
                      {site.nom}
                    </Link>
                  </CardTitle>
                  {site.note_moyenne && (
                    <div className={`flex items-center space-x-1 text-sm ${rtlClasses.flexRow}`}>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{formatNumber(site.note_moyenne, { maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>
                <div className={`flex items-center space-x-2 text-sm text-muted-foreground ${rtlClasses.flexRow}`}>
                  <MapPin className="h-4 w-4" />
                  <span>{getWilayaName(site.wilaya_id, wilayasCache)}</span>
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
        <Button asChild size="lg" variant="outline" className="group">
          <Link to="/patrimoine">
            {t('sections.heritage.seeAll')}
            <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PatrimoineDynamique;
