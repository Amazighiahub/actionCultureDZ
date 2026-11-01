/**
 * Sites patrimoine : hors équipe et créateur du site, une modification devient une proposition que
 * l'équipe relit (réponse 202 { proposition: true }). Rien ne change sur la fiche avant son accord.
 */
import type { TFunction } from 'i18next';

export const estProposition = (reponse: unknown): boolean =>
  !!(reponse && typeof reponse === 'object' && (reponse as { proposition?: boolean }).proposition);

/** Message affiché après l'envoi d'une proposition */
export const toastProposition = (t: TFunction) => ({
  title: t('patrimoine.proposition.envoyee', 'Proposition envoyée'),
  description: t('patrimoine.proposition.relecture', 'Merci ! Elle sera publiée après relecture par l’équipe.')
});
