/**
 * ArtisanatDynamique - Section artisanat avec lazy loading des images
 */
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Hammer, Star, ArrowRight } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { artisanatService } from '@/services/artisanat.service';
import type { Artisanat } from '@/services/artisanat.service';
import { getAssetUrl } from '@/helpers/assetUrl';
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

const ArtisanatDynamique: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();

  // React Query : données gardées en cache (5 min) quand on revient sur l'accueil
  const { data: artisanats = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['home', 'artisanat', 6, i18n.language],
    queryFn: async (): Promise<Artisanat[]> => {
      const response = await artisanatService.getAll({ limit: 6 });
      if (response.success && response.data) {
        return extractDataFromResponse<Artisanat>(response.data);
      }
      throw new Error(response.error || t('errors.loadingError'));
    },
  });
  const error = queryError ? (queryError instanceof Error ? queryError.message : t('errors.generic.message')) : null;
  const loadArtisanats = () => { void refetch(); };

  // Une notification par échec (après les nouvelles tentatives), pas une par tentative
  useEffect(() => {
    if (!queryError) return;
    toast({
      title: t('errors.generic.title'),
      description: t('errors.loadingCraftsError'),
      variant: "destructive",
    });
  }, [queryError, toast, t]);

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
            <Card key={artisanat.id} className="relative overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {artisanat.medias && artisanat.medias[0] ? (
                  <img
                    src={getAssetUrl(artisanat.medias[0].url, { width: 640 })}
                    alt={artisanat.nom || 'Artisanat algérien traditionnel'}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={192}
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
</div>

              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  <Link to={`/artisanat/${artisanat.id}`} className={STRETCHED_LINK_CLASS}>
                    {artisanat.nom}
                  </Link>
                </CardTitle>
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
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      <span>{formatNumber(artisanat.note_moyenne, { maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                </div>

                <Button asChild size="sm" className="w-full group">
                  <Link
                    to={`/artisanat/${artisanat.id}`}
                    tabIndex={-1}
                    aria-label={`${t('sections.crafts.seeDetails', 'Voir les détails')} : ${artisanat.nom}`}
                  >
                    {t('sections.crafts.seeDetails')}
                    <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center">
        <Button asChild size="lg" variant="outline" className="group">
          <Link to="/artisanat">
            {t('sections.crafts.exploreAll')}
            <Hammer className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ArtisanatDynamique;
