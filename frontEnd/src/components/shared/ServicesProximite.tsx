/**
 * ServicesProximite — Affiche les services liés à un lieu
 * Utilisé dans EventDetailsPage et PatrimoineDetail
 * Types: restaurant, hotel, guide, transport, artisanat, location, autre
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Utensils, Hotel, Navigation, Car, Palette, MapPin, Globe,
  Phone, Mail, Clock, ChevronRight, Star, CheckCircle2, XCircle,
  ExternalLink
} from 'lucide-react';
import { lieuService } from '@/services/lieu.service';

// Icônes et couleurs par type de service
const SERVICE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  restaurant: { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950/30', label: 'Restaurant' },
  hotel: { icon: Hotel, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/30', label: 'Hébergement' },
  guide: { icon: Navigation, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/30', label: 'Guide' },
  transport: { icon: Car, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-950/30', label: 'Transport' },
  artisanat: { icon: Palette, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/30', label: 'Artisanat' },
  location: { icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-950/30', label: 'Location' },
  autre: { icon: Star, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-950/30', label: 'Autre' },
};

interface ServiceItem {
  id: number;
  nom: string | { fr?: string; ar?: string; en?: string };
  description?: string | { fr?: string; ar?: string; en?: string };
  type_service?: string;
  disponible?: boolean;
  telephone?: string;
  email?: string;
  site_web?: string;
  horaires?: string | { fr?: string; ar?: string; en?: string };
  tarif_min?: number;
  tarif_max?: number;
  photo_url?: string;
  adresse?: string | { fr?: string; ar?: string; en?: string };
}

interface ServicesProximiteProps {
  lieuId: number;
  lieuName?: string;
  services?: ServiceItem[];
  variant?: 'full' | 'compact' | 'sidebar';
  showTitle?: boolean;
  maxItems?: number;
}

const translate = (value: string | { fr?: string; ar?: string; en?: string } | null | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang as keyof typeof value] || value.fr || value.ar || value.en || '';
};

const ServicesProximite: React.FC<ServicesProximiteProps> = ({
  lieuId,
  lieuName,
  services: initialServices,
  variant = 'full',
  showTitle = true,
  maxItems,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const [services, setServices] = useState<ServiceItem[]>(initialServices || []);
  const [loading, setLoading] = useState(!initialServices);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialServices) {
      setServices(initialServices);
      setLoading(false);
      return;
    }

    if (!lieuId || lieuId <= 0) {
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      setLoading(true);
      try {
        const response = await lieuService.getServices(lieuId);
        if (response.success && response.data) {
          setServices(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Erreur chargement services du lieu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [lieuId, initialServices]);

  if (loading) {
    return (
      <div className="space-y-3">
        {showTitle && <Skeleton className="h-6 w-48" />}
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    if (variant === 'sidebar') return null;
    return (
      <Card className="text-center py-8">
        <CardContent>
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            {t('services.none', 'Aucun service disponible pour ce lieu')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Grouper par type
  const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    const type = s.type_service || 'autre';
    if (!acc[type]) acc[type] = [];
    acc[type].push(s);
    return acc;
  }, {});

  const displayServices = maxItems && !expanded ? services.slice(0, maxItems) : services;

  // ============================
  // Variante SIDEBAR (compacte)
  // ============================
  if (variant === 'sidebar') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('services.nearby', 'Services à proximité')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayServices.map((service, idx) => {
            const config = SERVICE_CONFIG[service.type_service || 'autre'] || SERVICE_CONFIG.autre;
            const Icon = config.icon;
            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                <span className="truncate">{translate(service.nom, lang)}</span>
                {service.disponible === false && (
                  <Badge variant="outline" className="text-xs ml-auto">Fermé</Badge>
                )}
              </div>
            );
          })}
          {maxItems && services.length > maxItems && !expanded && (
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setExpanded(true)}>
              +{services.length - maxItems} {t('common.more', 'autres')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ============================
  // Variante COMPACT (liste)
  // ============================
  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('services.nearby', 'Services à proximité')}
            {lieuName && <span className="text-sm font-normal text-muted-foreground">— {lieuName}</span>}
          </h3>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {displayServices.map((service, idx) => {
            const config = SERVICE_CONFIG[service.type_service || 'autre'] || SERVICE_CONFIG.autre;
            const Icon = config.icon;
            return (
              <Card key={idx} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{translate(service.nom, lang)}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                  {service.disponible !== undefined && (
                    service.disponible
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {maxItems && services.length > maxItems && !expanded && (
          <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
            {t('common.showAll', 'Voir tous les services')} ({services.length})
          </Button>
        )}
      </div>
    );
  }

  // ============================
  // Variante FULL (détaillée, groupée)
  // ============================
  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('services.availableServices', 'Services disponibles')}
            {lieuName && <span className="text-sm font-normal text-muted-foreground">— {lieuName}</span>}
          </h3>
          <Badge variant="secondary">{services.length} {t('services.count', 'services')}</Badge>
        </div>
      )}

      {/* Types de services en badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([type, items]) => {
          const config = SERVICE_CONFIG[type] || SERVICE_CONFIG.autre;
          const Icon = config.icon;
          return (
            <Badge key={type} variant="outline" className="gap-1.5 py-1">
              <Icon className={`h-3 w-3 ${config.color}`} />
              {config.label} ({items.length})
            </Badge>
          );
        })}
      </div>

      {/* Carte par type */}
      {Object.entries(grouped).map(([type, items]) => {
        const config = SERVICE_CONFIG[type] || SERVICE_CONFIG.autre;
        const Icon = config.icon;
        return (
          <div key={type} className="space-y-3">
            <h4 className={`font-medium flex items-center gap-2 ${config.color}`}>
              <Icon className="h-4 w-4" />
              {config.label}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((service, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{translate(service.nom, lang)}</p>
                          {service.disponible !== undefined && (
                            <span className={`text-xs ${service.disponible ? 'text-green-600' : 'text-red-500'}`}>
                              {service.disponible
                                ? t('services.open', '● Disponible')
                                : t('services.closed', '● Indisponible')}
                            </span>
                          )}
                        </div>
                      </div>
                      {service.tarif_min != null && (
                        <Badge variant="secondary" className="text-xs">
                          {service.tarif_min === service.tarif_max || !service.tarif_max
                            ? `${service.tarif_min} DA`
                            : `${service.tarif_min}–${service.tarif_max} DA`}
                        </Badge>
                      )}
                    </div>

                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {translate(service.description, lang)}
                      </p>
                    )}

                    {/* Informations de contact */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {service.telephone && (
                        <a href={`tel:${service.telephone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {service.telephone}
                        </a>
                      )}
                      {service.email && (
                        <a href={`mailto:${service.email}`} className="flex items-center gap-1 hover:text-primary">
                          <Mail className="h-3 w-3" />
                          {service.email}
                        </a>
                      )}
                      {service.site_web && (
                        <a href={service.site_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                          <Globe className="h-3 w-3" />
                          {t('services.website', 'Site web')}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {service.horaires && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {translate(service.horaires, lang)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ServicesProximite;
