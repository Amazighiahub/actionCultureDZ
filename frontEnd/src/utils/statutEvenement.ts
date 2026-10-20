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
  const fin = dateFin || dateDebut;
  if (!fin) return s;
  const finDate = new Date(fin);
  if (Number.isNaN(finDate.getTime())) return s;
  // Une date sans heure vaut pour toute la journée
  if (typeof fin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fin)) finDate.setHours(23, 59, 59, 999);
  return finDate < maintenant ? 'termine' : s;
}
