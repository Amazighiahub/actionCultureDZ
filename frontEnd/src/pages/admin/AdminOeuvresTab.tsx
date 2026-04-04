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
  BookOpen, Search, CheckCircle, XCircle, Edit,
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

  const navigateToOeuvre = (oeuvreId: number) => {
    navigate(`/oeuvres/${oeuvreId}`, {
      state: {
        from: '/admin/dashboard?tab=oeuvres'
      }
    });
  };

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
    return allOeuvres.filter((oeuvre: any) => {
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
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">#</th>
                  <th className="text-left p-3 text-sm font-medium">{t('admin.oeuvres.table.title', 'Titre')}</th>
                  <th className="text-left p-3 text-sm font-medium">{t('admin.oeuvres.table.type', 'Type')}</th>
                  <th className="text-left p-3 text-sm font-medium">{t('admin.oeuvres.table.author', 'Auteur')}</th>
                  <th className="text-left p-3 text-sm font-medium">{t('admin.oeuvres.table.status', 'Statut')}</th>
                  <th className="text-left p-3 text-sm font-medium">{t('admin.oeuvres.table.date', 'Date')}</th>
                  <th className="text-right p-3 text-sm font-medium">{t('admin.oeuvres.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOeuvres.map((oeuvre: any) => {
                  const titre = getLocalizedText(oeuvre.titre, currentLang, t('common.untitled', 'Sans titre'));
                  const typeName = getLocalizedText(
                    oeuvre.type_oeuvre || oeuvre.TypeOeuvre?.nom_type,
                    currentLang,
                    t('common.undefined', 'Non défini')
                  );
                  const auteur = oeuvre.Saiseur
                    ? `${getLocalizedText(oeuvre.Saiseur.prenom, currentLang)} ${getLocalizedText(oeuvre.Saiseur.nom, currentLang)}`
                    : '-';
                  const date = oeuvre.date_creation ? new Date(oeuvre.date_creation).toLocaleDateString('fr-FR') : '-';

                  return (
                    <tr key={oeuvre.id_oeuvre} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm text-muted-foreground">{oeuvre.id_oeuvre}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {oeuvre.Media?.[0]?.url || oeuvre.image_url ? (
                            <img src={getAssetUrl(oeuvre.Media?.[0]?.url || oeuvre.image_url)} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{titre}</p>
                            <p className="text-xs text-muted-foreground">{oeuvre.id_langue ? `Langue: ${oeuvre.id_langue}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{typeName}</Badge>
                      </td>
                      <td className="p-3 text-sm">{auteur}</td>
                      <td className="p-3">
                        <StatusBadge status={oeuvre.statut || 'en_attente'} size="sm" />
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{date}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" title={t('common.view', 'Voir')} onClick={() => navigateToOeuvre(oeuvre.id_oeuvre)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" title={t('common.edit', 'Modifier')} onClick={() => navigate(`/modifier-oeuvre/${oeuvre.id_oeuvre}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {(oeuvre.statut === 'en_attente' || oeuvre.statut === 'brouillon') && (
                            <>
                              <Button type="button" variant="ghost" size="icon" title={t('common.validate', 'Valider')} className="text-green-600 hover:text-green-700" onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" title={t('common.reject', 'Rejeter')} className="text-amber-600 hover:text-amber-700" onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button type="button" variant="ghost" size="icon" title={t('common.delete', 'Supprimer')} className="text-destructive hover:text-destructive" onClick={() => deleteOeuvre(oeuvre.id_oeuvre)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminOeuvresTab;
