/**
 * CarteInteractiveUnifiee — Carte Leaflet combinant patrimoine, services et événements
 * Marqueurs colorés par catégorie + filtres toggle + popups détaillés
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/hooks/useFormatDate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  MapPin, Maximize2, Navigation, Landmark, Utensils, Hotel,
  Calendar, Star, Clock, Filter, Eye, EyeOff, Car, Palette, Route
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Custom marker icons par catégorie
const createIcon = (color: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const MARKER_ICONS = {
  patrimoine: createIcon('#3B82F6', '🏛️'),
  restaurant: createIcon('#F97316', '🍽️'),
  hotel: createIcon('#8B5CF6', '🏨'),
  guide: createIcon('#10B981', '🧭'),
  transport: createIcon('#6366F1', '🚗'),
  artisanat: createIcon('#F59E0B', '🎨'),
  evenement: createIcon('#EF4444', '🎭'),
  default: createIcon('#6B7280', '📍'),
};

type MarkerCategory = 'patrimoine' | 'restaurant' | 'hotel' | 'guide' | 'transport' | 'artisanat' | 'evenement';

interface MapMarker {
  id: string;
  category: MarkerCategory;
  position: [number, number];
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
  link?: string;
  extra?: Record<string, string>;
}

// Filtre config
const FILTER_CONFIG: Record<MarkerCategory, { label: string; icon: React.ElementType; color: string }> = {
  patrimoine: { label: 'Patrimoine', icon: Landmark, color: 'text-blue-600' },
  restaurant: { label: 'Restaurants', icon: Utensils, color: 'text-orange-600' },
  hotel: { label: 'Hôtels', icon: Hotel, color: 'text-purple-600' },
  guide: { label: 'Guides', icon: Navigation, color: 'text-emerald-600' },
  transport: { label: 'Transport', icon: Car, color: 'text-indigo-600' },
  artisanat: { label: 'Artisanat', icon: Palette, color: 'text-amber-600' },
  evenement: { label: 'Événements', icon: Calendar, color: 'text-red-600' },
};

interface CarteInteractiveUnifieeProps {
  lieux?: any[];
  services?: any[];
  evenements?: any[];
  parcours?: any[];
  height?: string;
  showFilters?: boolean;
  showFullscreen?: boolean;
  center?: [number, number];
  zoom?: number;
  loading?: boolean;
}

const translate = (value: any, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.fr || value.ar || value.en || '';
};

const CarteInteractiveUnifiee: React.FC<CarteInteractiveUnifieeProps> = ({
  lieux = [],
  services = [],
  evenements = [],
  parcours = [],
  height = '500px',
  showFilters = true,
  showFullscreen = true,
  center = [32.0, 3.0],
  zoom = 6,
  loading = false,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const [carteOuverte, setCarteOuverte] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<MarkerCategory>>(
    new Set(['patrimoine', 'restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'evenement'])
  );

  const toggleFilter = useCallback((category: MarkerCategory) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Transformer les données en marqueurs uniformes
  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [];

    // Lieux patrimoniaux
    lieux.forEach(lieu => {
      if (lieu.latitude && lieu.longitude) {
        result.push({
          id: `lieu-${lieu.id_lieu}`,
          category: 'patrimoine',
          position: [lieu.latitude, lieu.longitude],
          title: translate(lieu.nom, lang),
          subtitle: lieu.wilaya?.nom || lieu.commune?.nom || translate(lieu.adresse, lang),
          description: translate(lieu.DetailLieu?.description || lieu.description, lang),
          badge: lieu.typePatrimoine || lieu.typeLieu,
          link: `/patrimoine/${lieu.id_lieu}`,
        });
      }
    });

    // Services
    services.forEach(service => {
      const lat = service.latitude || service.Lieu?.latitude;
      const lng = service.longitude || service.Lieu?.longitude;
      if (lat && lng) {
        const category = (['restaurant', 'hotel', 'guide', 'transport', 'artisanat'].includes(service.type_service)
          ? service.type_service
          : 'guide') as MarkerCategory;
        result.push({
          id: `service-${service.id}`,
          category,
          position: [lat, lng],
          title: translate(service.nom, lang),
          subtitle: translate(service.adresse, lang),
          description: translate(service.description, lang),
          badge: service.type_service,
          extra: {
            ...(service.telephone ? { telephone: service.telephone } : {}),
            ...(service.tarif_min ? { tarif: `${service.tarif_min}${service.tarif_max ? '–' + service.tarif_max : ''} DA` } : {}),
          },
        });
      }
    });

    // Événements
    evenements.forEach(evt => {
      const lat = evt.Lieu?.latitude || evt.latitude;
      const lng = evt.Lieu?.longitude || evt.longitude;
      if (lat && lng) {
        result.push({
          id: `evt-${evt.id_evenement}`,
          category: 'evenement',
          position: [lat, lng],
          title: translate(evt.nom_evenement || evt.titre, lang),
          subtitle: evt.date_debut ? new Date(evt.date_debut).toLocaleDateString(getDateLocale(lang)) : '',
          description: translate(evt.description, lang),
          badge: evt.statut,
          link: `/evenements/${evt.id_evenement}`,
          extra: {
            ...(evt.Lieu ? { lieu: translate(evt.Lieu.nom, lang) } : {}),
          },
        });
      }
    });

    return result;
  }, [lieux, services, evenements, lang]);

  // Filtrer
  const visibleMarkers = useMemo(() => {
    return markers.filter(m => activeFilters.has(m.category));
  }, [markers, activeFilters]);

  // Statistiques
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    markers.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, [markers]);

  // Lignes de parcours
  const parcoursLines = useMemo(() => {
    return parcours
      .filter(p => p.etapes && p.etapes.length >= 2)
      .map(p => ({
        positions: p.etapes.map((e: any) => [e.latitude, e.longitude] as [number, number]),
        color: p.color || '#6B8E23',
        name: translate(p.nom_parcours, lang),
      }));
  }, [parcours, lang]);

  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  // Map component
  const MapComponent: React.FC<{ mapHeight?: string }> = ({ mapHeight = height }) => (
    <div style={{ height: mapHeight, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        />

        {visibleMarkers.map(marker => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={MARKER_ICONS[marker.category] || MARKER_ICONS.default}
          >
            <Popup maxWidth={280}>
              <div className="p-1 max-w-[260px]">
                <h3 className="font-semibold text-sm mb-1">{marker.title}</h3>
                {marker.subtitle && (
                  <p className="text-xs text-gray-500 mb-1">{marker.subtitle}</p>
                )}
                {marker.badge && (
                  <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 rounded-full mb-1">
                    {marker.badge}
                  </span>
                )}
                {marker.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-1">{marker.description}</p>
                )}
                {marker.extra && Object.entries(marker.extra).map(([key, val]) => (
                  <p key={key} className="text-xs text-gray-500">
                    <strong>{key}:</strong> {val}
                  </p>
                ))}
                {marker.link && (
                  <a
                    href={marker.link}
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    Voir détails →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {parcoursLines.map((line, idx) => (
          <Polyline
            key={idx}
            positions={line.positions}
            color={line.color}
            weight={3}
            opacity={0.7}
          />
        ))}
      </MapContainer>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-serif">
              <Navigation className="h-5 w-5 text-primary" />
              {t('map.title', 'Carte Interactive')}
              <Badge variant="secondary" className="text-xs">
                {visibleMarkers.length} {t('map.points', 'points')}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              {showFullscreen && (
                <Dialog open={carteOuverte} onOpenChange={setCarteOuverte}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Maximize2 className="h-4 w-4 mr-1" />
                      {t('map.fullscreen', 'Plein écran')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl w-[95vw] h-[90vh]">
                    <DialogHeader>
                      <DialogTitle className="font-serif">
                        {t('map.exploration', 'Exploration — Patrimoine, Services & Événements')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 mt-2">
                      <MapComponent mapHeight="calc(90vh - 120px)" />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Filtres */}
        {showFilters && (
          <div className="px-6 pb-3">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(FILTER_CONFIG) as [MarkerCategory, typeof FILTER_CONFIG[MarkerCategory]][]).map(([key, config]) => {
                const count = categoryCounts[key] || 0;
                if (count === 0) return null;
                const isActive = activeFilters.has(key);
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter(key)}
                    className={`gap-1.5 text-xs ${!isActive ? 'opacity-50' : ''}`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label} ({count})
                    {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="relative">
            <MapComponent />
            <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent pointer-events-none rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Parcours */}
      {parcours.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              {t('map.parcours', 'Parcours disponibles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {parcours.map((p: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#6B8E23' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{translate(p.nom_parcours, lang)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.distance_km && <span>{p.distance_km} km</span>}
                      {p.duree_estimee && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {p.duree_estimee} min
                        </span>
                      )}
                      {p.etapes && <span>{p.etapes.length} étapes</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CarteInteractiveUnifiee;
