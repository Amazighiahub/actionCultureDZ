/**
 * AdminEvenementsTab - Gestion des événements
 * Utilise useDashboardAdmin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/UI/card';
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
  Calendar, Search, CheckCircle, XCircle, 
  MoreVertical, Eye, Trash2, RefreshCw,
  MapPin, Users, Clock
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
import { getAssetUrl } from '@/helpers/assetUrl';

// ✅ Helper pour extraire le texte multilingue
const getLocalizedText = (value: any, lang: string = 'fr', fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[lang] || value.fr || value.ar || value.en || Object.values(value)[0] || fallback;
  }
  return String(value);
};

// Types de filtres
const STATUS_OPTIONS = ['tous', 'publie', 'brouillon', 'annule', 'termine'];

const AdminEvenementsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'fr';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // ✅ Utilise useDashboardAdmin
  const {
    evenements,
    loadingEvenements,
    deleteEvenement,
    refreshAll
  } = useDashboardAdmin();

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

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'publie': return 'success';
      case 'brouillon': return 'default';
      case 'annule': return 'error';
      case 'termine': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
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
            {filteredEvents.length} événement(s)
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
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Liste des événements */}
      {loadingEvenements ? (
        <LoadingSkeleton type="card" count={4} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="Aucun événement"
          description="Aucun événement ne correspond à vos critères"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event: any) => {
            // ✅ Extraire les textes multilingues
            const nom = getLocalizedText(event.nom_evenement || event.nom, currentLang, 'Sans nom');
            const description = getLocalizedText(event.description, currentLang, 'Pas de description');
            const lieu = getLocalizedText(event.lieu?.nom || event.lieu_nom, currentLang, '');
            
            return (
              <Card key={event.id_evenement} className="hover:shadow-md transition-shadow overflow-hidden">
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
                  <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1">
                    <p className="text-xs font-bold text-primary">
                      {formatDate(event.date_debut)}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={getStatusColor(event.statut)} size="sm">
                      {event.statut || 'brouillon'}
                    </StatusBadge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{nom}</h3>
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
                        {event.nombre_participants !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.nombre_participants} participants
                          </span>
                        )}
                        {event.heure_debut && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.heure_debut}
                          </span>
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </DropdownMenuItem>
                        {event.statut === 'brouillon' && (
                          <DropdownMenuItem>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Publier
                          </DropdownMenuItem>
                        )}
                        {event.statut === 'publie' && (
                          <DropdownMenuItem>
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteEvenement(event.id_evenement)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
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

export default AdminEvenementsTab;