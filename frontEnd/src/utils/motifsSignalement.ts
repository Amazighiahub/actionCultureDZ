/** Motifs de signalement (valeurs du champ signalement.motif) et clé de leur libellé */
export const MOTIFS_SIGNALEMENT: { valeur: string; cle: string }[] = [
  { valeur: 'contenu_inapproprie', cle: 'admin.moderation.reasons.inappropriateContent' },
  { valeur: 'spam', cle: 'admin.moderation.reasons.spam' },
  { valeur: 'harcelement', cle: 'admin.moderation.reasons.harassment' },
  { valeur: 'violation_droits', cle: 'admin.moderation.reasons.copyright' },
  { valeur: 'faux_contenu', cle: 'admin.moderation.reasons.falseInformation' },
  { valeur: 'incitation_haine', cle: 'admin.moderation.reasons.hateSpeech' },
  { valeur: 'contenu_illegal', cle: 'admin.moderation.reasons.illegalContent' },
  { valeur: 'autre', cle: 'admin.moderation.reasons.other' },
];
