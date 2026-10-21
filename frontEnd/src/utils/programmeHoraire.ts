/**
 * Horaires d'une activité de programme.
 * Le serveur renvoie le jour à part (date_programme, « 2026-10-29 ») et des heures seules
 * (colonne TIME, « 10:00:00 ») ; d'anciennes réponses ou les formulaires utilisent
 * « 2026-10-29T10:00:00 ». Ces fonctions acceptent les deux formes.
 */

/** Jour de l'activité (« AAAA-MM-JJ »), ou '' s'il est inconnu */
export function jourProgramme(p: { date_programme?: unknown; heure_debut?: string | null }): string {
  const source = p.date_programme
    ? String(p.date_programme)
    : (p.heure_debut && p.heure_debut.includes('T') ? p.heure_debut : '');
  return /^\d{4}-\d{2}-\d{2}/.test(source) ? source.slice(0, 10) : '';
}

/** « HH:MM » depuis « 10:00:00 » ou « 2026-10-29T10:00:00 », '' sinon */
export function heureProgramme(h?: string | null): string {
  if (!h) return '';
  const heure = h.includes('T') ? h.split('T')[1] : h;
  return heure && /^\d{2}:\d{2}/.test(heure) ? heure.substring(0, 5) : '';
}

/** Durée en minutes entre deux heures (mêmes formats), 0 si l'une manque */
export function dureeMinutes(debut?: string | null, fin?: string | null): number {
  const enMinutes = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  const d = heureProgramme(debut);
  const f = heureProgramme(fin);
  if (!d || !f) return 0;
  return Math.max(0, enMinutes(f) - enMinutes(d));
}
