/**
 * AdminPatrimoineTab - Onglet de gestion du patrimoine
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search, MoreVertical, Edit, Trash2, Eye, RefreshCw,
  MapPin, Award, X, Landmark, AlertCircle
} from 'lucide-react';

import {
  LazyImage,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  StatusBadge
} from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
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
const TYPE_OPTIONS = ['tous', 'monument', 'vestige', 'musee', 'site_naturel', 'ville_village', 'autre'];

const AdminPatrimoineTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemName, setSelectedItemName] = useState('');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    patrimoineItems,
    loadingPatrimoine,
    errorPatrimoine,
    refreshAll
  } = useDashboardAdmin('patrimoine');

  // Filtrer les patrimoines
  const filteredPatrimoines = React.useMemo(() => {
    if (!patrimoineItems?.items) return [];

    return patrimoineItems.items.filter((item: Record<string, unknown>) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const nom = getLocalizedText(item.nom, currentLang);
        const description = getLocalizedText(item.description, currentLang);
        const wilaya = item.wilaya?.nom || item.Commune?.Daira?.Wilaya?.nom || '';
        const matchesSearch =
          nom.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          wilaya.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de type
      if (typeFilter !== 'tous') {
        const itemType = item.type || item.typePatrimoine || '';
        if (itemType !== typeFilter) return false;
      }

      return true;
    });
  }, [patrimoineItems, debouncedSearch, typeFilter, currentLang]);

  const hasActiveFilters = searchQuery || typeFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('tous');
  };

  const handleView = (id: number) => {
    window.open(`/patrimoine/${id}`, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = (id: number, nom: string) => {
    setSelectedItemId(id);
    setSelectedItemName(nom);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedItemId) {
      // TODO: wire to deletePatrimoine action when available in hook
      setDeleteConfirmOpen(false);
      setSelectedItemId(null);
      setSelectedItemName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            {t('admin.patrimoine.title', 'Gestion du patrimoine')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.patrimoine.count', '{{count}} site(s)', { count: filteredPatrimoines.length })}
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
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.patrimoine.searchPlaceholder', 'Rechercher un site...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.type', 'Type')} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'tous'
                      ? t('common.allTypes', 'Tous les types')
                      : t(`admin.patrimoine.types.${type}`, type)}
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

      {/* Liste */}
      {loadingPatrimoine ? (
        <LoadingSkeleton type="card" count={6} />
      ) : errorPatrimoine ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorPatrimoine}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredPatrimoines.length === 0 ? (
        <EmptyState
          type="locations"
          title={t('admin.patrimoine.noResults', 'Aucun site trouvé')}
          description={t('admin.patrimoine.noResultsDesc', 'Aucun site ne correspond à vos critères')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatrimoines.map((item: Record<string, unknown>) => {
            const nom = getLocalizedText(item.nom, currentLang, 'Sans nom');
            const description = getLocalizedText(item.description, currentLang);
            const wilaya = item.wilaya?.nom || item.Commune?.Daira?.Wilaya?.nom || '';
            const type = item.type || item.typePatrimoine || '';
            const imageUrl = item.image_url || item.medias?.[0]?.url;

            return (
              <Card key={item.id_patrimoine || item.id_lieu || item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-40">
                  <LazyImage
                    src={imageUrl ? getAssetUrl(imageUrl) : '/images/placeholder-patrimoine.png'}
                    alt={nom}
                    className="w-full h-full object-cover"
                    fallback="/images/placeholder-patrimoine.png"
                  />
                  <div className="absolute top-2 left-2 flex gap-2">
                    <StatusBadge status={item.statut || 'en_attente'} size="sm" />
                    {item.est_unesco && (
                      <Badge className="bg-blue-500 text-white gap-1">
                        <Award className="h-3 w-3" />
                        UNESCO
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{nom}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {wilaya && (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span>{wilaya}</span>
                          </>
                        )}
                        {type && (
                          <>
                            <span>-</span>
                            <span>{t(`admin.patrimoine.types.${type}`, type)}</span>
                          </>
                        )}
                      </div>
                      {description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(item.id_patrimoine || item.id_lieu || item.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view', 'Voir')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit', 'Modifier')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id_patrimoine || item.id_lieu || item.id, nom)}
                          className="text-destructive"
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

      {/* Dialog suppression */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('admin.patrimoine.deleteDialog.title', 'Supprimer le site')}
        description={t('admin.patrimoine.deleteDialog.description', 'Voulez-vous supprimer "{{name}}" ? Cette action est irréversible.', { name: selectedItemName })}
        confirmLabel={t('common.delete', 'Supprimer')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminPatrimoineTab;
