/**
 * Lieux publiés de la carte d'exploration (sites et points de visite), chargés une fois et partagés par la carte et
 * les rubriques de la page Patrimoine (Incontournables, Près de vous, par wilaya). 2026-11-19.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { httpClient } from '@/services/httpClient';

/** Ligne du serveur : [id, nom, lat, lng, type, idParent, idCommune, idDaira, idWilaya, nbPoints, image] */
type Ligne = [number, string, number, number, string, number | null, number, number, number, number, string | null];
export interface LieuCarte {
  id: number; nom: string; lat: number; lng: number; type: string; parent: number | null;
  commune: number; daira: number; wilaya: number; nbPoints: number; image: string | null;
}
const lire = (l: Ligne): LieuCarte => ({
  id: l[0], nom: l[1], lat: l[2], lng: l[3], type: l[4], parent: l[5], commune: l[6], daira: l[7], wilaya: l[8], nbPoints: l[9], image: l[10]
});

/**
 * `actif: false` (économie de données) : rien n'est téléchargé, mais les lieux déjà chargés par la carte
 * sont rendus. Une réponse en échec est une erreur (avant : carte vide, sans message ni « Réessayer »).
 */
export function useLieuxCarte({ actif = true }: { actif?: boolean } = {}) {
  const { i18n } = useTranslation();
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['carte-exploration', i18n.language],
    queryFn: async () => {
      const r = await httpClient.get<Ligne[]>('/patrimoine/carte-exploration');
      if (!r.success || !Array.isArray(r.data)) throw new Error(r.error || 'carte-exploration');
      return r.data.map(lire);
    },
    enabled: actif,
    staleTime: 5 * 60 * 1000,
    // Langue changée : les lieux restent affichés le temps de recevoir les noms traduits
    placeholderData: (precedent) => precedent
  });
  return { lieux: data, isLoading: isLoading && actif, isError, isFetching, reessayer: () => { void refetch(); } };
}

/** Distance à vol d'oiseau, en km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Incontournables : d'abord les sites avec photo, puis les plus riches en points de visite (la rubrique reste pleine
 * tant que peu de lieux ont une photo)
 */
export function incontournables(lieux: LieuCarte[], n = 8): LieuCarte[] {
  return lieux.filter((l) => !l.parent && (l.image || l.nbPoints > 0))
    .sort((a, b) => (Number(!a.image) - Number(!b.image)) || b.nbPoints - a.nbPoints || a.nom.localeCompare(b.nom)).slice(0, n);
}

/** Sites les plus proches d'une position (dans un rayon), du plus proche au plus loin */
export function presDe(lieux: LieuCarte[], pos: { lat: number; lng: number }, n = 8, rayonKm = 150): Array<LieuCarte & { km: number }> {
  return lieux.filter((l) => !l.parent).map((l) => ({ ...l, km: distanceKm(pos, l) }))
    .filter((l) => l.km <= rayonKm).sort((a, b) => a.km - b.km).slice(0, n);
}

/** Nombre de sites par wilaya (identifiant de wilaya), du plus riche au moins riche */
export function sitesParWilaya(lieux: LieuCarte[]): Array<{ wilaya: number; n: number }> {
  const c = new Map<number, number>();
  for (const l of lieux) if (!l.parent) c.set(l.wilaya, (c.get(l.wilaya) || 0) + 1);
  return [...c.entries()].map(([wilaya, n]) => ({ wilaya, n })).sort((a, b) => b.n - a.n);
}
