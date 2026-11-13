/**
 * AdminModerationTab - Onglet de modération des signalements
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import AdminStatusFilter from '@/components/admin/AdminStatusFilter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle, AlertCircle, CheckCircle, ExternalLink, Shield,
  MessageSquare, Flag, Clock, User, FileText,
  Search, RefreshCw, X, Ban, Trash2
} from 'lucide-react';

import { ConfirmDialog, EmptyState, LoadingSkeleton } from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useListeServeur, filtreChoisi } from '@/hooks/useListeServeur';
import { MOTIFS_SIGNALEMENT } from '@/utils/motifsSignalement';
import { Pagination } from '@/components/shared/Pagination';

// Libellé de chaque motif de signalement
const RAISONS_SIGNALEMENT_CONFIG: Record<string, string> = Object.fromEntries(
  MOTIFS_SIGNALEMENT.map(({ valeur, cle }) => [valeur, cle])
);
// Recherche dans la page : ces champs peuvent manquer, ou ne pas être du texte
const enTexte = (v: unknown): string => (typeof v === 'string' ? v : '').toLowerCase();

const TYPE_OPTIONS = ['tous', 'commentaire', 'oeuvre', 'evenement', 'artisanat', 'lieu', 'user'];

const AdminModerationTab: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  // Actions lourdes (suppression, suspension) : confirmation avant exécution
  const [pendingAction, setPendingAction] = useState<{ id: number; action: 'suppression_contenu' | 'suspension_temporaire' } | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    moderationQueue,
    loadingModeration,
    errorModeration,
    moderateSignalement,
    loadModerationQueue,
    refreshAll
  } = useDashboardAdmin('moderation');

  const totalPages = (moderationQueue?.pagination as any)?.pages ?? 1;
  // Le type est filtré par le serveur ; la recherche porte sur la page affichée
  const { page, setPage } = useListeServeur({ type: filtreChoisi(typeFilter) }, loadModerationQueue, totalPages);
  const compteurs = (moderationQueue as any)?.compteurs;

  // Filtrer les signalements
  const filteredSignalements = React.useMemo(() => {
    if (!moderationQueue?.items) return [];

    return moderationQueue.items.filter((item: any) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = [
          item.entity_title, item.entity_content, item.reason, item.description,
          item.reported_by?.nom, item.entity_author?.nom
        ].some((champ) => enTexte(champ).includes(searchLower));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [moderationQueue, debouncedSearch]);

  const hasActiveFilters = searchQuery || typeFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('tous');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commentaire': return MessageSquare;
      case 'user': return User;
      case 'oeuvre': return FileText;
      case 'evenement': return Flag;
      default: return Flag;
    }
  };

  const handleAction = async (signalementId: number, action: string) => {
    await moderateSignalement({ signalementId, action });
  };

  const totalCount = compteurs?.total ?? moderationQueue?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t('admin.moderation.title', 'Modération')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.moderation.count', '{{count}} signalement(s) en attente', { count: totalCount })}
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.status.pending', 'En attente')}</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.commentReports', 'Commentaires')}</p>
              <p className="text-2xl font-bold">
                {compteurs?.commentaire ?? moderationQueue?.items?.filter((s: any) => s.type === 'commentaire').length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.contentReports', 'Contenus')}</p>
              <p className="text-2xl font-bold">
                {compteurs?.contenu ?? moderationQueue?.items?.filter((s: any) => s.type === 'oeuvre' || s.type === 'evenement' || s.type === 'artisanat' || s.type === 'lieu').length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.moderation.searchPlaceholder', 'Rechercher un signalement...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            <AdminStatusFilter
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPE_OPTIONS}
              placeholder={t('common.type', 'Type')}
              translationPrefix="admin.moderation.types"
              allLabel={t('common.allTypes', 'Tous les types')}
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

      {/* Liste des signalements */}
      {loadingModeration ? (
        <LoadingSkeleton type="list" count={5} />
      ) : errorModeration ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorModeration}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredSignalements.length === 0 ? (
        <EmptyState
          type="default"
          title={t('admin.moderation.noReports', 'Aucun signalement')}
          description={t('admin.moderation.noReportsDesc', 'Aucun signalement ne correspond à vos critères')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredSignalements.map((signalement: any) => {
            const TypeIcon = getTypeIcon(signalement.type);
            const reasonKey = RAISONS_SIGNALEMENT_CONFIG[signalement.reason];

            return (
              <Card key={signalement.id} className="border-s-4 border-s-yellow-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">
                          {t(`admin.moderation.types.${signalement.type}`, signalement.type)}
                        </Badge>
                        <Badge variant="secondary">
                          {reasonKey ? t(reasonKey, signalement.reason) : signalement.reason}
                        </Badge>
                      </div>

                      {/* Ce qui est signalé : à lire avant de décider */}
                      <Alert className="mt-2 mb-2 bg-muted/50">
                        <AlertDescription className="text-sm space-y-1">
                          {signalement.entity_missing ? (
                            <p>{t('admin.moderation.contenuDisparu', 'Ce contenu n’existe plus.')}</p>
                          ) : (
                            <>
                              {signalement.entity_title && (
                                <p>
                                  <strong>{t('admin.moderation.concernedElement', 'Élément concerné')}:</strong>{' '}
                                  {signalement.entity_title}
                                </p>
                              )}
                              {signalement.entity_content && (
                                <p dir="auto" className="whitespace-pre-line">{signalement.entity_content}</p>
                              )}
                              {signalement.entity_author?.nom && (
                                <p className="text-xs text-muted-foreground">
                                  {t('admin.moderation.auteurContenu', 'Auteur : {{nom}}', { nom: signalement.entity_author.nom })}
                                </p>
                              )}
                              {signalement.entity_link && (
                                <a
                                  href={signalement.entity_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-4"
                                >
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  {t('admin.moderation.voirContenu', 'Voir sur le site')}
                                </a>
                              )}
                            </>
                          )}
                        </AlertDescription>
                      </Alert>

                      {signalement.description && (
                        <p dir="auto" className="text-sm mb-2">
                          <strong>{t('admin.moderation.precisionSignalant', 'Précision de la personne qui signale')}:</strong>{' '}
                          {signalement.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {signalement.reported_by?.nom && (
                          <>
                            {t('admin.moderation.reportedBy', { name: signalement.reported_by.nom })}
                            {' • '}
                          </>
                        )}
                        {signalement.date_signalement && formatDate(signalement.date_signalement)}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(signalement.id, 'aucune')}
                        title={t('admin.moderation.actions.dismiss', 'Rejeter le signalement')}
                      >
                        <CheckCircle className="h-4 w-4 me-1" />
                        {t('admin.moderation.actions.dismissShort', 'Ignorer')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(signalement.id, 'avertissement')}
                        title={t('admin.moderation.actions.warn', 'Avertir')}
                      >
                        <AlertTriangle className="h-4 w-4 me-1" />
                        {t('admin.moderation.actions.warn', 'Avertir')}
                      </Button>
                      {signalement.type !== 'user' && !signalement.entity_missing && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingAction({ id: signalement.id, action: 'suppression_contenu' })}
                        title={t('admin.moderation.actions.removeContent', 'Supprimer le contenu')}
                      >
                        <Trash2 className="h-4 w-4 me-1" />
                        {t('admin.moderation.actions.removeContentShort', 'Supprimer')}
                      </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingAction({ id: signalement.id, action: 'suspension_temporaire' })}
                        title={t('admin.moderation.actions.suspend', 'Suspendre l\'utilisateur')}
                      >
                        <Ban className="h-4 w-4 me-1" />
                        {t('admin.moderation.actions.suspendShort', 'Suspendre')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        title={pendingAction?.action === 'suspension_temporaire'
          ? t('admin.moderation.confirmSuspend', 'Suspendre cet utilisateur ?')
          : t('admin.moderation.confirmRemove', 'Supprimer ce contenu ?')}
        description={pendingAction?.action === 'suspension_temporaire'
          ? t('admin.moderation.confirmSuspendDesc', "L'auteur du contenu ne pourra plus se connecter pendant la suspension.")
          : t('admin.moderation.confirmRemoveDesc', 'Le contenu signalé sera retiré du site. Il reste conservé en base : l’équipe technique peut le rétablir.')}
        confirmLabel={pendingAction?.action === 'suspension_temporaire'
          ? t('admin.moderation.actions.suspendShort', 'Suspendre')
          : t('admin.moderation.actions.removeContentShort', 'Supprimer')}
        variant="destructive"
        onConfirm={async () => {
          if (!pendingAction) return;
          const { id, action } = pendingAction;
          setPendingAction(null);
          await handleAction(id, action);
        }}
      />
    </div>
  );
};

export default AdminModerationTab;
