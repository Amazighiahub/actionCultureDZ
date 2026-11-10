/**
 * Numéros de téléphone : une seule source pour le composant PhoneInput et les formulaires.
 */

/** « +213 555 12 34 56 » → indicatif « +213 » et numéro « 555 12 34 56 » (sans indicatif : Algérie) */
export function splitPhone(value: string): { dialCode: string; local: string } {
  const match = String(value || '').match(/^(\+\d{1,4})\s?(.*)$/);
  if (match) return { dialCode: match[1], local: match[2] };
  return { dialCode: '+213', local: String(value || '') };
}

/**
 * Numéro prêt à enregistrer : « +213555123456 ».
 * - Seul l'indicatif saisi (champ effacé) : vide. Avant, « +213 » restait et bloquait l'inscription
 *   sur « Numéro de téléphone invalide » alors que le champ est facultatif (audit V11 FRM-4).
 * - Le 0 de tête, habitude algérienne (« 0555… »), est retiré après l'indicatif : avant, le numéro
 *   était enregistré « +2130555… » (audit V11 FRM-10).
 */
export function normaliserTelephone(valeur?: string | null): string {
  const { dialCode, local } = splitPhone(valeur || '');
  const chiffres = local.replace(/\D/g, '').replace(/^0+/, '');
  return chiffres ? `${dialCode}${chiffres}` : '';
}

/** Numéro valable : vide (facultatif) ou indicatif + 7 à 15 chiffres */
export const telephoneValide = (valeur?: string | null): boolean => {
  const n = normaliserTelephone(valeur);
  return !n || /^\+\d{7,15}$/.test(n);
};
