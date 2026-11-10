/**
 * Règles de saisie communes aux formulaires.
 *
 * Les formulaires ont `noValidate` : la bulle du navigateur (« Veuillez renseigner ce champ »,
 * dans la langue du téléphone et non celle du site) ne passe plus avant les messages du site
 * (audit V11 FRM-1). Ces règles remplacent donc les contrôles que faisait le navigateur
 * (type="email", type="url", min, max). Avant, la même expression était recopiée dans chaque page.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIEN_WEB_RE = /^https?:\/\/.+\..+/;

/** Adresse e-mail de forme correcte (espaces autour ignorés) */
export const emailValide = (valeur: string | null | undefined): boolean =>
  EMAIL_RE.test(String(valeur ?? '').trim());

/** Lien web complet, commençant par http:// ou https:// */
export const lienWebValide = (valeur: string | null | undefined): boolean =>
  LIEN_WEB_RE.test(String(valeur ?? '').trim());

/**
 * Nombre facultatif hors des limites : vrai si une valeur est saisie et qu'elle n'est pas un nombre,
 * pas un entier (si demandé), ou en dehors de [min, max]. Vide : faux (le champ est facultatif).
 */
export function nombreHorsLimites(
  valeur: string | number | null | undefined,
  { min, max, entier = false }: { min?: number; max?: number; entier?: boolean }
): boolean {
  if (valeur === null || valeur === undefined || String(valeur).trim() === '') return false;
  const n = typeof valeur === 'number' ? valeur : Number(String(valeur).trim());
  if (!Number.isFinite(n)) return true;
  if (entier && !Number.isInteger(n)) return true;
  if (min !== undefined && n < min) return true;
  if (max !== undefined && n > max) return true;
  return false;
}
