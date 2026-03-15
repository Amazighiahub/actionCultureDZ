/**
 * AdminUsersTab - Gestion des utilisateurs
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users, Search, CheckCircle, XCircle,
  MoreVertical, Mail, Shield, Trash2, RefreshCw, X, AlertCircle
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

// Helper pour extraire le texte d'un champ multilingue {fr, ar, en} ou string
const getLocalizedText = (value: any, fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.fr || value.ar || value.en || Object.values(value).find(v => typeof v === 'string' && v) || fallback;
  }
  return String(value);
};

// Types de filtres
const STATUS_OPTIONS = ['tous', 'actif', 'en_attente_validation', 'inactif', 'suspendu', 'banni'];
const VALIDATION_OPTIONS = ['tous', 'en_attente', 'valide', 'rejete'];
const TYPE_OPTIONS = ['tous', 'visiteur', 'artiste', 'organisateur', 'guide', 'artisan'];

const AdminUsersTab: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [validationFilter, setValidationFilter] = useState('tous');

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const {
    allUsers,
    loadingAllUsers,
    errorAllUsers,
    validateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    refreshAll
  } = useDashboardAdmin('users');

  // Filtrer les utilisateurs
  const filteredUsers = React.useMemo(() => {
    if (!allUsers?.items) return [];

    return allUsers.items.filter((user: any) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const nom = getLocalizedText(user.nom);
        const prenom = getLocalizedText(user.prenom);
        const matchesSearch =
          nom.toLowerCase().includes(searchLower) ||
          prenom.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtre de statut
      if (statusFilter !== 'tous' && user.statut !== statusFilter) {
        return false;
      }

      // Filtre de validation
      if (validationFilter !== 'tous' && user.statut_validation !== validationFilter) {
        return false;
      }

      // Filtre de type
      if (typeFilter !== 'tous' && getLocalizedText(user.type_user) !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [allUsers, debouncedSearch, statusFilter, validationFilter, typeFilter]);

  const hasActiveFilters = searchQuery || statusFilter !== 'tous' || validationFilter !== 'tous' || typeFilter !== 'tous';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('tous');
    setValidationFilter('tous');
    setTypeFilter('tous');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t('admin.users.title', 'Gestion des utilisateurs')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.users.count', '{{count}} utilisateur(s)', { count: filteredUsers.length })}
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
                placeholder={t('admin.users.searchPlaceholder', 'Rechercher par nom, email...')}
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
                      : t(`admin.users.statuses.${status}`, status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={validationFilter} onValueChange={setValidationFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.validation', 'Validation')} />
              </SelectTrigger>
              <SelectContent>
                {VALIDATION_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v === 'tous'
                      ? t('common.allValidations', 'Toutes validations')
                      : t(`admin.users.validations.${v}`, v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.type', 'Type')} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'tous'
                      ? t('common.allTypes', 'Tous les types')
                      : t(`admin.users.types.${type}`, type)}
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

      {/* Liste des utilisateurs */}
      {loadingAllUsers ? (
        <LoadingSkeleton type="table" count={5} />
      ) : errorAllUsers ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{errorAllUsers}</p>
          <Button onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Réessayer')}
          </Button>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          type="default"
          title={t('admin.users.noUsers', 'Aucun utilisateur')}
          description={t('admin.users.noUsersDesc', 'Aucun utilisateur ne correspond à vos critères de recherche')}
          action={hasActiveFilters ? {
            label: t('common.resetFilters', 'Réinitialiser'),
            onClick: resetFilters
          } : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user: any) => (
            <Card key={user.id_user} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {user.photo_url ? (
                    <LazyImage
                      src={user.photo_url}
                      alt={`${user.prenom} ${user.nom}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {getLocalizedText(user.prenom)} {getLocalizedText(user.nom)}
                      </p>
                      <StatusBadge status={user.statut || 'en_attente'} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getLocalizedText(user.type_user, 'visiteur')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t('admin.users.registeredOn', 'Inscrit le {{date}}', {
                          date: formatDate(user.date_creation || user.date_inscription)
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {user.statut_validation === 'en_attente' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateUser({ userId: user.id_user, validated: false })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t('common.reject', 'Rejeter')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => validateUser({ userId: user.id_user, validated: true })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('common.validate', 'Valider')}
                        </Button>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          {t('admin.users.sendEmail', 'Envoyer un email')}
                        </DropdownMenuItem>
                        {user.statut === 'suspendu' ? (
                          <DropdownMenuItem onClick={() => reactivateUser({ userId: user.id_user })}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('admin.users.reactivate', 'Réactiver')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => suspendUser({ userId: user.id_user, duration: 7, reason: 'Suspension temporaire' })}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {t('admin.users.suspend', 'Suspendre')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteUser({ userId: user.id_user })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete', 'Supprimer')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
