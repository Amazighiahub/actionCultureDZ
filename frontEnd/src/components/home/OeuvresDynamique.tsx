/**
 * OeuvresDynamique - Section œuvres avec lazy loading des images
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette, ArrowRight } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';
import { oeuvreService } from '@/services/oeuvre.service';
import { Oeuvre } from '@/types';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';
import ErrorMessage from './ErrorMessage';

// Lien « étiré » : le titre porte le lien, son ::after couvre toute la carte (cliquable + crawlable)
const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

const OeuvresDynamique: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { rtlClasses } = useRTL();
  const lang = (i18n.language || 'fr') as SupportedLanguage;
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
            <Card key={oeuvre.id_oeuvre} className="relative overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                {oeuvre.Media && oeuvre.Media[0] ? (
                  <img
                    src={getAssetUrl(oeuvre.Media[0].url)}
                    alt={getTranslation(oeuvre.titre, lang) || 'Oeuvre culturelle'}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={192}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Palette className="h-12 w-12 text-primary/50" aria-hidden="true" />
                  </div>
                )}
                <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                  {oeuvre.TypeOeuvre && (
                    <Badge className="bg-primary/90 text-primary-foreground shadow-lg">
                      {oeuvre.TypeOeuvre.nom_type}
                    </Badge>
                  )}
                </div>
                {/* Hover overlay (décoratif) */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-1 text-lg">
                  <Link to={`/oeuvres/${oeuvre.id_oeuvre}`} className={STRETCHED_LINK_CLASS}>
                    {getTranslation(oeuvre.titre, lang)}
                  </Link>
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
                  {(typeof oeuvre.description === 'object' ? getTranslation(oeuvre.description, lang) : oeuvre.description) || t('common.noDescription')}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {oeuvre.annee_creation && (
                    <span>{t('sections.works.createdIn', { year: oeuvre.annee_creation })}</span>
                  )}
                  {oeuvre.Langue && (
                    <Badge variant="outline">
                      {oeuvre.Langue.nom}
                    </Badge>
                  )}
                </div>
                
                <Button asChild size="sm" className="w-full group">
                  <Link
                    to={`/oeuvres/${oeuvre.id_oeuvre}`}
                    tabIndex={-1}
                    aria-label={`${t('sections.works.details', 'Détails')} : ${getTranslation(oeuvre.titre, lang)}`}
                  >
                    {t('sections.works.details')}
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
          <Link to="/oeuvres">
            {t('sections.works.exploreLibrary')}
            <Palette className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:rotate-12 transition-transform`} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default OeuvresDynamique;
