import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Skeleton } from '@/components/UI/skeleton';
import {
  MapPin, Clock, Star, QrCode, Compass, Building2, Landmark,
  Trees, Search, RefreshCw, AlertCircle, Eye
} from 'lucide-react';
import { Input } from '@/components/UI/input';
import { patrimoineService } from '@/services/patrimoine.service';
import { useToast } from '@/hooks/use-toast';

// Lazy loading pour CartePatrimoine
const CartePatrimoine = lazy(() => import('@/components/CartePatrimoine'));

// Helper pour traduire les champs multilingues
const translate = (value: string | { fr?: string; ar?: string; en?: string } | null | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang as keyof typeof value] || value.fr || value.ar || value.en || '';
};

// Composant de fallback pour la carte
const MapSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-[300px] w-full rounded-lg" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  </div>
);

// Skeleton pour les cartes de sites
const SiteCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-video w-full" />
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10" />
      </div>
    </CardContent>
  </Card>
);

// ⚡ Types de patrimoine
type TypePatrimoine = 'ville_village' | 'monument' | 'musee' | 'site_archeologique' | 'site_naturel' | 'edifice_religieux' | 'palais_forteresse' | 'autre';

interface TypePatrimoineOption {
  value: string;
  label: string;
  count: number;
}

interface SitePatrimoine {
  id_lieu: number;
  nom: string | { fr?: string; ar?: string; en?: string };
  adresse: string | { fr?: string; ar?: string; en?: string };
  latitude: number;
  longitude: number;
  typeLieu: string;
  typePatrimoine?: TypePatrimoine; // ⚡ Nouveau champ
  DetailLieu?: {
    description?: string | { fr?: string; ar?: string; en?: string };
    horaires?: string | { fr?: string; ar?: string; en?: string };
    noteMoyenne?: number;
    Monuments?: Array<{ id: number; nom: string | object; type: string }>;
    Vestiges?: Array<{ id: number; nom: string | object; type: string }>;
  };
  medias?: Array<{ id: number; url: string; type: string; description?: string | object }>;
  services?: Array<{ id: number; nom: string | object; disponible: boolean }>;
  wilaya?: { id_wilaya: number; nom: string };
  commune?: { id_commune: number; nom: string };
  daira?: { id_daira: number; nom: string };
  monuments?: Array<{ id: number; nom: string | object; type: string }>;
  vestiges?: Array<{ id: number; nom: string | object; type: string }>;
  qrcodes?: Array<{ id_qr_code: number; code_unique: string; url_destination: string }>;
}

