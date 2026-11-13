/**
 * Fond de carte unique du site (OpenStreetMap), choix de la responsable (audit V11 UX-35).
 * Avant : l'adresse des tuiles et la mention de la source étaient recopiées dans sept cartes, avec
 * quatre mentions différentes (« OSM », « © OpenStreetMap », « contributors »…).
 * Les sous-domaines {s} restent : la politique de sécurité du site (nginx, img-src) n'autorise que
 * https://*.tile.openstreetmap.org.
 */
import { TileLayer } from 'react-leaflet';

export const FOND_DE_CARTE = Object.freeze({
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  maxZoom: 19
});

/** Fond OpenStreetMap pour une carte react-leaflet (<MapContainer>) */
export default function FondDeCarte() {
  return <TileLayer url={FOND_DE_CARTE.url} attribution={FOND_DE_CARTE.attribution} maxZoom={FOND_DE_CARTE.maxZoom} />;
}
