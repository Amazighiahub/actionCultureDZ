/**
 * AdminOeuvresTab - Gestion des œuvres
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
  BookOpen, Search, CheckCircle, XCircle, 
  MoreVertical, Eye, Trash2, RefreshCw,
  Book, Film, Music, Palette
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
  const currentLang = i18n.language || 'fr';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // ✅ Utilise useDashboardAdmin
  const {
    oeuvres,
    pendingOeuvres,
    loadingOeuvres,
    validateOeuvre,
    deleteOeuvre,
    refreshAll
  } = useDashboardAdmin();

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

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'publie': return 'success';
      case 'en_attente': return 'warning';
      case 'brouillon': return 'default';
      case 'rejete': return 'error';
      default: return 'default';
    }
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
            {filteredOeuvres.length} œuvre(s)
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
                placeholder="Rechercher par titre..."
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

      {/* Liste des œuvres */}
      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : filteredOeuvres.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="Aucune œuvre"
          description="Aucune œuvre ne correspond à vos critères"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOeuvres.map((oeuvre: any) => {
            const TypeIcon = getTypeIcon(oeuvre.type_oeuvre || oeuvre.TypeOeuvre?.nom_type);
            // ✅ Extraire les textes multilingues
            const titre = getLocalizedText(oeuvre.titre, currentLang, 'Sans titre');
            const description = getLocalizedText(oeuvre.description, currentLang, 'Pas de description');
            const typeName = getLocalizedText(
              oeuvre.type_oeuvre || oeuvre.TypeOeuvre?.nom_type, 
              currentLang, 
              'Non défini'
            );
            
            return (
              <Card key={oeuvre.id_oeuvre} className="hover:shadow-md transition-shadow overflow-hidden">
                {/* Image */}
                <div className="aspect-video relative bg-muted">
                  {oeuvre.image_url || oeuvre.medias?.[0]?.url ? (
                    <LazyImage
                      src={oeuvre.image_url || oeuvre.medias?.[0]?.url}
                      alt={titre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={getStatusColor(oeuvre.statut)} size="sm">
                      {oeuvre.statut || 'en_attente'}
                    </StatusBadge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{titre}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeName}
                        </Badge>
                        {oeuvre.note_moyenne && (
                          <Badge variant="secondary" className="text-xs">
                            ⭐ {Number(oeuvre.note_moyenne).toFixed(1)}
                          </Badge>
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
                        {oeuvre.statut === 'en_attente' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeter
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteOeuvre(oeuvre.id_oeuvre)}
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

export default AdminOeuvresTab;