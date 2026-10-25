/** Guide du contributeur (page statique public/guide) : version arabe quand le site est en arabe */
export const lienGuide = (langue?: string): string => (langue?.startsWith('ar') ? '/guide/ar' : '/guide');

/** Sommaire de tous les guides (lieu, article, œuvre, événement, artisanat) */
export const lienSommaireGuides = (langue?: string): string => (langue?.startsWith('ar') ? '/guide/ar/sommaire' : '/guide/sommaire');
