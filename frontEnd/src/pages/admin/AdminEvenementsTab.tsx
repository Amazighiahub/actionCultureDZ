/**
 * AdminEvenementsTab - Gestion des événements
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar, Search, CheckCircle, XCircle,
  MoreVertical, Eye, Trash2, RefreshCw,
  MapPin, Users, Clock, X, AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  LazyImage,
  EmptyState,
  LoadingSkeleton,
  StatusBadge
} from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getAssetUrl } from '@/helpers/assetUrl';

// Helper pour extraire le texte multilingue
const getLocalizedText = (value: unknown, lang: string = 'fr', fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return String(obj[lang] || obj.fr || obj.ar || obj.en || Object.values(obj)[0] || fallback);
  }
  return String(value);
};

// Types de filtres
const STATUS_OPTIONS = ['tous', 'publie', 'brouillon', 'annule', 'termine'];

const AdminEvenementsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatDate } = useFormatDate();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    evenements,
    loadingEvenements,
    errorEvenements,
    deleteEvenement,
    cancelEvenement,
    refreshAll
  } = useDashboardAdmin('evenements');

  // Filtrer les événements
  const filteredEvents = React.useMemo(() => {
    if (!evenements?.items) return [];

    return evenements.items.filter((event: Record<string, unknown>) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const nom = getLocalizedText(event.nom_evenement || event.nom, currentLang);
        const description = getLocalizedText(event.description, currentLang);
        const matchesSearch =
          nom.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de statut
      if (statusFilter !== 'tous' && event.statut !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [evenements, debouncedSearch, statusFilter, currentLang]);

  const hasActiveFilters = searchQuery || statusFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('tous');
  };

  const formatEventDate = (dateString: string) => {
    if (!dateString) return t('common.dateUndefined', 'Date non définie');
    return formatDate(dateString, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {t('admin.events.title', 'Gestion des événements')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.events.count', '{{count}} événement(s)', { count: filteredEvents.length })}
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.events.searchPlaceholder', 'Rechercher par nom...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.status', 'Statut')} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'tous'
                      ? t('common.allStatuses', 'Tous les statuts')
                      : t(`admin.events.statuses.${status}`, status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={resetFilters} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={refreshAll} aria-label={t('common.refresh', 'Actualiser')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des événements */}
      {loadingEvenements ? (
        <LoadingSkeleton type="card" count={4} />
      ) : errorEvenements ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorEvenements}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          type="events"
          title={t('admin.events.noEvents', 'Aucun événement')}
          description={t('admin.events.noEventsDesc', 'Aucun événement ne correspond à vos critères')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event: Record<string, unknown>) => {
            const nom = getLocalizedText(event.nom_evenement || event.nom, currentLang, t('common.unnamed', 'Sans nom'));
            const description = getLocalizedText(event.description, currentLang, t('common.noDescription', 'Pas de description'));
            const lieu = getLocalizedText(event.lieu?.nom || event.lieu_nom, currentLang, '');

            return (
              <Card key={event.id_evenement} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Image */}
                <div className="aspect-video relative bg-muted">
                  {event.image_url || event.medias?.[0]?.url ? (
                    <LazyImage
                      src={getAssetUrl(event.image_url || event.medias?.[0]?.url)}
                      alt={nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {/* Badge date */}
                  <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1">
                    <p className="text-xs font-bold text-primary">
                      {formatEventDate(event.date_debut)}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={event.statut || 'brouillon'} size="sm" />
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{nom}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {lieu && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lieu}
                          </span>
                        )}
                        {event.nombre_participants !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {t('admin.events.participants', '{{count}} participants', { count: event.nombre_participants })}
                          </span>
                        )}
                        {event.heure_debut && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.heure_debut}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view', 'Voir')}
                        </DropdownMenuItem>
                        {event.statut === 'brouillon' && (
                          <DropdownMenuItem>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('admin.events.publish', 'Publier')}
                          </DropdownMenuItem>
                        )}
                        {event.statut !== 'brouillon' && event.statut !== 'annule' && (
                          <DropdownMenuItem onClick={() => cancelEvenement(event.id_evenement)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('admin.events.cancel', 'Annuler')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteEvenement(event.id_evenement)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete', 'Supprimer')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminEvenementsTab;
