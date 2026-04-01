import { getLocalizedText } from '@/utils/getLocalizedText';
/**
 * AdminOeuvresTab - Gestion des œuvres
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminStatusFilter from '@/components/admin/AdminStatusFilter';
import {
  BookOpen, Search, CheckCircle, XCircle,
  MoreVertical, Eye, Trash2, RefreshCw,
  Book, Film, Music, Palette, X, AlertCircle
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
import { getAssetUrl } from '@/helpers/assetUrl';

// Helper pour extraire le texte multilingue

// Types de filtres
const STATUS_OPTIONS = ['tous', 'publie', 'en_attente', 'brouillon', 'rejete'];

// Icônes par type
const TYPE_ICONS: Record<string, React.ElementType> = {
  'livre': Book,
  'film': Film,
  'musique': Music,
  'art': Palette,
  'default': BookOpen
};

const AdminOeuvresTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    oeuvres,
    pendingOeuvres,
    loadingOeuvres,
    errorOeuvres,
    validateOeuvre,
    deleteOeuvre,
    refreshAll
  } = useDashboardAdmin('oeuvres');

  // Combiner œuvres et œuvres en attente
  const allOeuvres = React.useMemo(() => {
    const combined = [...(oeuvres?.items || []), ...(pendingOeuvres?.items || [])];
    // Dédupliquer par id
    const unique = combined.filter((oeuvre, index, self) =>
      index === self.findIndex(o => o.id_oeuvre === oeuvre.id_oeuvre)
    );
    return unique;
  }, [oeuvres, pendingOeuvres]);

  // Filtrer les œuvres
  const filteredOeuvres = React.useMemo(() => {
    return allOeuvres.filter((oeuvre: Record<string, unknown>) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const titre = getLocalizedText(oeuvre.titre, currentLang);
        const description = getLocalizedText(oeuvre.description, currentLang);
        const matchesSearch =
          titre.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de statut
      if (statusFilter !== 'tous' && oeuvre.statut !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [allOeuvres, debouncedSearch, statusFilter, currentLang]);

  const hasActiveFilters = searchQuery || statusFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('tous');
  };

  const getTypeIcon = (type: string): React.ElementType => {
    const typeName = getLocalizedText(type, 'fr', '').toLowerCase();
    return TYPE_ICONS[typeName] || TYPE_ICONS.default;
  };

  const loading = loadingOeuvres;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {t('admin.oeuvres.title', 'Gestion des œuvres')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.oeuvres.count', '{{count}} œuvre(s)', { count: filteredOeuvres.length })}
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
                placeholder={t('admin.oeuvres.searchPlaceholder', 'Rechercher par titre...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <AdminStatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder={t('common.status', 'Statut')}
              translationPrefix="admin.oeuvres.statuses"
            />

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

      {/* Liste des œuvres */}
      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : errorOeuvres ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorOeuvres}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredOeuvres.length === 0 ? (
        <EmptyState
          type="default"
          title={t('admin.oeuvres.noOeuvres', 'Aucune œuvre')}
          description={t('admin.oeuvres.noOeuvresDesc', 'Aucune œuvre ne correspond à vos critères')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOeuvres.map((oeuvre: Record<string, unknown>) => {
            const TypeIcon = getTypeIcon(oeuvre.type_oeuvre || oeuvre.TypeOeuvre?.nom_type);
            const titre = getLocalizedText(oeuvre.titre, currentLang, t('common.untitled', 'Sans titre'));
            const description = getLocalizedText(oeuvre.description, currentLang, t('common.noDescription', 'Pas de description'));
            const typeName = getLocalizedText(
              oeuvre.type_oeuvre || oeuvre.TypeOeuvre?.nom_type,
              currentLang,
              t('common.undefined', 'Non défini')
            );

            return (
              <Card key={oeuvre.id_oeuvre} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Image */}
                <div className="aspect-video relative bg-muted">
                  {oeuvre.image_url || oeuvre.medias?.[0]?.url ? (
                    <LazyImage
                      src={getAssetUrl(oeuvre.image_url || oeuvre.medias?.[0]?.url)}
                      alt={titre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={oeuvre.statut || 'en_attente'} size="sm" />
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{titre}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeName}
                        </Badge>
                        {oeuvre.note_moyenne && (
                          <Badge variant="secondary" className="text-xs">
                            {Number(oeuvre.note_moyenne).toFixed(1)}
                          </Badge>
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
                        <DropdownMenuItem onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view', 'Voir')}
                        </DropdownMenuItem>
                        {(oeuvre.statut === 'en_attente' || oeuvre.statut === 'brouillon') && (
                          <>
                            <DropdownMenuItem
                              onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('common.validate', 'Valider')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t('common.reject', 'Rejeter')}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteOeuvre(oeuvre.id_oeuvre)}
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

export default AdminOeuvresTab;
