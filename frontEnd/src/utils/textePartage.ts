/**
 * Texte prêt à partager (WhatsApp, Messenger…), audit V11 OUT-3 : le titre seul ne disait ni quand
 * ni où. Le lien de la page est ajouté par le partage lui-même (feuille de partage ou WhatsApp).
 * Dates à l'heure de l'Algérie, chiffres occidentaux en arabe (usage algérien, comme le reste du site).
 */
import { partiesEvenement } from '@/utils/dateHeureEvenement';

const FUSEAU = 'Africa/Algiers';
const localeDe = (langue: string) => (langue.startsWith('ar') ? 'ar-DZ-u-nu-latn' : langue.startsWith('en') ? 'en-GB' : 'fr-FR');

/** « 22 décembre 2026 » ou « 20 novembre 2026, 10:00 » (sans heure si l'événement n'en a pas) */
export function dateLisible(iso: string | Date | null | undefined, langue: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = localeDe(langue);
  const jour = d.toLocaleDateString(locale, { timeZone: FUSEAU, day: 'numeric', month: 'long', year: 'numeric' });
  const { heure } = partiesEvenement(typeof iso === 'string' ? iso : d.toISOString());
  return heure ? `${jour}, ${heure}` : jour;
}

/** Événement : « Titre » puis « 📅 date (– date de fin) » et « 📍 lieu » */
export function texteEvenement({ titre, debut, fin, lieu, langue }: {
  titre: string; debut?: string | Date | null; fin?: string | Date | null; lieu?: string | null; langue: string;
}): string {
  const du = dateLisible(debut, langue);
  const au = dateLisible(fin, langue);
  const quand = du && au && au !== du ? `${du} – ${au}` : du;
  return [titre, quand && `📅 ${quand}`, lieu && `📍 ${lieu}`].filter(Boolean).join('\n');
}

/** Lieu ou objet avec une localisation : « Titre » puis « 📍 commune, wilaya » */
export function texteAvecLieu(titre: string, lieu?: string | null): string {
  return [titre, lieu && `📍 ${lieu}`].filter(Boolean).join('\n');
}

/** Lien WhatsApp « envoyer à… » avec le texte et l'adresse de la page */
export function lienWhatsApp(texte: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent([texte, url].filter(Boolean).join('\n'))}`;
}
