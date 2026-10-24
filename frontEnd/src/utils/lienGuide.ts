/** Guide du contributeur (page statique public/guide) : version arabe quand le site est en arabe */
export const lienGuide = (langue?: string): string => (langue?.startsWith('ar') ? '/guide/ar' : '/guide');
