/**
 * OeuvresDynamique - Section œuvres avec lazy loading des images
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Skeleton } from '@/components/UI/skeleton';
import { Palette, Eye, Download, ArrowRight } from 'lucide-react';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { oeuvreService } from '@/services/oeuvre.service';
import { Oeuvre } from '@/types';
import ErrorMessage from './ErrorMessage';

const OeuvresDynamique: React.FC = () => {
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
                    loading="lazy"
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
                    <Badge variant="outline">
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

export default OeuvresDynamique;
