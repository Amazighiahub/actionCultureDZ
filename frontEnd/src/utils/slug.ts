/**
 * Adresses lisibles : « 17-amina-benali ». Seul le numéro identifie la page ;
 * le texte est décoratif (un nom modifié ne casse aucun lien).
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-') // arabe, tifinagh, ponctuation -> séparateur
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** « 17-amina-benali » -> 17 ; null si l'adresse ne commence pas par un numéro */
export function idFromSlug(param: string | undefined): number | null {
  const match = /^(\d+)(?:-|$)/.exec(param || '');
  return match ? Number(match[1]) : null;
}

/** Adresse publique du portfolio d'un professionnel */
export function professionnelPath(id: number, prenom?: string | null, nom?: string | null): string {
  const slug = slugify([prenom, nom].filter(Boolean).join(' '));
  return `/professionnels/${id}${slug ? `-${slug}` : ''}`;
}

/**
 * Adresse publique d'un événement : « /evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail ».
 * Le nom (français de préférence) rend le lien partagé lisible ; seul le numéro compte.
 */
export function evenementPath(id: number, nom?: unknown): string {
  const texte = typeof nom === 'string' ? nom
    : nom && typeof nom === 'object' ? ((nom as Record<string, string | undefined>).fr || Object.values(nom as Record<string, string | undefined>).find(Boolean) || '')
    : '';
  const slug = slugify(texte);
  return `/evenements/${id}${slug ? `-${slug}` : ''}`;
}
