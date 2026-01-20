/**
 * Oeuvres.tsx - Page de listing des œuvres refactorisée
 * Avec lazy loading des images et composants séparés
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Badge } from '@/components/UI/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import {
  Search, Star, Eye, Heart, ArrowRight, RefreshCw, X,
  Book, Film, Music, Palette, FileText, Sparkles
} from 'lucide-react';

// Composants partagés
import {
  LazyImage,
  LoadingSkeleton,
  EmptyState
} from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Hook personnalisé
import { useOeuvres } from '@/hooks/useOeuvres';
import { useDebounce } from '@/hooks/useAdmin';

// Icônes par type
const TYPE_ICONS: Record<string, React.ElementType> = {
  livre: Book,
  litterature: Book,
  film: Film,
  cinema: Film,
  musique: Music,
  art: Palette,
  peinture: Palette,
  article: FileText,
  default: Sparkles
};

// Composant carte d'œuvre
interface OeuvreCardProps {
  oeuvre: any;
  onView: (id: number) => void;
  onFavorite?: (id: number) => void;
}

const OeuvreCard: React.FC<OeuvreCardProps> = ({ oeuvre, onView, onFavorite }) => {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  
  const typeCode = oeuvre.TypeOeuvre?.code?.toLowerCase() || oeuvre.type?.toLowerCase() || 'default';
  const TypeIcon = TYPE_ICONS[typeCode] || TYPE_ICONS.default;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onFavorite?.(oeuvre.id_oeuvre);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onView(oeuvre.id_oeuvre)}
    >
      {/* Image avec lazy loading */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <LazyImage
          src={oeuvre.image_principale || oeuvre.image_url || '/images/placeholder-oeuvre.png'}
          alt={oeuvre.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-oeuvre.png"
        />
        
        {/* Overlay au survol */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Badge type */}
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-full p-2">
          <TypeIcon className="h-4 w-4" />
        </div>

        {/* Bouton favori */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Actions au survol */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 text-white text-sm">
            {oeuvre.vues !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {oeuvre.vues}
              </span>
            )}
            {oeuvre.note_moyenne !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {oeuvre.note_moyenne.toFixed(1)}
              </span>
            )}
          </div>
          <Button size="sm" variant="secondary">
            {t('common.view', 'Voir')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {oeuvre.titre}
        </h3>
        
        {/* Auteur / Saiseur */}
        {(oeuvre.auteur || oeuvre.Saiseur) && (
          <p className="text-sm text-muted-foreground mb-2">
            {oeuvre.auteur || `${oeuvre.Saiseur?.prenom} ${oeuvre.Saiseur?.nom}`}
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {oeuvre.TypeOeuvre?.nom_type && (
            <Badge variant="secondary" className="text-xs">
              {oeuvre.TypeOeuvre.nom_type}
            </Badge>
          )}
          {oeuvre.Langue?.nom && (
            <Badge variant="outline" className="text-xs">
              {oeuvre.Langue.nom}
            </Badge>
          )}
        </div>

        {/* Prix */}
        {oeuvre.prix && (
          <div className="mt-3 pt-3 border-t">
            <span className="font-semibold text-primary">{oeuvre.prix} DZD</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Composant principal
const Oeuvres: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // États des filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [sortBy, setSortBy] = useState('recent');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Hook personnalisé
  const {
    filteredOeuvres: oeuvres,
    typesOeuvres,
    loading,
    error,
    stats,
    loadOeuvres
  } = useOeuvres();

  // Filtrage local supplémentaire
  const displayedOeuvres = React.useMemo(() => {
    let result = [...(oeuvres || [])];

    // Filtre par recherche
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter((o) =>
        o.titre?.toLowerCase().includes(search) ||
        o.description?.toLowerCase().includes(search) ||
        o.auteur?.toLowerCase().includes(search)
      );
    }

    // Filtre par type
    if (typeFilter !== 'tous') {
      result = result.filter((o) => 
        o.TypeOeuvre?.id_type_oeuvre?.toString() === typeFilter ||
        o.id_type_oeuvre?.toString() === typeFilter
      );
    }

    // Tri
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'popular':
        result.sort((a, b) => (b.vues || 0) - (a.vues || 0));
        break;
      case 'rated':
        result.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
        break;
      case 'title':
        result.sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
        break;
    }

    return result;
  }, [oeuvres, debouncedSearch, typeFilter, sortBy]);

  // Navigation vers détail
  const handleViewOeuvre = useCallback((id: number) => {
    navigate(`/oeuvres/${id}`);
  }, [navigate]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('tous');
    setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'tous' || sortBy !== 'recent';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">
            {t('works.title', 'Œuvres culturelles')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('works.subtitle', 'Explorez la richesse du patrimoine culturel algérien')}
          </p>
        </div>

        {/* Stats rapides */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total || 0}</p>
              <p className="text-sm text-muted-foreground">{t('works.stats.total', 'Œuvres')}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.nouveautes || 0}</p>
              <p className="text-sm text-muted-foreground">{t('works.stats.new', 'Nouveautés')}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{typesOeuvres?.length || 0}</p>
              <p className="text-sm text-muted-foreground">{t('works.stats.types', 'Types')}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.classiques || 0}</p>
              <p className="text-sm text-muted-foreground">{t('works.stats.classics', 'Classiques')}</p>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('works.searchPlaceholder', 'Rechercher une œuvre...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtre type */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('works.filterByType', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">{t('common.all', 'Tous')}</SelectItem>
                  {typesOeuvres?.map((type: any) => (
                    <SelectItem key={type.id_type_oeuvre} value={type.id_type_oeuvre.toString()}>
                      {type.nom_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tri */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{t('works.sort.recent', 'Plus récents')}</SelectItem>
                  <SelectItem value="popular">{t('works.sort.popular', 'Plus vus')}</SelectItem>
                  <SelectItem value="rated">{t('works.sort.rated', 'Mieux notés')}</SelectItem>
                  <SelectItem value="title">{t('works.sort.title', 'Titre A-Z')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Boutons */}
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={loadOeuvres} aria-label={t('common.refresh', 'Actualiser')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu */}
        <ErrorBoundary>
          {loading ? (
            <LoadingSkeleton type="card" count={8} />
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadOeuvres}>{t('common.retry', 'Réessayer')}</Button>
            </Card>
          ) : displayedOeuvres.length === 0 ? (
            <EmptyState
              type="works"
              title={t('works.noResults', 'Aucune œuvre trouvée')}
              description={t('works.noResultsDesc', 'Essayez de modifier vos critères de recherche')}
              action={hasActiveFilters ? {
                label: t('common.resetFilters', 'Réinitialiser'),
                onClick: resetFilters
              } : undefined}
            />
          ) : (
            <>
              {/* Stats résultats */}
              <div className="mb-6 text-sm text-muted-foreground">
                {displayedOeuvres.length} œuvre(s) trouvée(s)
              </div>

              {/* Grille des œuvres */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedOeuvres.map((oeuvre) => (
                  <OeuvreCard
                    key={oeuvre.id_oeuvre}
                    oeuvre={oeuvre}
                    onView={handleViewOeuvre}
                  />
                ))}
              </div>
            </>
          )}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default Oeuvres;