const Patrimoine = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = i18n.language || 'fr';

  const [sites, setSites] = useState<SitePatrimoine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [typesPatrimoine, setTypesPatrimoine] = useState<TypePatrimoineOption[]>([]);

  // ⚡ Charger les types de patrimoine disponibles
  const loadTypesPatrimoine = async () => {
    try {
      const response = await patrimoineService.getTypesPatrimoine();
      if (response.success && response.data) {
        setTypesPatrimoine(response.data);
      }
    } catch (err) {
      console.error('Erreur chargement types:', err);
    }
  };

  // Charger les sites patrimoniaux
  const loadSites = async (typePatrimoine?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patrimoineService.getSitesPopulaires(12, typePatrimoine || undefined);
      if (response.success && response.data) {
        setSites(response.data as unknown as SitePatrimoine[]);
      } else {
        setError('Impossible de charger les sites patrimoniaux');
      }
    } catch (err) {
      console.error('Erreur chargement sites:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypesPatrimoine();
    loadSites();
  }, []);

  // ⚡ Recharger quand le filtre change
  useEffect(() => {
    loadSites(filterType || undefined);
  }, [filterType]);

  // Filtrer les sites (recherche locale uniquement, le type est filtré côté serveur)
  const filteredSites = sites.filter(site => {
    const nom = translate(site.nom, lang);
    const matchSearch = !searchQuery ||
      nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.wilaya?.nom?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  // Obtenir l'image principale d'un site
  const getMainImage = (site: SitePatrimoine): string => {
    if (site.medias && site.medias.length > 0) {
      const imageMedia = site.medias.find(m => m.type === 'image');
      if (imageMedia?.url) return imageMedia.url;
    }
    // Image par défaut selon le type
    return 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80';
  };

  // ⚡ Icônes pour les types de patrimoine
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      ville_village: Compass,
      monument: Landmark,
      musee: Building2,
      site_archeologique: Building2,
      site_naturel: Trees,
      edifice_religieux: Landmark,
      palais_forteresse: Building2,
      autre: Compass
    };
    return icons[type] || Compass;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            {t('sections.heritage.title', 'Patrimoine Culturel')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('sections.heritage.subtitle', 'Découvrez les trésors du patrimoine algérien')}
          </p>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sections.heritage.search', 'Rechercher un site...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => loadSites(filterType || undefined)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Actualiser')}
            </Button>
          </div>

          {/* ⚡ Filtres par type de patrimoine (dynamiques depuis l'API) */}
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Bouton "Tous" */}
            <Button
              variant={filterType === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(null)}
            >
              <Compass className="h-4 w-4 mr-2" />
              {t('patrimoine.filters.all', 'Tous')}
            </Button>

            {/* Types de patrimoine depuis l'API */}
            {typesPatrimoine.map(typeOption => {
              const Icon = getTypeIcon(typeOption.value);
              return (
                <Button
                  key={typeOption.value}
                  variant={filterType === typeOption.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(typeOption.value)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {typeOption.label}
                  {typeOption.count > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {typeOption.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold">{t('common.error', 'Erreur')}</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={loadSites} className="ml-auto">
                {t('common.retry', 'Réessayer')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Carte interactive avec Suspense */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Compass className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold font-serif">
              {t('sections.heritage.map.explore', 'Explorer la carte')}
            </h2>
          </div>
          <Suspense fallback={<MapSkeleton />}>
            <CartePatrimoine />
          </Suspense>
        </div>

        {/* Grille des sites */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif">
              {t('sections.heritage.otherSites', 'Sites patrimoniaux')}
            </h2>
            <Badge variant="secondary">
              {filteredSites.length} {t('common.results', 'résultats')}
            </Badge>
          </div>

          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <SiteCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {t('sections.heritage.noResults', 'Aucun site trouvé')}
                </h3>
                <p className="text-muted-foreground">
                  {t('sections.heritage.tryDifferentSearch', 'Essayez une autre recherche ou réinitialisez les filtres')}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setFilterType(null); }}>
                  {t('common.reset', 'Réinitialiser')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => (
                <Card key={site.id_lieu} className="overflow-hidden hover-lift group">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={getMainImage(site)}
                      alt={translate(site.nom, lang)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {site.DetailLieu?.noteMoyenne && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500/90">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {site.DetailLieu.noteMoyenne.toFixed(1)}
                      </Badge>
                    )}
                    {site.qrcodes && site.qrcodes.length > 0 && (
                      <Badge variant="secondary" className="absolute top-2 left-2">
                        <QrCode className="h-3 w-3 mr-1" />
                        QR
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-serif line-clamp-1">
                          {translate(site.nom, lang)}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {site.wilaya?.nom || site.commune?.nom || translate(site.adresse, lang)}
                          </span>
                        </div>
                      </div>
                      {/* ⚡ Badge du type de patrimoine */}
                      <Badge variant="outline">
                        {typesPatrimoine.find(t => t.value === site.typePatrimoine)?.label || site.typeLieu || 'Site'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {translate(site.DetailLieu?.description, lang) || t('sections.heritage.noDescription', 'Description à venir...')}
                    </p>

                    {/* Stats rapides */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {site.monuments && site.monuments.length > 0 && (
                        <Badge variant="secondary">
                          <Landmark className="h-3 w-3 mr-1" />
                          {site.monuments.length} monuments
                        </Badge>
                      )}
                      {site.vestiges && site.vestiges.length > 0 && (
                        <Badge variant="secondary">
                          <Building2 className="h-3 w-3 mr-1" />
                          {site.vestiges.length} vestiges
                        </Badge>
                      )}
                      {site.services && site.services.filter(s => s.disponible).length > 0 && (
                        <Badge variant="secondary">
                          {site.services.filter(s => s.disponible).length} services
                        </Badge>
                      )}
                    </div>

                    {/* Horaires si disponibles */}
                    {site.DetailLieu?.horaires && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{translate(site.DetailLieu.horaires, lang)}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link to={`/patrimoine/${site.id_lieu}`} className="flex-1">
                        <Button className="w-full btn-hover">
                          <Eye className="h-4 w-4 mr-2" />
                          {t('sections.heritage.discover', 'Découvrir')}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          toast({
                            title: t('qrcode.generating', 'Génération du QR Code'),
                            description: t('qrcode.pleaseWait', 'Veuillez patienter...')
                          });
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section informative */}
        <Card className="text-center p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="space-y-4">
            <MapPin className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-2xl font-semibold font-serif">
              {t('sections.heritage.planVisit.title', 'Planifiez votre visite')}
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('sections.heritage.planVisit.description', 'Créez un parcours personnalisé à travers les sites patrimoniaux de l\'Algérie')}
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/parcours">
                <Button size="lg">
                  {t('sections.heritage.planVisit.start', 'Créer un parcours')}
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                {t('sections.heritage.planVisit.guide', 'Guide pratique')}
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Patrimoine;
