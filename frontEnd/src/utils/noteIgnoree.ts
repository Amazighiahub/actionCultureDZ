import type { TFunction } from 'i18next';

/** Explication quand le serveur a publié le commentaire sans sa note (une note par personne, pas sur son propre contenu) */
export function messageNoteIgnoree(donnees: unknown, t: TFunction): string | null {
  const raison = (donnees as { note_ignoree?: string } | null)?.note_ignoree;
  if (raison === 'deja_note') return t('comments.noteDejaDonnee', 'Votre commentaire est publié, sans note : vous avez déjà noté ce contenu (une seule note par personne).');
  if (raison === 'proprietaire') return t('comments.noteProprietaire', 'Votre commentaire est publié, sans note : on ne note pas son propre contenu.');
  return null;
}
