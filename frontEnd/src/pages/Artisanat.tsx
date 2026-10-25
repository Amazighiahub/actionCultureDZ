/**
 * Artisanat.tsx - Page de listing des produits artisanaux
 * Avec lazy loading des images et composants partagés
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { httpClient } from '@/services/httpClient';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Search, RefreshCw, X,
  Palette, Hammer, Package, ShoppingBag, Loader2
} from 'lucide-react';

// Composants partagés
import {
  LoadingSkeleton,
  EmptyState
} from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import SEOHead from '@/components/SEOHead';

// Hook personnalisé
import { useArtisanat } from '@/hooks/useArtisanat';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';


import ArtisanatCard from '@/components/artisanat/ArtisanatCard';

// Liens du menu (?materiau=bois…) : slug du nom français ; « bijoux » n'est pas un matériau
const MATERIAU_ALIASES: Record<string, string> = { bijoux: 'argent' };
const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Composant principal
const Artisanat: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

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
    loadMore,
    hasMore,
    loadingMore,
    selectedMateriau,
    selectedTechnique,
    sortBy,
    setSelectedMateriau,
    setSelectedTechnique,
    setSortBy,
    setSearchQuery
  } = useArtisanat();

  // ?materiau=slug (menu) → identifiant du matériau ; noms comparés en français (langue de référence)
  const materiauParam = searchParams.get('materiau');
  useEffect(() => {
    if (!materiauParam) return;
    let cancelled = false;
    const wanted = MATERIAU_ALIASES[slugify(materiauParam)] || slugify(materiauParam);
    httpClient.get<{ id_materiau: number; nom: string }[]>('/metadata/materiaux', { lang: 'fr' })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find((m) => typeof m.nom === 'string' && slugify(m.nom) === wanted);
        setSelectedMateriau(found ? String(found.id_materiau) : 'tous');
      })
      .catch(() => { /* filtre ignoré : la liste complète reste affichée */ });
    return () => { cancelled = true; };
  }, [materiauParam, setSelectedMateriau]);

  // Choix manuel d'un matériau : le paramètre du menu ne doit plus l'écraser
  const handleMateriauChange = (value: string) => {
    setSelectedMateriau(value);
    if (materiauParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('materiau');
      setSearchParams(next, { replace: true });
    }
  };

  // Mettre à jour la recherche dans le hook
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Filtrage local supplémentaire
  const displayedArtisanats = useMemo(() => {
    return artisanats;
  }, [artisanats]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchQueryLocal('');
    handleMateriauChange('tous');
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
            {t('artisanat.subtitleShort', 'Découvrez les métiers d\'art et les créations artisanales traditionnelles d\'Algérie')}
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-flow-col md:auto-cols-fr gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats?.total ?? stats?.total_produits ?? displayedArtisanats.length}</p>
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
          {(stats?.total_artisans || 0) > 0 && (
            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{stats?.total_artisans}</p>
              <p className="text-sm text-muted-foreground">{t('artisanat.stats.artisans', 'Artisans')}</p>
            </Card>
          )}
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label={t('artisanat.searchPlaceholder', 'Rechercher un produit artisanal...')}
                  placeholder={t('artisanat.searchPlaceholder', 'Rechercher un produit artisanal...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQueryLocal(e.target.value)}
                  className="ps-9"
                />
              </div>

              {/* Filtre matériau */}
              <Select value={selectedMateriau} onValueChange={handleMateriauChange}>
                <SelectTrigger className="w-[180px]" aria-label={t('artisanat.filterByMaterial', 'Matériau')}>
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
                <SelectTrigger className="w-[180px]" aria-label={t('artisanat.filterByTechnique', 'Technique')}>
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
                <SelectTrigger className="w-[150px]" aria-label={t('common.sortBy', 'Trier par')}>
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
              <h2 className="sr-only">{t('artisanat.resultsHeading', 'Liste des produits artisanaux')}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedArtisanats.map((artisanat) => (
                  <ArtisanatCard
                    key={artisanat.id_artisanat || artisanat.id}
                    artisanat={artisanat}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" size="lg" onClick={() => loadMore()} disabled={loadingMore}>
                    {loadingMore && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
                    {t('common.loadMore', 'Voir plus')}
                  </Button>
                </div>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default Artisanat;
