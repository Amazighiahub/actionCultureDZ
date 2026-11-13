/**
 * Parcours de visite : itinéraire Google Maps et texte à envoyer (audit V11 OUT-21).
 * Avant : l'adresse était faite avec les NOMS des étapes, non encodés (« /dir/Kalâa des Béni
 * Hammad/… ») : elle se cassait avec les espaces, les « / » et l'arabe, et visait de mauvais points.
 * Maintenant : coordonnées, format officiel « api=1 » (ouvert aussi par l'application Google Maps).
 */

export interface PointParcours { nom: string; latitude?: number | null; longitude?: number | null }
export type ModeTransport = 'marche' | 'velo' | 'voiture';

const MODE_GOOGLE: Record<ModeTransport, string> = { marche: 'walking', velo: 'bicycling', voiture: 'driving' };
/** Google Maps accepte 9 étapes intermédiaires au plus dans un lien */
const ETAPES_MAX = 9;

const coord = (p: PointParcours): string | null => {
  const la = Number(p.latitude); const lo = Number(p.longitude);
  return Number.isFinite(la) && Number.isFinite(lo) && (la !== 0 || lo !== 0) ? `${la},${lo}` : null;
};

/** Itinéraire du site de départ à la dernière étape, en passant par les autres (dans l'ordre) */
export function lienItineraire(depart: PointParcours, etapes: PointParcours[], mode: ModeTransport): string | null {
  const origine = coord(depart);
  const points = etapes.map(coord).filter((c): c is string => !!c);
  if (!origine || !points.length) return null;
  const destination = points[points.length - 1];
  const intermediaires = points.slice(0, -1).slice(0, ETAPES_MAX);
  const params = new URLSearchParams({ api: '1', origin: origine, destination, travelmode: MODE_GOOGLE[mode] });
  if (intermediaires.length) params.set('waypoints', intermediaires.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Texte à envoyer : titre, étapes numérotées, lien de l'itinéraire */
export function texteParcours(titre: string, depart: string, etapes: PointParcours[], lien: string | null): string {
  return [
    titre,
    `0. ${depart}`,
    ...etapes.map((e, i) => `${i + 1}. ${e.nom}`),
    lien
  ].filter(Boolean).join('\n');
}
