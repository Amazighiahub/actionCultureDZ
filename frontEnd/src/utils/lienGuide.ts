/** Guide du contributeur (page statique public/guide) : version arabe quand le site est en arabe */
export const lienGuide = (langue?: string): string => (langue?.startsWith('ar') ? '/guide/ar' : '/guide');

/** Sujets du guide ; « lieu » est la page d'accueil du guide (ajouter un site du patrimoine) */
export type SujetGuide = 'lieu' | 'article' | 'oeuvre' | 'evenement' | 'artisanat' | 'service' | 'sommaire' | 'faq' | 'portfolio' | 'telephone' | 'visite' | 'visiteur' | 'vente';

/**
 * Page du guide pour un formulaire (audit V11 OUT-1) : version arabe quand le site est en arabe,
 * française sinon (pas de guide en anglais ni en tamazight). Ancre facultative (#enrichir…).
 */
export const lienGuidePour = (sujet: SujetGuide, langue?: string, ancre?: string): string => {
  const base = langue?.startsWith('ar') ? '/guide/ar' : '/guide';
  return `${sujet === 'lieu' ? base : `${base}/${sujet}`}${ancre ? `#${ancre}` : ''}`;
};

/** Sommaire de tous les guides (lieu, article, œuvre, événement, artisanat) */
export const lienSommaireGuides = (langue?: string): string => (langue?.startsWith('ar') ? '/guide/ar/sommaire' : '/guide/sommaire');
