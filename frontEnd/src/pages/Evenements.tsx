/**
 * Evenements.tsx - Page de listing des événements refactorisée
 * Avec lazy loading des images et composants séparés
 */
import React, { Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Badge } from '@/components/UI/badge';
import { Progress } from '@/components/UI/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import {
  Calendar, MapPin, Users, Search, Filter, ArrowRight,
  Loader2, RefreshCw, X
} from 'lucide-react';

// Composants partagés
import { 
  LazyImage, 
  LoadingSkeleton, 
  EmptyState, 
  Pagination,
  StatusBadge 
} from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Hook personnalisé
import { useEvenements } from '@/hooks/useEvenements';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// Types d'événements
const EVENT_TYPES = [
  { value: 'tous', label: 'Tous les types' },
  { value: 'exposition', label: 'Exposition' },
  { value: 'concert', label: 'Concert' },
  { value: 'festival', label: 'Festival' },
  { value: 'conference', label: 'Conférence' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'spectacle', label: 'Spectacle' }
];

const STATUS_OPTIONS = [
  { value: 'tous', label: 'Tous' },
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' }
];

// Composant carte d'événement
interface EventCardProps {
  event: any;
  onView: (id: number) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onView }) => {
  const { t } = useTranslation();
  
  const capacityPercentage = event.capacite_max 
    ? Math.round((event.nombre_inscrits || 0) / event.capacite_max * 100)
    : 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onView(event.id_evenement)}
    >
      {/* Image avec lazy loading */}
      <div className="relative h-48 overflow-hidden">
        <LazyImage
          src={event.image_url || event.affiche_url || '/images/placeholder-event.png'}
          alt={event.nom_evenement}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-event.png"
        />
        
        {/* Badge statut */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.statut} />
        </div>

        {/* Date badge */}
        {event.date_debut && (
          <div className="absolute bottom-3 right-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
            <div className="text-center">
              <div className="text-xl font-bold leading-none">
                {new Date(event.date_debut).getDate()}
              </div>
              <div className="text-xs uppercase text-muted-foreground">
                {new Date(event.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {event.nom_evenement || event.titre}
        </h3>

        <div className="space-y-2 text-sm text-muted-foreground">
          {/* Lieu */}
          {(event.lieu || event.Lieu?.nom) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{event.lieu || event.Lieu?.nom}</span>
            </div>
          )}

          {/* Date */}
          {event.date_debut && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {formatDate(event.date_debut)}
                {event.date_fin && event.date_fin !== event.date_debut && (
                  <> - {formatDate(event.date_fin)}</>
                )}
              </span>
            </div>
          )}

          {/* Capacité */}
          {event.capacite_max && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{event.nombre_inscrits || 0} / {event.capacite_max}</span>
                </div>
                {capacityPercentage >= 90 && (
                  <Badge variant="destructive" className="text-xs">
                    {t('events.almostFull', 'Presque complet')}
                  </Badge>
                )}
              </div>
              <Progress value={capacityPercentage} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Prix */}
        <div className="mt-4 flex items-center justify-between">
          {event.gratuit ? (
            <Badge variant="secondary">{t('events.free', 'Gratuit')}</Badge>
          ) : event.tarif ? (
            <span className="font-semibold text-primary">{event.tarif} DZD</span>
          ) : (
            <span></span>
          )}
          
          <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
            {t('common.viewDetails', 'Voir')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant principal
const Evenements: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // États des filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Hook personnalisé
  const {
    evenements,
    loading,
    error,
    pagination,
    changePage,
    refresh
  } = useEvenements({
    search: debouncedSearch,
    statut: statusFilter !== 'tous' ? statusFilter : undefined,
    type: typeFilter !== 'tous' ? typeFilter : undefined
  });

  // Navigation vers détail
  const handleViewEvent = useCallback((id: number) => {
    navigate(`/evenements/${id}`);
  }, [navigate]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('tous');
    setTypeFilter('tous');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'tous' || typeFilter !== 'tous';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">
            {t('events.title', 'Événements culturels')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('events.subtitle', 'Découvrez les événements culturels à travers l\'Algérie')}
          </p>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('events.searchPlaceholder', 'Rechercher un événement...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtre statut */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre type */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Boutons */}
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={refresh} aria-label={t('common.refresh', 'Actualiser')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu */}
        <ErrorBoundary>
          {loading ? (
            <LoadingSkeleton type="card" count={6} />
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={refresh}>{t('common.retry', 'Réessayer')}</Button>
            </Card>
          ) : evenements.length === 0 ? (
            <EmptyState
              type="events"
              title={t('events.noResults', 'Aucun événement trouvé')}
              description={t('events.noResultsDesc', 'Essayez de modifier vos critères de recherche')}
              action={hasActiveFilters ? {
                label: t('common.resetFilters', 'Réinitialiser les filtres'),
                onClick: resetFilters
              } : undefined}
            />
          ) : (
            <>
              {/* Stats */}
              <div className="mb-6 text-sm text-muted-foreground">
                {pagination?.total || evenements.length} événement(s) trouvé(s)
              </div>

              {/* Grille des événements */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {evenements.map((event) => (
                  <EventCard
                    key={event.id_evenement}
                    event={event}
                    onView={handleViewEvent}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={changePage}
                  />
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

export default Evenements;
