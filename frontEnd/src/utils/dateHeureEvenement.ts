/**
 * Date et heure d'un événement, à l'heure de l'Algérie (UTC+1, pas d'heure d'été).
 * Le serveur stocke un instant (ISO, en UTC). Un événement enregistré sans heure est à
 * minuit UTC : on n'affiche alors pas d'heure.
 */
const FUSEAU = 'Africa/Algiers';

export function partiesEvenement(iso?: string | null): { date: string; heure: string } {
  if (!iso) return { date: '', heure: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: String(iso).slice(0, 10), heure: '' };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(d).map(p => [p.type, p.value])
  );
  const sansHeure = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    heure: sansHeure ? '' : `${parts.hour}:${parts.minute}`
  };
}

/** « 10:00 » à l'heure de l'Algérie, '' si l'événement n'a pas d'heure */
export function heureEvenement(iso?: string | null): string {
  return partiesEvenement(iso).heure;
}
