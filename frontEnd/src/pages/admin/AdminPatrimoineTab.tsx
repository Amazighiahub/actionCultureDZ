/**
 * AdminPatrimoineTab - Onglet de gestion du patrimoine
 */
import React, { useState, useCallback } from 'react';
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
  SelectValue
} from '@/components/UI/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/UI/dropdown-menu';
import {
  Search, MoreVertical, CheckCircle, XCircle,
  Edit, Trash2, Eye, RefreshCw, MapPin, Award
} from 'lucide-react';

// Composants partagés
import { 
  LazyImage, 
  Pagination, 
  ConfirmDialog, 
  EmptyState, 
  LoadingSkeleton,
  StatusBadge 
} from '@/components/shared';

// Hook (à créer selon le même modèle)
import { useDebounce } from '@/hooks/useAdmin';

// Types
interface Patrimoine {
  id_patrimoine: number;
  nom: string;
  description?: string;
  type?: string;
  wilaya?: string;
  image_url?: string;
  statut: string;
  est_unesco?: boolean;
  visites?: number;
}

const AdminPatrimoineTab: React.FC = () => {
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [wilayaFilter, setWilayaFilter] = useState('tous');
  const [patrimoines, setPatrimoines] = useState<Patrimoine[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Patrimoine | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Mock data pour l'exemple
  React.useEffect(() => {
    setLoading(true);
    // Simuler un chargement
    setTimeout(() => {
      setPatrimoines([
        {
          id_patrimoine: 1,
          nom: 'Casbah d\'Alger',
          type: 'Site historique',
          wilaya: 'Alger',
          statut: 'valide',
          est_unesco: true,
          visites: 15000,
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
        },
        {
          id_patrimoine: 2,
          nom: 'Timgad',
          type: 'Site archéologique',
          wilaya: 'Batna',
          statut: 'valide',
          est_unesco: true,
          visites: 8500,
          image_url: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400'
        },
        {
          id_patrimoine: 3,
          nom: 'Vallée du M\'Zab',
          type: 'Patrimoine culturel',
          wilaya: 'Ghardaïa',
          statut: 'en_attente',
          est_unesco: true,
          visites: 5200
        }
      ]);
      setLoading(false);
    }, 500);
  }, [debouncedSearch, typeFilter, wilayaFilter]);

  const handleView = (id: number) => {
    window.open(`/patrimoine/${id}`, '_blank');
  };

  const handleEdit = (item: Patrimoine) => {
    console.log('Edit patrimoine:', item);
  };

  const handleDelete = (id: number) => {
    const item = patrimoines.find(p => p.id_patrimoine === id);
    if (item) {
      setSelectedItem(item);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (selectedItem) {
      // API call here
      setPatrimoines(prev => prev.filter(p => p.id_patrimoine !== selectedItem.id_patrimoine));
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="card" count={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.patrimoine.title', 'Gestion du patrimoine')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.patrimoine.searchPlaceholder', 'Rechercher...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">{t('admin.patrimoine.filters.allTypes')}</SelectItem>
                <SelectItem value="site_historique">{t('admin.patrimoine.types.historicalSite')}</SelectItem>
                <SelectItem value="site_archeologique">{t('admin.patrimoine.types.archaeologicalSite')}</SelectItem>
                <SelectItem value="monument">{t('admin.patrimoine.types.monument')}</SelectItem>
                <SelectItem value="musee">{t('admin.patrimoine.types.museum')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Wilaya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">{t('admin.patrimoine.filters.allWilayas')}</SelectItem>
                <SelectItem value="alger">{t('wilayas.alger')}</SelectItem>
                <SelectItem value="oran">{t('wilayas.oran')}</SelectItem>
                <SelectItem value="constantine">{t('wilayas.constantine')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {patrimoines.length === 0 ? (
        <EmptyState type="locations" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patrimoines.map((item) => (
            <Card key={item.id_patrimoine} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40">
                <LazyImage
                  src={item.image_url || '/images/placeholder-patrimoine.png'}
                  alt={item.nom}
                  className="w-full h-full object-cover"
                  fallback="/images/placeholder-patrimoine.png"
                />
                <div className="absolute top-2 left-2 flex gap-2">
                  <StatusBadge status={item.statut} size="sm" />
                  {item.est_unesco && (
                    <Badge className="bg-blue-500 text-white gap-1">
                      <Award className="h-3 w-3" />
                      UNESCO
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.nom}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{item.wilaya}</span>
                      <span>•</span>
                      <span>{item.type}</span>
                    </div>
                    {item.visites && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.patrimoine.visits', { count: item.visites.toLocaleString() })}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(item.id_patrimoine)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id_patrimoine)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog suppression */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('admin.patrimoine.deleteDialog.title')}
        description={t('admin.patrimoine.deleteDialog.description', { name: selectedItem?.nom })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminPatrimoineTab;
