/**
 * Artisanat.tsx - Page de listing des produits artisanaux
 * Avec lazy loading des images et composants partagés
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { favoriService } from '@/services/favori.service';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Search, Star, Eye, Heart, ArrowRight, RefreshCw, X,
  Palette, Hammer, Package, ShoppingBag
} from 'lucide-react';

// Composants partagés
import {
  LazyImage,
  LoadingSkeleton,
  EmptyState
} from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import SEOHead from '@/components/SEOHead';

// Hook personnalisé
import { useArtisanat } from '@/hooks/useArtisanat';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getLocalizedText } from '@/utils/getLocalizedText';

// Composant carte d'artisanat
interface ArtisanatCardProps {
  artisanat: Record<string, unknown>;
  onView: (id: number) => void;
  onFavorite?: (id: number) => void;
}

const ArtisanatCard: React.FC<ArtisanatCardProps> = React.memo(({ artisanat, onView }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Extraire les données de l'artisanat (peut venir de Oeuvre ou directement)
  const rawTitre = artisanat.Oeuvre?.titre || artisanat.nom || artisanat.titre || 'Sans titre';
  const titre = typeof rawTitre === 'object' && rawTitre !== null ? (rawTitre as Record<string, string>).fr || Object.values(rawTitre)[0] || 'Sans titre' : rawTitre;
  const imageUrl = artisanat.Oeuvre?.Media?.[0]?.url ||
                   artisanat.medias?.[0]?.url ||
                   artisanat.image_url ||
                   '/images/placeholder-artisanat.svg';
  const artisan = artisanat.Oeuvre?.Saiseur || artisanat.artisan;
  const materiau = getLocalizedText(artisanat.Materiau?.nom) || '';
  const technique = getLocalizedText(artisanat.Technique?.nom) || '';
  const prix = artisanat.prix || artisanat.prix_min;
  const id = artisanat.id_artisanat || artisanat.id;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (favLoading) return;
    setFavLoading(true);
    try {
      const result = await favoriService.toggle('artisanat', id as number);
      if (result.success) {
        const added = result.data?.added ?? !isFavorite;
        setIsFavorite(added);
        toast({
          title: added ? t('favoris.added', 'Ajouté aux favoris') : t('favoris.removed', 'Retiré des favoris'),
        });
      }
    } catch {
      toast({ title: t('common.error', 'Erreur'), variant: 'destructive' });
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onView(id)}
    >
      {/* Image avec lazy loading */}
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={imageUrl}
          alt={titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-artisanat.svg"
        />

        {/* Overlay au survol */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badge matériau */}
        {materiau && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-medium flex items-center gap-1">
              <Palette className="h-3 w-3" />
              {materiau}
            </span>
          </div>
        )}

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
            {artisanat.statistiques?.nombre_vues !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {artisanat.statistiques.nombre_vues}
              </span>
            )}
            {artisanat.note_moyenne != null && Number(artisanat.note_moyenne) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {Number(artisanat.note_moyenne).toFixed(1)}
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
          {titre}
        </h3>

        {/* Artisan */}
        {artisan && (
          <p className="text-sm text-muted-foreground mb-2">
            {getLocalizedText(artisan.prenom)} {getLocalizedText(artisan.nom)}
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {technique && (
            <Badge variant="secondary" className="text-xs">
              <Hammer className="h-3 w-3 mr-1" />
              {technique}
            </Badge>
          )}
        </div>

        {/* Prix */}
        {prix && (
          <div className="mt-3 pt-3 border-t">
            <span className="font-semibold text-primary">{prix} DZD</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Composant principal
const Artisanat: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // États des filtres locaux
  const [searchQuery, setSearchQueryLocal] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Hook personnalisé
  const {
    filteredArtisanats: artisanats,
    materiaux,
    techniques,
    loading,
    error,
    stats,
    loadArtisanats,
    selectedMateriau,
    selectedTechnique,
    sortBy,
    setSelectedMateriau,
    setSelectedTechnique,
    setSortBy,
    setSearchQuery
  } = useArtisanat();

  // Mettre à jour la recherche dans le hook
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Filtrage local supplémentaire
  const displayedArtisanats = useMemo(() => {
    return artisanats;
  }, [artisanats]);

  // Navigation vers détail
  const handleViewArtisanat = useCallback((id: number) => {
    navigate(`/artisanat/${id}`);
  }, [navigate]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchQueryLocal('');
    setSelectedMateriau('tous');
    setSelectedTechnique('tous');
    setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || selectedMateriau !== 'tous' || selectedTechnique !== 'tous' || sortBy !== 'recent';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('artisanat.title', 'Artisanat Algérien')}
        description={t('artisanat.subtitle', 'Découvrez les métiers d\'art et les créations artisanales traditionnelles d\'Algérie — poterie, tapis, bijoux, cuir.')}
        type="website"
        keywords={['artisanat algérien', 'artisanat traditionnel', 'poterie Algérie', 'tapis algérien', 'bijoux kabyles', 'cuir', 'fait main', 'artisan']}
      />
      <Header />

      <main className="container py-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">
            {t('artisanat.title', 'Artisanat Algérien')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('artisanat.subtitle', 'Découvrez les métiers d\'art et les créations artisanales traditionnelles d\'Algérie')}
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.total_produits || displayedArtisanats.length}</p>
            <p className="text-sm text-muted-foreground">{t('artisanat.stats.products', 'Produits')}</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{materiaux.length}</p>
            <p className="text-sm text-muted-foreground">{t('artisanat.stats.materials', 'Matériaux')}</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Hammer className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{techniques.length}</p>
            <p className="text-sm text-muted-foreground">{t('artisanat.stats.techniques', 'Techniques')}</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.total_artisans || 0}</p>
            <p className="text-sm text-muted-foreground">{t('artisanat.stats.artisans', 'Artisans')}</p>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('artisanat.searchPlaceholder', 'Rechercher un produit artisanal...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQueryLocal(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtre matériau */}
              <Select value={selectedMateriau} onValueChange={setSelectedMateriau}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('artisanat.filterByMaterial', 'Matériau')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">{t('common.all', 'Tous')}</SelectItem>
                  {materiaux.map((materiau) => (
                    <SelectItem key={materiau.id_materiau} value={materiau.id_materiau.toString()}>
                      {materiau.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre technique */}
              <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('artisanat.filterByTechnique', 'Technique')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">{t('common.all', 'Toutes')}</SelectItem>
                  {techniques.map((technique) => (
                    <SelectItem key={technique.id_technique} value={technique.id_technique.toString()}>
                      {technique.nom}
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
                  <SelectItem value="recent">{t('artisanat.sort.recent', 'Plus récents')}</SelectItem>
                  <SelectItem value="populaire">{t('artisanat.sort.popular', 'Populaires')}</SelectItem>
                  <SelectItem value="prix_asc">{t('artisanat.sort.priceAsc', 'Prix croissant')}</SelectItem>
                  <SelectItem value="prix_desc">{t('artisanat.sort.priceDesc', 'Prix décroissant')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Boutons */}
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={loadArtisanats} aria-label={t('common.refresh', 'Actualiser')}>
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
              <Button onClick={loadArtisanats}>{t('common.retry', 'Réessayer')}</Button>
            </Card>
          ) : displayedArtisanats.length === 0 ? (
            <EmptyState
              type="products"
              title={t('artisanat.noResults', 'Aucun produit artisanal trouvé')}
              description={t('artisanat.noResultsDesc', 'Essayez de modifier vos critères de recherche')}
              action={hasActiveFilters ? {
                label: t('common.resetFilters', 'Réinitialiser'),
                onClick: resetFilters
              } : undefined}
            />
          ) : (
            <>
              {/* Stats résultats */}
              <div className="mb-6 text-sm text-muted-foreground">
                {displayedArtisanats.length} {t('artisanat.resultsCount', 'produit(s) trouvé(s)')}
              </div>

              {/* Grille des artisanats */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedArtisanats.map((artisanat) => (
                  <ArtisanatCard
                    key={artisanat.id_artisanat || artisanat.id}
                    artisanat={artisanat}
                    onView={handleViewArtisanat}
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

export default Artisanat;
