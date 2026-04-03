import { getLocalizedText } from '@/utils/getLocalizedText';
/**
 * AdminServicesTab - Onglet de gestion des services
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Search, MoreVertical, Edit, Trash2, Eye, RefreshCw, CheckCircle, XCircle,
  Package, Star, MapPin, X, AlertCircle
} from 'lucide-react';

import {
  EmptyState,
  LoadingSkeleton,
  StatusBadge
} from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// Helper pour extraire le texte multilingue

const AdminServicesTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    services,
    loadingServices,
    errorServices,
    deleteService,
    validateService,
    refreshAll
  } = useDashboardAdmin('services');

  // Filtrer les services
  const filteredServices = React.useMemo(() => {
    if (!services?.items) return [];

    return services.items.filter((service: Record<string, unknown>) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const nom = getLocalizedText(service.nom, currentLang);
        const type = getLocalizedText(service.type_service || service.type, currentLang);
        const matchesSearch =
          nom.toLowerCase().includes(searchLower) ||
          type.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de type
      if (typeFilter !== 'tous') {
        const serviceType = service.type_service || service.type || '';
        const typeValue = typeof serviceType === 'string' ? serviceType : getLocalizedText(serviceType, 'fr');
        if (typeValue !== typeFilter) return false;
      }

      return true;
    });
  }, [services, debouncedSearch, typeFilter, currentLang]);

  const hasActiveFilters = searchQuery || typeFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('tous');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            {t('admin.services.title', 'Gestion des services')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.services.count', '{{count}} service(s)', { count: filteredServices.length })}
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
                placeholder={t('admin.services.searchPlaceholder', 'Rechercher un service...')}
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
                <SelectItem value="tous">{t('common.all', 'Tous')}</SelectItem>
                <SelectItem value="guide_touristique">{t('admin.services.types.tourGuide', 'Guide touristique')}</SelectItem>
                <SelectItem value="transport">{t('admin.services.types.transport', 'Transport')}</SelectItem>
                <SelectItem value="hebergement">{t('admin.services.types.accommodation', 'Hébergement')}</SelectItem>
                <SelectItem value="atelier">{t('admin.services.types.workshop', 'Atelier')}</SelectItem>
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

      {/* Liste des services */}
      {loadingServices ? (
        <LoadingSkeleton type="list" count={5} />
      ) : errorServices ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorServices}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          type="products"
          title={t('admin.services.noServices', 'Aucun service')}
          description={t('admin.services.noServicesDesc', 'Aucun service ne correspond à vos critères')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredServices.map((service: Record<string, unknown>) => {
            const nom = getLocalizedText(service.nom, currentLang, 'Sans nom');
            const type = getLocalizedText(service.type_service || service.type, currentLang);

            return (
              <Card key={service.id_service || service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{nom}</h4>
                        <StatusBadge status={service.statut || 'en_attente'} size="sm" />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {type && <span>{type}</span>}
                        {(service.wilaya || service.Lieu?.Commune?.Daira?.Wilaya?.nom) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {service.wilaya || service.Lieu?.Commune?.Daira?.Wilaya?.nom}
                          </span>
                        )}
                        {service.note_moyenne != null && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(service.note_moyenne).toFixed(1)}
                          </span>
                        )}
                        {(service.tarif_min != null || service.tarif) && (
                          <span>
                            {service.tarif || `${service.tarif_min ?? 0} - ${service.tarif_max ?? '?'} DZD`}
                          </span>
                        )}
                      </div>
                      {(service.prestataire || service.User) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('common.by', 'Par')} {service.prestataire?.prenom || service.User?.prenom} {service.prestataire?.nom || service.User?.nom}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const lieuId = service.id_lieu || service.Lieu?.id_lieu;
                          if (lieuId) navigate(`/patrimoine/${lieuId}`, { state: { from: '/admin/dashboard?tab=services' } });
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view', 'Voir le lieu')}
                        </DropdownMenuItem>
                        {service.statut === 'en_attente' && (
                          <>
                            <DropdownMenuItem onClick={() => validateService && validateService(service.id_service || service.id, true)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('common.validate', 'Valider')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => validateService && validateService(service.id_service || service.id, false)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              {t('common.reject', 'Rejeter')}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteService(service.id_service || service.id)}
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

export default AdminServicesTab;
