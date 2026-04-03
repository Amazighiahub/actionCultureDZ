/**
 * GPSPicker - Sélecteur de position GPS léger
 * - Carte cliquable pour placer un marqueur
 * - Bouton géolocalisation du téléphone
 * - Affichage des coordonnées
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GPSPickerProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  error?: string;
}

// Composant interne pour gérer les clics sur la carte
const MapClickHandler: React.FC<{ onPositionChange: (lat: number, lng: number) => void }> = ({ onPositionChange }) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Composant interne pour recentrer la carte
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.setView([lat, lng], 13);
    }
  }, [lat, lng, map]);
  return null;
};

const GPSPicker: React.FC<GPSPickerProps> = ({ latitude, longitude, onPositionChange, error }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);

  const hasPosition = latitude !== 0 && longitude !== 0;

  const defaultCenter: [number, number] = [36.75, 3.05];
  const center: [number, number] = hasPosition ? [latitude, longitude] : defaultCenter;

  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: t('patrimoine.gps.unavailable', 'Géolocalisation non disponible'), description: t('patrimoine.gps.unavailableDesc', 'Votre appareil ne supporte pas la géolocalisation. Cliquez sur la carte pour placer le marqueur.'), variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPositionChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast({ title: t('patrimoine.gps.found', 'Position trouvée'), description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      },
      (err) => {
        setLocating(false);
        const messages: Record<number, string> = {
          1: t('patrimoine.gps.denied', 'Accès à la position refusé. Autorisez la géolocalisation dans les paramètres.'),
          2: t('patrimoine.gps.unavailablePos', 'Position indisponible. Cliquez sur la carte pour placer le marqueur.'),
          3: t('patrimoine.gps.timeout', 'Délai dépassé. Réessayez ou cliquez sur la carte.'),
        };
        toast({ title: t('patrimoine.gps.error', 'Erreur de géolocalisation'), description: messages[err.code] || messages[2], variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onPositionChange, toast, t]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('patrimoine.fields.position', 'Position sur la carte')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleGeolocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Navigation className="h-4 w-4 mr-1" />}
          {t('patrimoine.fields.myPosition', 'Ma position')}
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border" style={{ height: 250 }}>
        <MapContainer center={center} zoom={hasPosition ? 13 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPositionChange={onPositionChange} />
          <RecenterMap lat={latitude} lng={longitude} />
          {hasPosition && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {hasPosition
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : t('patrimoine.fields.clickMap', 'Cliquez sur la carte ou utilisez "Ma position"')
        }
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default GPSPicker;
