/**
 * PointsVisiteCarte - Carte des points de visite d'un site, numérotés dans l'ordre de la visite.
 * Chargée à la demande (leaflet) par PointsVisite.
 */
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIcons';

export interface PointCarte {
  id_lieu: number;
  numero: number;
  nom: string;
  latitude: number;
  longitude: number;
}

interface PointsVisiteCarteProps {
  site: { nom: string; latitude: number; longitude: number };
  points: PointCarte[];
}

// Marqueur numéroté : le visiteur retrouve l'ordre de la liste sur la carte
const iconeNumero = (numero: number) => L.divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font:600 13px system-ui,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${numero}</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

const Cadrage: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [30, 30], maxZoom: 18 });
  }, [map, positions]);
  return null;
};

const PointsVisiteCarte: React.FC<PointsVisiteCarteProps> = ({ site, points }) => {
  const positions = useMemo<[number, number][]>(
    () => [[site.latitude, site.longitude], ...points.map(p => [p.latitude, p.longitude] as [number, number])],
    [site.latitude, site.longitude, points]
  );

  return (
    <div className="h-[280px] rounded-lg overflow-hidden border relative z-0">
      <MapContainer center={[site.latitude, site.longitude]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[site.latitude, site.longitude]}>
          <Popup>{site.nom}</Popup>
        </Marker>
        {points.map(p => (
          <Marker key={p.id_lieu} position={[p.latitude, p.longitude]} icon={iconeNumero(p.numero)}>
            <Popup>
              <Link to={`/patrimoine/${p.id_lieu}`} className="font-medium">{p.numero}. {p.nom}</Link>
            </Popup>
          </Marker>
        ))}
        <Cadrage positions={positions} />
      </MapContainer>
    </div>
  );
};

export default PointsVisiteCarte;
