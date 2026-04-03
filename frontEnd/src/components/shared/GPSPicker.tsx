/**
 * GPSPicker - Sélecteur de position GPS
 * 3 façons de localiser :
 * 1. Recherche d'adresse (Nominatim/OSM) → GPS auto
 * 2. Clic sur la carte → GPS auto
 * 3. Saisie manuelle des coordonnées GPS
 * + Bouton géolocalisation du téléphone
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const MapClickHandler: React.FC<{ onPositionChange: (lat: number, lng: number) => void }> = ({ onPositionChange }) => {
  useMapEvents({ click(e) { onPositionChange(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat !== 0 && lng !== 0) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const GPSPicker: React.FC<GPSPickerProps> = ({ latitude, longitude, onPositionChange, error }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showManualGPS, setShowManualGPS] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const hasPosition = latitude !== 0 && longitude !== 0;
  const defaultCenter: [number, number] = [36.75, 3.05];
  const center: [number, number] = hasPosition ? [latitude, longitude] : defaultCenter;

  // Recherche d'adresse via Nominatim (OSM gratuit)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const query = `${searchQuery.trim()}, Algeria`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=dz`);
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast({ title: t('patrimoine.gps.noResults', 'Aucun résultat'), description: t('patrimoine.gps.noResultsDesc', 'Essayez un autre terme ou cliquez sur la carte.') });
      }
    } catch {
      toast({ title: t('patrimoine.gps.error'), description: t('patrimoine.gps.searchFailed', 'Erreur de recherche'), variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toast, t]);

  const selectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onPositionChange(lat, lng);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  // Saisie manuelle GPS
  const applyManualGPS = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: t('patrimoine.gps.error'), description: t('patrimoine.gps.invalidCoords', 'Coordonnées invalides. Latitude: -90 à 90, Longitude: -180 à 180.'), variant: 'destructive' });
      return;
    }
    onPositionChange(lat, lng);
    setShowManualGPS(false);
  };

  // Géolocalisation
  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: t('patrimoine.gps.unavailable', 'Géolocalisation non disponible'), variant: 'destructive' });
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
          1: t('patrimoine.gps.denied', 'Accès refusé. Autorisez la géolocalisation.'),
          2: t('patrimoine.gps.unavailablePos', 'Position indisponible. Cliquez sur la carte.'),
          3: t('patrimoine.gps.timeout', 'Délai dépassé. Réessayez.'),
        };
        toast({ title: t('patrimoine.gps.error', 'Erreur'), description: messages[err.code] || messages[2], variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onPositionChange, toast, t]);

  return (
    <div className="space-y-3">
      <Label>{t('patrimoine.fields.position', 'Position sur la carte')}</Label>

      {/* Recherche d'adresse */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            placeholder={t('patrimoine.gps.searchPlaceholder', 'Rechercher une adresse, un lieu...')}
            className="pl-9"
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="button" onClick={handleSearch} disabled={searching || searchQuery.trim().length < 3} size="icon" variant="outline">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleGeolocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        </Button>
      </div>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto bg-background">
          {searchResults.map((r, i) => (
            <button key={i} type="button" className="w-full text-left p-2 hover:bg-muted text-sm flex items-start gap-2" onClick={() => selectResult(r)}>
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Carte */}
      <div className="rounded-lg overflow-hidden border" style={{ height: 250 }}>
        <MapContainer center={center} zoom={hasPosition ? 13 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onPositionChange={onPositionChange} />
          <RecenterMap lat={latitude} lng={longitude} />
          {hasPosition && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>

      {/* Coordonnées + options */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {hasPosition
            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : t('patrimoine.fields.clickMap', 'Cliquez sur la carte ou recherchez une adresse')
          }
        </p>
        <Button type="button" variant="link" size="sm" className="text-xs" onClick={() => setShowManualGPS(!showManualGPS)}>
          {t('patrimoine.gps.manual', 'Saisie manuelle GPS')}
        </Button>
      </div>

      {/* Saisie manuelle */}
      {showManualGPS && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Latitude</Label>
            <Input type="number" step="any" placeholder="36.7538" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Longitude</Label>
            <Input type="number" step="any" placeholder="3.0588" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={applyManualGPS}>OK</Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default GPSPicker;
