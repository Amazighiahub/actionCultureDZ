import { getLocalizedText } from '@/utils/getLocalizedText';
/**
 * AdminServicesTab - Services proposés par les professionnels (restaurant, hébergement, guide…)
 * Validation : « Valider et publier », ou « Refuser » avec un motif envoyé au professionnel.
 * Les équipements des sites (parking, toilettes…) se gèrent avec le site, pas ici.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Search, MoreVertical, Trash2, Eye, RefreshCw, CheckCircle, XCircle,
  Package, MapPin, X, AlertCircle
} from 'lucide-react';

import {
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  StatusBadge
} from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getAssetUrl } from '@/helpers/assetUrl';

// Valeurs du champ type_service (modèle Service)
const TYPES_SERVICE = ['restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'];
const STATUTS = ['tous', 'en_attente', 'valide', 'rejete'];

const AdminServicesTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPriceRange } = useLocalizedNumber();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statutFilter, setStatutFilter] = useState('tous');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  // Refus : le motif est envoyé au professionnel
  const [refus, setRefus] = useState<{ id: number; nom: string } | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    services,
    loadingServices,
    errorServices,
    deleteService,
    validateService,
    refreshAll
  } = useDashboardAdmin('services');

  const tous = (services?.items || []) as any[];
  const enAttente = tous.filter((s) => s.statut === 'en_attente').length;

  const filteredServices = React.useMemo(() => tous.filter((service: any) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const nom = getLocalizedText(service.nom, currentLang).toLowerCase();
      const lieu = getLocalizedText(service.Lieu?.nom, currentLang).toLowerCase();
      if (!nom.includes(q) && !lieu.includes(q)) return false;
    }
    if (typeFilter !== 'tous' && service.type_service !== typeFilter) return false;
    if (statutFilter !== 'tous' && service.statut !== statutFilter) return false;
    return true;
  }), [tous, debouncedSearch, typeFilter, statutFilter, currentLang]);

  const hasActiveFilters = searchQuery || typeFilter !== 'tous' || statutFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('tous');
    setStatutFilter('tous');
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
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      {/* Services envoyés par les professionnels, à valider */}
      {enAttente > 0 && statutFilter !== 'en_attente' && (
        <button
          type="button"
          onClick={() => setStatutFilter('en_attente')}
          className="w-full text-start rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 hover:bg-amber-100"
        >
          <span className="font-semibold">{t('admin.services.pendingCount', '{{count}} service(s) à valider', { count: enAttente })}</span>
          {' · '}{t('admin.events.pendingShow', 'Afficher')}
        </button>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label={t('admin.services.searchPlaceholder', 'Rechercher un service...')}
                placeholder={t('admin.services.searchPlaceholder', 'Rechercher un service...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full md:w-[190px]" aria-label={t('common.status', 'Statut')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'tous' ? t('common.allStatuses', 'Tous les statuts') : t(`dashboardpro.serviceStatus.${s}`, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]" aria-label={t('common.type', 'Type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">{t('common.allTypes', 'Tous les types')}</SelectItem>
                {TYPES_SERVICE.map((type) => (
                  <SelectItem key={type} value={type}>{t(`service.types.${type}`, type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={resetFilters} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
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
            <RefreshCw className="h-4 w-4 me-2" />
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
          {filteredServices.map((service: any) => {
            const id: number = service.id_service || service.id;
            const nom = getLocalizedText(service.nom, currentLang, t('common.unnamed', 'Sans nom'));
            const lieu = getLocalizedText(service.Lieu?.nom, currentLang, '');
            const pro = service.Professionnel;
            const auteur = pro ? `${getLocalizedText(pro.prenom, currentLang, '')} ${getLocalizedText(pro.nom, currentLang, '')}`.trim() : '';
            const tarifMin = service.tarif_min != null ? Number(service.tarif_min) : null;
            const tarifMax = service.tarif_max != null ? Number(service.tarif_max) : null;

            return (
              <Card key={id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {service.photo_url
                        ? <img src={getAssetUrl(service.photo_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{nom}</h4>
                        <StatusBadge status={service.statut || 'en_attente'} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {service.type_service && <span>{t(`service.types.${service.type_service}`, String(service.type_service))}</span>}
                        {lieu && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {lieu}
                          </span>
                        )}
                        {(tarifMin != null || tarifMax != null) && (
                          <span>{formatPriceRange(tarifMin ?? undefined, tarifMax ?? undefined)}</span>
                        )}
                      </div>
                      {auteur && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('common.by', 'Par')} {auteur}
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
                        {(service.statut === 'en_attente' || service.statut === 'rejete') && (
                          <DropdownMenuItem className="text-green-700" onClick={() => validateService(id, true)}>
                            <CheckCircle className="h-4 w-4 me-2" />
                            {t('admin.events.publish', 'Valider et publier')}
                          </DropdownMenuItem>
                        )}
                        {service.statut === 'en_attente' && (
                          <DropdownMenuItem className="text-amber-700" onClick={() => { setMotifRefus(''); setRefus({ id, nom }); }}>
                            <XCircle className="h-4 w-4 me-2" />
                            {t('admin.events.reject', 'Refuser')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => navigate(`/services/${id}`, { state: { from: '/admin/dashboard?tab=services' } })}>
                          <Eye className="h-4 w-4 me-2" />
                          {t('admin.services.view', 'Voir la fiche')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmDeleteId(id)}
                        >
                          <Trash2 className="h-4 w-4 me-2" />
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

      <Dialog open={!!refus} onOpenChange={(open) => { if (!open) setRefus(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.services.rejectTitle', 'Refuser ce service ?')}</DialogTitle>
            <DialogDescription>
              {t('admin.services.rejectDesc', 'Le professionnel reçoit votre motif. Quand il corrige « {{nom}} », le service revient en validation.', { nom: refus?.nom })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-refus-service">{t('admin.events.rejectReason', 'Motif du refus')}</Label>
            <Textarea
              id="motif-refus-service"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder={t('admin.services.rejectPlaceholder', 'Ex. : ajoutez une photo et le numéro de téléphone.')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefus(null)}>{t('common.cancel', 'Annuler')}</Button>
            <Button
              disabled={!motifRefus.trim()}
              onClick={async () => {
                if (!refus) return;
                await validateService(refus.id, false, motifRefus.trim());
                setRefus(null);
              }}
            >
              {t('admin.events.reject', 'Refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title={t('admin.services.confirmDelete', 'Supprimer ce service ?')}
        description={t('admin.events.confirmDeleteDesc', 'Cette action est irréversible.')}
        confirmLabel={t('common.delete', 'Supprimer')}
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeleteId === null) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          await deleteService(id);
        }}
      />
    </div>
  );
};

export default AdminServicesTab;
