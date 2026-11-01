/**
 * Statut affiché d'un événement : un événement planifié, publié ou en cours dont la date
 * est passée s'affiche « Terminé » (le statut en base n'est pas mis à jour automatiquement,
 * d'où un badge « Planifié » à côté de « Cet événement est passé »).
 */
const STATUTS_ACTIFS = ['planifie', 'publie', 'en_cours'];

export function statutAffiche(
  statut: string | undefined | null,
  dateDebut?: string | Date | null,
  dateFin?: string | Date | null,
  maintenant: Date = new Date()
): string {
  const s = statut || 'brouillon';
  if (!STATUTS_ACTIFS.includes(s)) return s;
  const fin = finEffective(dateDebut, dateFin);
  if (!fin) return s;
  return fin <= maintenant ? 'termine' : s;
}

const UNE_HEURE = 60 * 60 * 1000;

/**
 * Fin réelle, à l'heure de l'Algérie (UTC+1, sans heure d'été) — même règle que le serveur
 * (backend/helpers/finEvenement.js) : un jour enregistré sans heure (minuit UTC, ou « 2026-10-20 »)
 * vaut pour toute la journée ; sans date de fin, l'événement dure jusqu'au soir de son premier jour.
 */
export function finEffective(dateDebut?: string | Date | null, dateFin?: string | Date | null): Date | null {
  const fin = dateFin ? new Date(dateFin) : null;
  const finValide = fin !== null && !Number.isNaN(fin.getTime());
  const sansHeure = (d: Date) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (finValide && !sansHeure(fin)) return fin;
  const ref = finValide ? fin : (dateDebut ? new Date(dateDebut) : null);
  if (!ref || Number.isNaN(ref.getTime())) return null;
  const local = new Date(ref.getTime() + UNE_HEURE);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - UNE_HEURE);
}
