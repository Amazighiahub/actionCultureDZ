/**
 * « Ajouter à mon agenda » (audit V11 OUT-4) : fichier .ics (agenda du téléphone, Outlook, Apple)
 * et lien Google Agenda, fabriqués dans le navigateur.
 *
 * Mêmes règles de dates que le reste du site (utils/statutEvenement.finEffective, backend
 * helpers/finEvenement) :
 * - un jour enregistré sans heure (minuit UTC) vaut toute la journée → événement « journée entière » ;
 * - une heure est un instant (stocké en UTC), envoyé tel quel (suffixe Z) ;
 * - sans date de fin, l'événement à heure fixe n'a pas de durée (l'agenda affiche l'heure de début).
 * Le lien de réunion en ligne n'est jamais mis dans l'agenda : seule l'adresse de la page l'est.
 */

export interface EvenementAgenda {
  id: number;
  titre: string;
  /** Absent ou invalide : pas d'agenda (le bouton ne s'affiche pas) */
  debut?: string | Date | null;
  fin?: string | Date | null;
  lieu?: string | null;
  description?: string | null;
  url: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const sansHeure = (d: Date) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
const jourUtc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const instantUtc = (d: Date) => `${jourUtc(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const lendemain = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
const date = (v?: string | Date | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Début et fin au format des agendas ; null si la date de début manque */
export function bornesAgenda(ev: Pick<EvenementAgenda, 'debut' | 'fin'>):
  | { journee: true; debut: string; finExclue: string }
  | { journee: false; debut: string; fin: string | null }
  | null {
  const debut = date(ev.debut);
  if (!debut) return null;
  const fin = date(ev.fin);
  if (sansHeure(debut)) {
    // Journée(s) entière(s) : le dernier jour est inclus, l'agenda attend le jour suivant (exclu).
    // Début sans heure et fin avec heure : on garde des journées entières jusqu'au jour de la fin.
    const dernier = fin && fin > debut ? fin : debut;
    return { journee: true, debut: jourUtc(debut), finExclue: jourUtc(lendemain(dernier)) };
  }
  return { journee: false, debut: instantUtc(debut), fin: fin && fin > debut ? instantUtc(fin) : null };
}

/** Texte d'agenda : antislash, virgule, point-virgule et retours à la ligne échappés (RFC 5545) */
const echapper = (v: string) => v.replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Lignes de 75 octets au plus (RFC 5545) ; la suite commence par une espace */
function plier(ligne: string): string {
  const morceaux: string[] = [];
  let courant = '';
  let octets = 0;
  for (const car of Array.from(ligne)) {
    const n = new TextEncoder().encode(car).length;
    if (octets + n > (morceaux.length ? 74 : 75)) {
      morceaux.push(courant);
      courant = '';
      octets = 0;
    }
    courant += car;
    octets += n;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

/** Contenu du fichier .ics (null si l'événement n'a pas de date) */
export function fichierIcs(ev: EvenementAgenda, maintenant: Date = new Date()): string | null {
  const b = bornesAgenda(ev);
  if (!b) return null;
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tala DZ//taladz.com//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:evenement-${ev.id}@taladz.com`,
    `DTSTAMP:${instantUtc(maintenant)}`,
    ...(b.journee
      ? [`DTSTART;VALUE=DATE:${b.debut}`, `DTEND;VALUE=DATE:${b.finExclue}`]
      : [`DTSTART:${b.debut}`, ...(b.fin ? [`DTEND:${b.fin}`] : [])]),
    `SUMMARY:${echapper(ev.titre)}`,
    ...(ev.lieu ? [`LOCATION:${echapper(ev.lieu)}`] : []),
    `DESCRIPTION:${echapper([ev.description?.trim().slice(0, 500), ev.url].filter(Boolean).join('\n\n'))}`,
    `URL:${ev.url}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lignes.map(plier).join('\r\n') + '\r\n';
}

/** Lien « Ajouter à Google Agenda » (null si l'événement n'a pas de date) */
export function lienGoogleAgenda(ev: EvenementAgenda): string | null {
  const b = bornesAgenda(ev);
  if (!b) return null;
  const dates = b.journee ? `${b.debut}/${b.finExclue}` : `${b.debut}/${b.fin || b.debut}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.titre,
    dates,
    details: [ev.description?.trim().slice(0, 500), ev.url].filter(Boolean).join('\n\n'),
    ...(ev.lieu ? { location: ev.lieu } : {})
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Télécharge le .ics : sur Android et iPhone, il s'ouvre dans l'agenda */
export function telechargerIcs(ev: EvenementAgenda): boolean {
  const contenu = fichierIcs(ev);
  if (!contenu) return false;
  const blob = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evenement-${ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
