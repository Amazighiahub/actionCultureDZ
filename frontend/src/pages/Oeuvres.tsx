/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Progress } from '@/components/UI/progress';
import { Input } from '@/components/UI/input';
import { 
  Book, 
  Calendar, 
  DollarSign, 
  Eye, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  Activity,
  Zap,
  Gauge,
  Languages,
  Tag,
  TrendingUp,
  Star,
  Sparkles,
  Heart,
  Film,
  Music,
  Palette,
  FileText,
  History,
  Search,
  X,
  BookOpen
} from 'lucide-react';
import { httpClient } from '@/services/httpClient';
import { API_BASE_URL } from '@/config/api';
import type { Oeuvre, StatutOeuvre } from '@/types/models/oeuvre.types';
import { useOeuvres } from '@/hooks/useOeuvres';

// Hook pour monitorer le rate limit
function useRateLimitMonitor() {
  const [stats, setStats] = useState<any>(null);

  React.useEffect(() => {
    const updateStats = () => {
      const queueStats = (httpClient as any).getQueueStats?.();
      setStats(queueStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

const Oeuvres = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rateLimitStats = useRateLimitMonitor();
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);
  
  // Utiliser le hook personnalisé
  const {
    filteredOeuvres,
    loading,
    error,
    typesOeuvres,
    selectedFilter,
    selectedType,
    searchQuery,
    setSelectedFilter,
    setSelectedType,
    setSearchQuery,
    loadOeuvres,
    stats
  } = useOeuvres();

  // Fonction pour formater les noms de types
  const formatTypeNom = (nom: string): string => {
    if (!nom) return t('categories.workTypes.unknown');
    
    const mapping: Record<string, string> = {
      'art': 'art',
      'arts': 'art',
      'oeuvre d\'art': 'artwork',
      'oeuvres d\'art': 'artworks',
      'livre': 'literature',
      'livres': 'literature',
      'littérature': 'literature',
      'film': 'cinema',
      'films': 'cinema',
      'cinéma': 'cinema',
      'musique': 'music',
      'album': 'music',
      'album musical': 'musicalAlbum',
      'albums musicaux': 'musicalAlbums',
      'article': 'articles',
      'articles': 'articles',
      'article scientifique': 'scientificArticle',
      'articles scientifiques': 'scientificArticles'
    };
    
    const nomLower = nom.toLowerCase().trim();
    if (mapping[nomLower]) {
      return t(`categories.workTypes.${mapping[nomLower]}`);
    }
    
    return nom.charAt(0).toUpperCase() + nom.slice(1);
  };

  // Fonction pour obtenir l'icône d'un type
  const getTypeIcon = (nom: string) => {
    const nomLower = nom.toLowerCase();
    if (nomLower.includes('littérature') || nomLower.includes('livre')) return Book;
    if (nomLower.includes('cinéma') || nomLower.includes('film')) return Film;
    if (nomLower.includes('musique') || nomLower.includes('album')) return Music;
    if (nomLower.includes('œuvres d\'art') || nomLower === 'art') return Palette;
    if (nomLower.includes('article')) return FileText;
    return Book;
  };

  const getTypeNom = (oeuvre: Oeuvre) => {
    const typeId = oeuvre.id_type_oeuvre || oeuvre.TypeOeuvre?.id_type_oeuvre;
    const type = typesOeuvres.find(t => {
      return t.id_type_oeuvre === typeId || t.id_type_oeuvre?.toString() === typeId?.toString();
    });
    const nomType = type?.nom_type || oeuvre.TypeOeuvre?.nom_type || 'Œuvre';
    
    return formatTypeNom(nomType);
  };

  const formatPrix = (oeuvre: Oeuvre) => {
    const prix = oeuvre.prix || 0;
    if (!prix || prix === 0) return t('price.free');
    return t('price.fixed', { price: prix });
  };

  const getTags = (oeuvre: Oeuvre) => {
    if (oeuvre.Tags && Array.isArray(oeuvre.Tags)) {
      return oeuvre.Tags.map((t) => t.nom);
    }
    return [];
  };

  const getContributeurs = (oeuvre: Oeuvre) => {
    const contributeurs = [];
    
    if (oeuvre.OeuvreIntervenants && Array.isArray(oeuvre.OeuvreIntervenants)) {
      contributeurs.push(...oeuvre.OeuvreIntervenants
        .filter((oi) => oi.Intervenant)
        .map((oi) => 
          oi.Intervenant?.nom || `${oi.Intervenant?.nom} ${oi.Intervenant?.prenom}`
        ));
    }
    
    if (oeuvre.Users && Array.isArray(oeuvre.Users)) {
      contributeurs.push(...oeuvre.Users.map((u) => 
        u.nom || `${u.nom} ${u.prenom}`
      ));
    }
    
    return contributeurs.filter(Boolean).join(', ');
  };

  const buildImageUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    if (import.meta.env.DEV) {
      return path;
    }
    
    const assetsUrl = import.meta.env.VITE_ASSETS_URL;
    const apiUrl = import.meta.env.VITE_API_URL || API_BASE_URL || 'http://localhost:3000';
    
    let baseUrl = assetsUrl || apiUrl.replace('/api', '');
    
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    let cleanPath = path;
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    
    return `${baseUrl}${cleanPath}`;
  };

  const handleOeuvreDetails = (oeuvreId: number, typeOeuvreId?: number) => {
    if (typeOeuvreId === 4 || typeOeuvreId === 5) {
      navigate(`/articles/${oeuvreId}`);
    } else {
      navigate(`/oeuvres/${oeuvreId}`);
    }
  };

  // Indicateur de santé du rate limit
  const getRateLimitHealth = () => {
    if (!rateLimitStats) return { status: 'unknown', color: 'gray' };
    
    const { requestsLastMinute, rateLimitHits, currentDelay } = rateLimitStats;
    
    if (rateLimitHits > 0) {
      return { status: 'critical', color: 'red', message: t('sections.works.rateLimit.health.critical') };
    }
    
    if (requestsLastMinute > 25) {
      return { status: 'warning', color: 'orange', message: t('sections.works.rateLimit.health.warning') };
    }
    
    if (currentDelay > 500) {
      return { status: 'slow', color: 'yellow', message: t('sections.works.rateLimit.health.slow') };
    }
    
    return { status: 'good', color: 'green', message: t('sections.works.rateLimit.health.good') };
  };

  const health = getRateLimitHealth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('sections.works.loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Indicateur de rate limit en développement */}
      {process.env.NODE_ENV === 'development' && rateLimitStats && (
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg"
            onClick={() => setShowRateLimitInfo(!showRateLimitInfo)}
          >
            <Activity className={`h-4 w-4 mr-2 text-${health.color}-500`} />
            {t('sections.works.rateLimit.title')}
          </Button>
          
          {showRateLimitInfo && (
            <Card className="absolute bottom-full left-0 mb-2 w-64">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  {t('sections.works.rateLimit.status')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('sections.works.rateLimit.queue')}</span>
                  <span className="font-mono">{rateLimitStats.queueSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('sections.works.rateLimit.cache')}</span>
                  <span className="font-mono">{rateLimitStats.cacheSize} {t('sections.works.rateLimit.entries')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('sections.works.rateLimit.requestsPerMinute')}</span>
                  <span className="font-mono">{rateLimitStats.requestsLastMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('sections.works.rateLimit.currentDelay')}</span>
                  <span className="font-mono">{rateLimitStats.currentDelay}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('sections.works.rateLimit.hits')}</span>
                  <span className="font-mono">{rateLimitStats.rateLimitHits}</span>
                </div>
                <Progress 
                  value={(rateLimitStats.requestsLastMinute / 30) * 100} 
                  className="h-2"
                />
                <div className={`text-xs text-${health.color}-600 font-medium`}>
                  {health.message}
                </div>
                <div className="pt-2 space-y-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      (httpClient as any).clearCache?.();
                      loadOeuvres();
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {t('sections.works.rateLimit.clearCache')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const mode = rateLimitStats.currentDelay > 500 ? 'normal' : 'conservative';
                      if (mode === 'normal') {
                        (httpClient as any).useNormalMode?.();
                      } else {
                        (httpClient as any).useConservativeMode?.();
                      }
                    }}
                  >
                    {rateLimitStats.currentDelay > 500 ? 
                      `🚶 ${t('sections.works.rateLimit.normalMode')}` : 
                      `🐢 ${t('sections.works.rateLimit.slowMode')}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            {t('sections.works.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('sections.works.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Book className="h-4 w-4" />
              {t('sections.works.stats.total', { count: stats.total })}
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              {t('sections.works.stats.new', { count: stats.nouveautes })}
            </span>
            <span className="flex items-center gap-1">
              <History className="h-4 w-4" />
              {t('sections.works.stats.classics', { count: stats.classiques })}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {t('sections.works.stats.recent', { count: stats.recentes })}
            </span>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('sections.works.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant={error.includes('cache') ? 'default' : 'destructive'} className="max-w-2xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {!error.includes('cache') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-4"
                  onClick={loadOeuvres}
                >
                  {t('common.retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filtres éditoriaux */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              variant={selectedFilter === 'tous' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedFilter('tous')}
              className="transition-all hover:scale-105"
            >
              {t('sections.works.filters.all')}
            </Button>
            <Button 
              variant={selectedFilter === 'nouveautes' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedFilter('nouveautes')}
              className="transition-all hover:scale-105 relative overflow-hidden"
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              {t('sections.works.filters.new')}
              {selectedFilter !== 'nouveautes' && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </Button>
            <Button 
              variant={selectedFilter === 'une' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedFilter('une')}
              className="transition-all hover:scale-105"
            >
              <Star className="h-3 w-3 mr-1.5" />
              {t('sections.works.filters.featured')}
            </Button>
            <Button 
              variant={selectedFilter === 'populaires' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedFilter('populaires')}
              className="transition-all hover:scale-105"
              title={t('sections.works.info.classicsDesc')}
            >
              <TrendingUp className="h-3 w-3 mr-1.5" />
              {t('sections.works.filters.popular')}
            </Button>
            <Button 
              variant={selectedFilter === 'recommandees' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedFilter('recommandees')}
              className="transition-all hover:scale-105"
            >
              <Heart className="h-3 w-3 mr-1.5" />
              {t('sections.works.filters.recommended')}
            </Button>
          </div>
          {selectedFilter === 'populaires' && (
            <p className="text-xs text-center text-muted-foreground max-w-2xl mx-auto">
              <History className="h-3 w-3 inline mr-1" />
              {t('sections.works.info.classicsDesc')}
            </p>
          )}
        </div>

        {/* Filtres par type */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          <Button 
            variant={selectedType === 'tous' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedType('tous')}
          >
            {t('sections.works.filters.allTypes')}
            <Badge variant="secondary" className="ml-2 text-xs">
              {filteredOeuvres.length}
            </Badge>
          </Button>
          {Array.isArray(typesOeuvres) && typesOeuvres.length > 0 && typesOeuvres
            .filter(type => type.id_type_oeuvre && type.nom_type)
            .sort((a, b) => {
              const ordre = ['Littérature', 'Cinéma', 'Musique', 'Œuvres d\'art', 'Articles'];
              const nomA = formatTypeNom(a.nom_type);
              const nomB = formatTypeNom(b.nom_type);
              const indexA = ordre.indexOf(nomA);
              const indexB = ordre.indexOf(nomB);
              
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return nomA.localeCompare(nomB);
            })
            .map(type => {
              const typeId = type.id_type_oeuvre;
              const typeNom = formatTypeNom(type.nom_type);
              const IconComponent = getTypeIcon(typeNom);
              
              // Compter les œuvres de ce type dans les œuvres filtrées
              const count = filteredOeuvres.filter(o => {
                const oTypeId = o.id_type_oeuvre || o.TypeOeuvre?.id_type_oeuvre;
                return oTypeId?.toString() === typeId.toString();
              }).length;
              
              return (
                <Button 
                  key={typeId}
                  variant={selectedType === typeId.toString() ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedType(typeId.toString())}
                  className="transition-all hover:scale-105"
                >
                  <IconComponent className="h-3 w-3 mr-1.5" />
                  {typeNom}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })
            .filter(Boolean)}
        </div>

        {/* Liste des œuvres */}
        {selectedFilter !== 'tous' && filteredOeuvres.length > 0 && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {selectedFilter === 'nouveautes' && t('sections.works.info.newCount', { count: filteredOeuvres.length })}
              {selectedFilter === 'une' && t('sections.works.info.featuredCount', { count: filteredOeuvres.length })}
              {selectedFilter === 'populaires' && t('sections.works.info.popularCount', { count: filteredOeuvres.length })}
              {selectedFilter === 'recommandees' && t('sections.works.info.recommendedCount', { count: filteredOeuvres.length })}
            </p>
          </div>
        )}
        
        {searchQuery && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {t('sections.works.results.count', { count: filteredOeuvres.length, query: searchQuery })}
            </p>
          </div>
        )}
        
        {filteredOeuvres.length === 0 ? (
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription>
              {searchQuery && t('sections.works.empty.noSearch', { query: searchQuery })}
              {!searchQuery && selectedFilter === 'nouveautes' && t('sections.works.empty.noNew')}
              {!searchQuery && selectedFilter === 'une' && t('sections.works.empty.noFeatured')}
              {!searchQuery && selectedFilter === 'populaires' && t('sections.works.empty.noPopular')}
              {!searchQuery && selectedFilter === 'recommandees' && t('sections.works.empty.noRecommended')}
              {!searchQuery && selectedFilter === 'tous' && selectedType !== 'tous' && t('sections.works.empty.noType')}
              {!searchQuery && selectedFilter === 'tous' && selectedType === 'tous' && t('sections.works.empty.noWorks')}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOeuvres.map((oeuvre) => {
              const oeuvreId = oeuvre.id_oeuvre;
              const titre = oeuvre.titre || t('sections.works.noTitle');
              
              // Récupérer l'image depuis les médias
              let imageUrl = null;
              if (oeuvre.Media && Array.isArray(oeuvre.Media) && oeuvre.Media.length > 0) {
                const sortedMedia = [...oeuvre.Media].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
                const imageMedia = sortedMedia.find(m => 
                  m.type_media === 'image' && m.visible_public === true
                ) || sortedMedia.find(m => 
                  m.type_media === 'image'
                ) || sortedMedia[0];
                
                if (imageMedia) {
                  const mediaPath = imageMedia.thumbnail_url || imageMedia.url;
                  imageUrl = import.meta.env.DEV ? mediaPath : buildImageUrl(mediaPath);
                }
              }
              
              const typeNom = getTypeNom(oeuvre);
              const langueNom = oeuvre.Langue?.nom || '';
              const contributeurs = getContributeurs(oeuvre);
              const tags = getTags(oeuvre);
              const noteMoyenne = (oeuvre.CritiquesEvaluations && oeuvre.CritiquesEvaluations.length > 0)
                ? oeuvre.CritiquesEvaluations.reduce((acc, c) => acc + (c.note || 0), 0) / oeuvre.CritiquesEvaluations.length
                : 0;
              const nombreVues = oeuvre.CritiquesEvaluations?.length || 0;
              
              // Déterminer les badges
              const isNew = (() => {
                const dateCreation = new Date(oeuvre.date_creation);
                const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return dateCreation >= oneMonthAgo;
              })();
              
              const isClassic = (() => {
                if (!oeuvre.annee_creation) return false;
                const anneeActuelle = new Date().getFullYear();
                const age = anneeActuelle - oeuvre.annee_creation;
                return age > 10;
              })();
              
              const isPopular = (() => {
                if (!oeuvre.annee_creation) return false;
                const anneeActuelle = new Date().getFullYear();
                const age = anneeActuelle - oeuvre.annee_creation;
                return age <= 5;
              })();
              
              const PlaceholderIcon = getTypeIcon(typeNom);
              const typeOeuvreId = oeuvre.id_type_oeuvre || oeuvre.TypeOeuvre?.id_type_oeuvre;
              return (
                <Card 
                  key={oeuvreId} 
                  className="overflow-hidden hover-lift group h-full flex flex-col relative cursor-pointer"
                  onClick={() => handleOeuvreDetails(oeuvreId, typeOeuvreId)}
                >
                  {/* Badge unique */}
                  {(isNew || isClassic || isPopular) && (
                    <div className="absolute top-2 left-2 z-10">
                      {isNew && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                          {t('sections.works.badges.new')}
                        </Badge>
                      )}
                      {!isNew && isClassic && (
                        <Badge className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                          <History className="h-3 w-3 mr-1" />
                          {t('sections.works.badges.classic')}
                        </Badge>
                      )}
                      {!isNew && !isClassic && isPopular && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {t('sections.works.badges.popular')}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className="aspect-[4/3] overflow-hidden bg-muted relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOeuvreDetails(oeuvreId, typeOeuvreId);
                    }}
                  >
                    {imageUrl ? (
                      <>
                        <img 
                          src={imageUrl} 
                          alt={titre}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const originalSrc = target.src;
                            
                            if (originalSrc.includes('/uploads/') && !target.dataset.fallbackTried) {
                              target.dataset.fallbackTried = 'true';
                              
                              if (!originalSrc.includes('/api/uploads/')) {
                                const apiUrl = originalSrc.replace('/uploads/', '/api/uploads/');
                                target.src = apiUrl;
                                return;
                              }
                              
                              if (originalSrc.includes('/api/uploads/')) {
                                const noApiUrl = originalSrc.replace('/api/uploads/', '/uploads/');
                                target.src = noApiUrl;
                                return;
                              }
                            }
                            
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder = parent.querySelector('.placeholder-icon');
                              if (placeholder) {
                                placeholder.classList.remove('hidden');
                              }
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : null}
                    <div className={`${imageUrl ? 'hidden' : ''} placeholder-icon w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10`}>
                      <PlaceholderIcon className="h-10 w-10 text-primary/40" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle 
                          className="font-serif text-base leading-tight line-clamp-2 flex-1 hover:text-primary transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOeuvreDetails(oeuvreId, typeOeuvreId);
                          }}
                        >
                          {titre}
                        </CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {typeNom}
                        </Badge>
                        {langueNom && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {langueNom}
                          </Badge>
                        )}
                      </div>
                      {contributeurs && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{contributeurs}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 flex-1 flex flex-col">
                      {oeuvre.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {oeuvre.description}
                        </p>
                      )}
                      
                      <div className="space-y-1.5 text-xs flex-1">
                        {oeuvre.annee_creation && (
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className={isClassic ? 'font-medium text-amber-600' : isPopular ? 'font-medium text-green-600' : ''}>
                              {oeuvre.annee_creation}
                              {isClassic && ` • ${t('sections.works.ageLabels.classic')}`}
                              {isPopular && ` • ${t('sections.works.ageLabels.recent')}`}
                            </span>
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div className="flex items-center space-x-1.5">
                            <Tag className="h-3 w-3 text-primary flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 2).map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs py-0 px-1.5 h-5">
                                  {tag}
                                </Badge>
                              ))}
                              {tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                                  +{tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center space-x-1.5">
                          <DollarSign className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="font-medium text-xs">{formatPrix(oeuvre)}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          {noteMoyenne > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {noteMoyenne.toFixed(1)}
                            </span>
                          )}
                          {nombreVues > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {nombreVues}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full btn-hover group h-8 text-xs mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOeuvreDetails(oeuvreId, typeOeuvreId);
                        }}
                      >
                        {(oeuvre.id_type_oeuvre === 4 || oeuvre.id_type_oeuvre === 5) ? (
                          <>
                            <BookOpen className="h-3 w-3 mr-1.5" />
                            {t('sections.works.actions.readArticle')}
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1.5" />
                            {t('sections.works.actions.view')}
                          </>
                        )}
                        <ArrowRight className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Oeuvres;