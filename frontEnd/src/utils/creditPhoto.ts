/**
 * Crédit et droits d'une photo de lieu : photographe ou source, et licence.
 * Valeurs identiques au serveur (services/patrimoine/creditPhoto.js).
 */
import type { TFunction } from 'i18next';

export type LicencePhoto = 'tous_droits_reserves' | 'cc_by' | 'cc_by_sa' | 'domaine_public';

export const LICENCES_PHOTO: Array<{ valeur: LicencePhoto; cle: string; defaut: string; court: string }> = [
  { valeur: 'tous_droits_reserves', cle: 'credit.licences.tousDroits', defaut: 'Tous droits réservés (accord du photographe)', court: 'Tous droits réservés' },
  { valeur: 'cc_by', cle: 'credit.licences.ccBy', defaut: 'Photo libre avec mention de l’auteur (CC BY)', court: 'CC BY' },
  { valeur: 'cc_by_sa', cle: 'credit.licences.ccBySa', defaut: 'Photo libre avec mention, partage à l’identique (CC BY-SA, ex. Wikimedia Commons)', court: 'CC BY-SA' },
  { valeur: 'domaine_public', cle: 'credit.licences.domainePublic', defaut: 'Domaine public (photo gratuite, sans droits)', court: 'Domaine public' }
];

export interface CreditPhoto {
  credit?: string | null;
  licence?: string | null;
}

/** Mention affichée sur la photo : « © Amina Brahimi · CC BY-SA », ou rien si non renseignée */
export function mentionCredit(media: CreditPhoto, t: TFunction): string {
  const licence = LICENCES_PHOTO.find(l => l.valeur === media.licence);
  const libelle = licence && licence.valeur !== 'tous_droits_reserves'
    ? t(`${licence.cle}Court`, licence.court)
    : '';
  const auteur = media.credit?.trim();
  if (!auteur && !libelle) return '';
  return [auteur ? `© ${auteur}` : '', libelle].filter(Boolean).join(' · ');
}
