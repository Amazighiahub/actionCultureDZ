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
// L'API fournit site.wilaya ; le cache ne sert que de repli (l'ancien champ wilaya_id
// n'existe pas → « Wilaya undefined » s'affichait)
const getWilayaName = (
  site: { wilaya?: { nom?: string; wilaya_name_ascii?: string }; wilaya_id?: number },
  wilayasCache: any[],
  lang: string
): string => {
  const wilaya = site.wilaya
    || (Array.isArray(wilayasCache) && site.wilaya_id ? wilayasCache.find(w => w.id_wilaya === site.wilaya_id) : undefined);
  if (!wilaya) return '';
  return lang === 'ar' && wilaya.nom ? wilaya.nom : (wilaya.wilaya_name_ascii || wilaya.wilaya_name || wilaya.nom || '');
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
    queryKey: ['home', 'patrimoine', 'popular', 12, i18n.language],
    queryFn: async (): Promise<SitePatrimoine[]> => {
      const response = await patrimoineService.getSitesPopulaires(12);
      if (response.success && response.data) {
        // Vitrine : les sites qui ont une photo d'abord (une carte sans photo fait inachevé)
        const tous = (Array.isArray(response.data) ? response.data : []) as SitePatrimoine[];
        const avecPhoto = tous.filter(s => s.medias && s.medias[0]);
        return (avecPhoto.length >= 3 ? avecPhoto : tous).slice(0, 6);
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
                {site.type && (
                  <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                      {site.type}
                    </Badge>
                  </div>
                )}
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
                      <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} rtl:-scale-x-100`} aria-hidden="true" />
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
                    <div className={`flex items-center space-x-1 rtl:space-x-reverse text-sm ${rtlClasses.flexRow}`}>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{formatNumber(site.note_moyenne, { maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>
                {getWilayaName(site, wilayasCache, i18n.language) && (
                  <div className={`flex items-center space-x-2 rtl:space-x-reverse text-sm text-muted-foreground ${rtlClasses.flexRow}`}>
                    <MapPin className="h-4 w-4" />
                    <span>{getWilayaName(site, wilayasCache, i18n.language)}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {site.description}
                </p>

                {/* « 0 avis » n'est pas affiché */}
                {Number(site.nombre_avis) > 0 && (
                  <div className={`flex items-center space-x-1 rtl:space-x-reverse text-xs text-muted-foreground ${rtlClasses.flexRow}`}>
                    <Eye className="h-3 w-3" />
                    <span>{formatNumber(Number(site.nombre_avis))} {t('sections.heritage.reviews')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
};

export default PatrimoineDynamique;
