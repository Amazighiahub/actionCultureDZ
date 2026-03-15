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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle, AlertCircle, CheckCircle, XCircle, Shield,
  MessageSquare, Flag, Clock, User, FileText,
  Search, RefreshCw, X, Ban, Trash2
} from 'lucide-react';

import { EmptyState, LoadingSkeleton } from '@/components/shared';

import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFormatDate } from '@/hooks/useFormatDate';

const RAISONS_SIGNALEMENT_CONFIG: Record<string, string> = {
  contenu_inapproprie: 'admin.moderation.reasons.inappropriateContent',
  spam: 'admin.moderation.reasons.spam',
  harcelement: 'admin.moderation.reasons.harassment',
  droits_auteur: 'admin.moderation.reasons.copyright',
  fausse_information: 'admin.moderation.reasons.falseInformation',
  autre: 'admin.moderation.reasons.other'
};

const TYPE_OPTIONS = ['tous', 'commentaire', 'oeuvre', 'evenement', 'user'];

const AdminModerationTab: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    moderationQueue,
    loadingModeration,
    errorModeration,
    moderateSignalement,
    refreshAll
  } = useDashboardAdmin('moderation');

  // Filtrer les signalements
  const filteredSignalements = React.useMemo(() => {
    if (!moderationQueue?.items) return [];

    return moderationQueue.items.filter((item: any) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const title = (item.entity_title || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        const reporter = (item.reported_by?.nom || '').toLowerCase();
        const matchesSearch =
          title.includes(searchLower) ||
          reason.includes(searchLower) ||
          reporter.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de type
      if (typeFilter !== 'tous') {
        if (item.type !== typeFilter) return false;
      }

      return true;
    });
  }, [moderationQueue, debouncedSearch, typeFilter]);

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

  const totalCount = moderationQueue?.items?.length ?? 0;

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
            {t('admin.moderation.count', '{{count}} signalement(s) en attente', { count: filteredSignalements.length })}
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
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
                {moderationQueue?.items?.filter((s: any) => s.type === 'commentaire').length ?? 0}
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
                {moderationQueue?.items?.filter((s: any) => s.type === 'oeuvre' || s.type === 'evenement').length ?? 0}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.moderation.searchPlaceholder', 'Rechercher un signalement...')}
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
                      : t(`admin.moderation.types.${type}`, type)}
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

      {/* Liste des signalements */}
      {loadingModeration ? (
        <LoadingSkeleton type="list" count={5} />
      ) : errorModeration ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorModeration}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
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
              <Card key={signalement.id} className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
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

                      {signalement.entity_title && (
                        <Alert className="mt-2 mb-2 bg-muted/50">
                          <AlertDescription className="text-sm">
                            <strong>{t('admin.moderation.concernedElement', 'Élément concerné')}:</strong>{' '}
                            {signalement.entity_title}
                          </AlertDescription>
                        </Alert>
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
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('admin.moderation.actions.dismiss', 'Ignorer')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(signalement.id, 'avertissement')}
                        title={t('admin.moderation.actions.warn', 'Avertir')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {t('admin.moderation.actions.warn', 'Avertir')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(signalement.id, 'suppression_contenu')}
                        title={t('admin.moderation.actions.removeContent', 'Supprimer le contenu')}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('admin.moderation.actions.removeContent', 'Supprimer')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(signalement.id, 'suspension_temporaire')}
                        title={t('admin.moderation.actions.suspend', 'Suspendre l\'utilisateur')}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        {t('admin.moderation.actions.suspend', 'Suspendre')}
                      </Button>
                    </div>
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

export default AdminModerationTab;
