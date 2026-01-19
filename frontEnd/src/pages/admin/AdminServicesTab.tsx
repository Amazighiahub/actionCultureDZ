/**
 * AdminServicesTab - Onglet de gestion des services
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
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
  Search, MoreVertical, Edit, Trash2, Eye, RefreshCw, 
  Package, Star, MapPin, Phone
} from 'lucide-react';

import { 
  LazyImage, 
  EmptyState, 
  LoadingSkeleton,
  StatusBadge 
} from '@/components/shared';

interface Service {
  id_service: number;
  nom: string;
  type: string;
  wilaya?: string;
  statut: string;
  note_moyenne?: number;
  tarif?: string;
  image_url?: string;
  prestataire?: {
    nom: string;
    prenom: string;
  };
}

const AdminServicesTab: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setServices([
        {
          id_service: 1,
          nom: 'Visite guidée Casbah',
          type: 'guide_touristique',
          wilaya: 'Alger',
          statut: 'actif',
          note_moyenne: 4.8,
          tarif: '3000 DZD/personne',
          prestataire: { nom: 'Benali', prenom: 'Ahmed' }
        },
        {
          id_service: 2,
          nom: 'Atelier poterie traditionnelle',
          type: 'atelier',
          wilaya: 'Tizi Ouzou',
          statut: 'en_attente',
          note_moyenne: 4.5,
          tarif: '2500 DZD',
          prestataire: { nom: 'Mammeri', prenom: 'Fatima' }
        }
      ]);
      setLoading(false);
    }, 500);
  }, [searchQuery, typeFilter]);

  if (loading) {
    return <LoadingSkeleton type="list" count={5} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.services.title', 'Gestion des services')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service..."
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
                <SelectItem value="tous">Tous</SelectItem>
                <SelectItem value="guide_touristique">Guide touristique</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="hebergement">Hébergement</SelectItem>
                <SelectItem value="atelier">Atelier</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {services.length === 0 ? (
        <EmptyState type="products" title="Aucun service" />
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <Card key={service.id_service} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{service.nom}</h4>
                      <StatusBadge status={service.statut} size="sm" />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {service.wilaya && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {service.wilaya}
                        </span>
                      )}
                      {service.note_moyenne && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {service.note_moyenne}
                        </span>
                      )}
                      {service.tarif && <span>{service.tarif}</span>}
                    </div>
                    {service.prestataire && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Par {service.prestataire.prenom} {service.prestataire.nom}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminServicesTab;
