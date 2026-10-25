import { getLocalizedText } from '@/utils/getLocalizedText';
/**
 * AdminEvenementsTab - Gestion des événements
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import AdminStatusFilter from '@/components/admin/AdminStatusFilter';
import {
  Calendar, Search, CheckCircle, XCircle, Edit,
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
  StatusBadge,
  ConfirmDialog
} from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getAssetUrl } from '@/helpers/assetUrl';
import { heureEvenement } from '@/utils/dateHeureEvenement';

// Helper pour extraire le texte multilingue

// Types de filtres
const STATUS_OPTIONS = ['tous', 'en_attente', 'publie', 'brouillon', 'annule', 'termine'];

const AdminEvenementsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useFormatDate();
  const currentLang = i18n.language || 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; eventId?: number }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; eventId?: number }>({ open: false });
  const [isDeleting, setIsDeleting] = useState(false);
  // Refus d'un événement en attente : le motif est envoyé à l'organisateur
  const [refus, setRefus] = useState<{ eventId: number; nom: string } | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    evenements,
    loadingEvenements,
    errorEvenements,
    deleteEvenement,
    cancelEvenement,
    updateEvenementStatus,
    refreshAll
  } = useDashboardAdmin('evenements');

  const enAttente = (evenements?.items || []).filter((e: any) => e.statut === 'en_attente').length;

  // Filtrer les événements
  const filteredEvents = React.useMemo(() => {
    if (!evenements?.items) return [];

    return evenements.items.filter((event: any) => {
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
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      {/* Événements envoyés par les organisateurs, à valider */}
      {enAttente > 0 && statusFilter !== 'en_attente' && (
        <button
          type="button"
          onClick={() => setStatusFilter('en_attente')}
          className="w-full text-start rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 hover:bg-amber-100"
        >
          <span className="font-semibold">{t('admin.events.pendingCount', '{{count}} événement(s) à valider', { count: enAttente })}</span>
          {' · '}{t('admin.events.pendingShow', 'Afficher')}
        </button>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label={t('admin.events.searchPlaceholder', 'Rechercher par nom...')}
                placeholder={t('admin.events.searchPlaceholder', 'Rechercher par nom...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <AdminStatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder={t('common.status', 'Statut')}
              translationPrefix="admin.events.statuses"
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

      {/* Liste des événements */}
      {loadingEvenements ? (
        <LoadingSkeleton type="card" count={4} />
      ) : errorEvenements ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorEvenements}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 me-2" />
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
          {filteredEvents.map((event: any) => {
            const nom = getLocalizedText(event.nom_evenement || event.nom, currentLang, t('common.unnamed', 'Sans nom'));
            const description = getLocalizedText(event.description, currentLang, t('common.noDescription', 'Pas de description'));
            // L'API renvoie le lieu sous « Lieu » ; l'heure est dans date_debut (heure d'Algérie)
            const lieu = getLocalizedText(event.Lieu?.nom || event.lieu?.nom || event.lieu_nom, currentLang, '');
            const heure = heureEvenement(event.date_debut);

            return (
              <Card key={event.id_evenement} className="relative hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
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
                  <div className="absolute top-2 start-2 bg-white/90 rounded px-2 py-1">
                    <p className="text-xs font-bold text-primary">
                      {formatEventDate(event.date_debut)}
                    </p>
                  </div>
                  <div className="absolute top-2 end-2">
                    <StatusBadge status={event.statut || 'brouillon'} size="sm" />
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {/* Lien « étiré » : son ::after couvre toute la carte (cliquable, crawlable, accessible au clavier) */}
                        <Link
                          to={`/evenements/${event.id_evenement}`}
                          state={{ from: '/admin/dashboard?tab=evenements' }}
                          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                        >
                          {nom}
                        </Link>
                      </h3>
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
                        {event.nombre_inscrits !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {t('admin.events.registered', '{{count}} inscrit(s)', { count: Number(event.nombre_inscrits) || 0 })}
                          </span>
                        )}
                        {heure && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {heure}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative z-10" aria-label={t('common.moreOptions', 'Plus d\'options')} onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(event.statut === 'en_attente' || event.statut === 'brouillon') && (
                          <DropdownMenuItem className="text-green-700" onClick={() => updateEvenementStatus(event.id_evenement, 'publie')}>
                            <CheckCircle className="h-4 w-4 me-2" />
                            {t('admin.events.publish', 'Valider et publier')}
                          </DropdownMenuItem>
                        )}
                        {event.statut === 'en_attente' && (
                          <DropdownMenuItem className="text-amber-700" onClick={() => { setMotifRefus(''); setRefus({ eventId: event.id_evenement, nom }); }}>
                            <XCircle className="h-4 w-4 me-2" />
                            {t('admin.events.reject', 'Refuser')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => navigate(`/evenements/${event.id_evenement}`, { state: { from: '/admin/dashboard?tab=evenements' } })}>
                          <Eye className="h-4 w-4 me-2" />
                          {t('common.view', 'Voir')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/modifier-evenement/${event.id_evenement}`)}>
                          <Edit className="h-4 w-4 me-2" />
                          {t('common.edit', 'Modifier')}
                        </DropdownMenuItem>
                        {!['brouillon', 'en_attente', 'annule'].includes(event.statut) && (
                          <DropdownMenuItem onClick={() => setConfirmCancel({ open: true, eventId: event.id_evenement })}>
                            <XCircle className="h-4 w-4 me-2" />
                            {t('admin.events.cancel', 'Annuler')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmDelete({ open: true, eventId: event.id_evenement })}
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
            <DialogTitle>{t('admin.events.rejectTitle', 'Refuser cet événement ?')}</DialogTitle>
            <DialogDescription>
              {t('admin.events.rejectDesc', '« {{nom}} » revient en brouillon. L’organisateur reçoit votre motif, corrige l’événement et peut le renvoyer.', { nom: refus?.nom })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-refus-evenement">{t('admin.events.rejectReason', 'Motif du refus')}</Label>
            <Textarea
              id="motif-refus-evenement"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder={t('admin.events.rejectPlaceholder', 'Ex. : il manque l’adresse exacte et l’heure de début.')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefus(null)}>{t('common.cancel', 'Annuler')}</Button>
            <Button
              disabled={!motifRefus.trim()}
              onClick={async () => {
                if (!refus) return;
                await updateEvenementStatus(refus.eventId, 'rejete', motifRefus.trim());
                setRefus(null);
              }}
            >
              {t('admin.events.reject', 'Refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel.open}
        onOpenChange={(open) => setConfirmCancel({ open })}
        title={t('admin.events.confirmCancel', 'Annuler cet événement ?')}
        description={t('admin.events.confirmCancelDesc', 'Les participants seront notifiés de l\'annulation.')}
        variant="warning"
        confirmLabel={t('admin.events.cancelEvent', 'Annuler l\'événement')}
        onConfirm={() => {
          if (confirmCancel.eventId) cancelEvenement(confirmCancel.eventId);
          setConfirmCancel({ open: false });
        }}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => !isDeleting && setConfirmDelete({ open })}
        title={t('admin.events.confirmDelete', 'Supprimer cet événement ?')}
        description={t('admin.events.confirmDeleteDesc', 'Cette action est irréversible.')}
        variant="destructive"
        confirmLabel={t('common.delete', 'Supprimer')}
        loading={isDeleting}
        onConfirm={async () => {
          if (!confirmDelete.eventId) return;
          setIsDeleting(true);
          try {
            await deleteEvenement(confirmDelete.eventId);
          } finally {
            setIsDeleting(false);
            setConfirmDelete({ open: false });
          }
        }}
      />
    </div>
  );
};

export default AdminEvenementsTab;
