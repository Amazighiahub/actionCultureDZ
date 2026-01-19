/**
 * AdminUsersTab - Gestion des utilisateurs
 * Utilise useDashboardAdmin
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Badge } from '@/components/UI/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/UI/select';
import {
  Users, Search, Filter, CheckCircle, XCircle, 
  MoreVertical, Mail, Shield, Trash2, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';

import { 
  LazyImage, 
  EmptyState, 
  LoadingSkeleton,
  StatusBadge 
} from '@/components/shared';

// ✅ CORRIGÉ: Utilise useDashboardAdmin
import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// Types de filtres
const STATUS_OPTIONS = ['tous', 'actif', 'inactif', 'suspendu', 'en_attente'];
const TYPE_OPTIONS = ['tous', 'visiteur', 'artiste', 'organisateur', 'guide', 'artisan'];

const AdminUsersTab: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');
  
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // ✅ Utilise useDashboardAdmin
  const {
    pendingUsers,
    loadingPendingUsers,
    validateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    refreshAll
  } = useDashboardAdmin();

  // Filtrer les utilisateurs
  const filteredUsers = React.useMemo(() => {
    if (!pendingUsers?.items) return [];
    
    return pendingUsers.items.filter((user: any) => {
      // Filtre de recherche
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          user.nom?.toLowerCase().includes(searchLower) ||
          user.prenom?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtre de statut
      if (statusFilter !== 'tous' && user.statut !== statusFilter) {
        return false;
      }
      
      // Filtre de type
      if (typeFilter !== 'tous' && user.type_user !== typeFilter) {
        return false;
      }
      
      return true;
    });
  }, [pendingUsers, debouncedSearch, statusFilter, typeFilter]);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'success';
      case 'inactif': return 'default';
      case 'suspendu': return 'error';
      case 'en_attente': return 'warning';
      default: return 'default';
    }
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
            {filteredUsers.length} utilisateur(s)
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'tous' ? 'Tous les statuts' : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'tous' ? 'Tous les types' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      {loadingPendingUsers ? (
        <LoadingSkeleton type="table" count={5} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Aucun utilisateur"
          description="Aucun utilisateur ne correspond à vos critères de recherche"
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
                        {user.prenom} {user.nom}
                      </p>
                      <StatusBadge status={getStatusColor(user.statut)} size="sm">
                        {user.statut || 'en_attente'}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {user.type_user || 'visiteur'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Inscrit le {new Date(user.date_inscription).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {user.statut === 'en_attente' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateUser({ userId: user.id_user, validated: false })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => validateUser({ userId: user.id_user, validated: true })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valider
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Envoyer un email
                        </DropdownMenuItem>
                        {user.statut === 'suspendu' ? (
                          <DropdownMenuItem onClick={() => reactivateUser({ userId: user.id_user })}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Réactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => suspendUser({ userId: user.id_user, duration: 7, reason: 'Suspension temporaire' })}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Suspendre
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteUser({ userId: user.id_user })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
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