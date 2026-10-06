/**
 * Icônes par défaut des marqueurs Leaflet, servies par le site (bundle Vite)
 * au lieu de cdnjs : pas de requête vers un tiers, et version alignée sur le
 * paquet leaflet installé. Importer ce module une fois suffit (effet de bord).
 */
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Leaflet devine le chemin des images via le CSS, ce qui échoue avec un bundler
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
