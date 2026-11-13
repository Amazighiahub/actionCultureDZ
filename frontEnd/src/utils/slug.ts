/**
 * Texte comparé sans accents ni majuscules : « Béjaïa » -> « bejaia ».
 * Seule version du site (avant : une copie dans Artisanat, une dans Recherche, audit V11 COD-27).
 */
export function sansAccent(v: unknown): string {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Adresses lisibles : « 17-amina-benali ». Seul le numéro identifie la page ;
 * le texte est décoratif (un nom modifié ne casse aucun lien).
 */
export function slugify(text: string): string {
  return sansAccent(text)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-') // arabe, tifinagh, ponctuation -> séparateur
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * Texte de l'adresse : lettres latines si le nom en a, sinon ses propres lettres (arabe, tifinagh).
 * Même calcul que backend/utils/slug.js.
 */
export function slugAdresse(text: string): string {
  const latin = slugify(text);
  if (latin) return latin;
  return String(text || '')
    .normalize('NFC')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Adresse publique d'un lieu du patrimoine : « /patrimoine/12-casbah-d-alger » */
export function lieuPath(id: number, nom?: unknown): string {
  const slug = slugAdresse(texteAdresse(nom));
  return `/patrimoine/${id}${slug ? `-${slug}` : ''}`;
}

/** Adresse publique d'une personnalité : « /personnalites/19-el-hadj-m-hamed-el-anka » */
export function personnalitePath(id: number, prenom?: unknown, nom?: unknown): string {
  const slug = slugAdresse([texteAdresse(prenom), texteAdresse(nom)].filter(Boolean).join(' '));
  return `/personnalites/${id}${slug ? `-${slug}` : ''}`;
}

/** Adresse publique d'un service : « /services/4-restaurant-dar-el-bahdja » */
export function servicePath(id: number, nom?: unknown): string {
  const slug = slugAdresse(texteAdresse(nom));
  return `/services/${id}${slug ? `-${slug}` : ''}`;
}

/** Adresse publique d'une wilaya : « /wilayas/16-alger » */
export function wilayaPath(id: number, nom?: unknown): string {
  const slug = slugAdresse(texteAdresse(nom));
  return `/wilayas/${id}${slug ? `-${slug}` : ''}`;
}

/** « 17-amina-benali » -> 17 ; null si l'adresse ne commence pas par un numéro */
export function idFromSlug(param: string | undefined): number | null {
  const match = /^(\d+)(?:-|$)/.exec(param || '');
  return match ? Number(match[1]) : null;
}

/** Adresse publique du portfolio d'un professionnel */
export function professionnelPath(id: number, prenom?: string | null, nom?: string | null): string {
  const slug = slugAdresse([prenom, nom].filter(Boolean).join(' '));
  return `/professionnels/${id}${slug ? `-${slug}` : ''}`;
}

/** Adresse publique d'une organisation : « /organisations/6-editions-barzakh » */
/** Page publique de l'éditeur d'une œuvre : sa maison d'édition si elle est vérifiée, sinon aucune */
export function pageEditeur(editeur?: { nom?: unknown; Organisation?: { id_organisation: number; statut?: string } | null } | null): string | null {
  return editeur?.Organisation?.statut === 'valide' ? organisationPath(editeur.Organisation.id_organisation, editeur.nom) : null;
}

export function organisationPath(id: number, nom?: unknown): string {
  const texte = typeof nom === 'string' ? nom
    : nom && typeof nom === 'object' ? ((nom as Record<string, string | undefined>).fr || Object.values(nom as Record<string, string | undefined>).find(Boolean) || '')
    : '';
  const slug = slugAdresse(texte);
  return `/organisations/${id}${slug ? `-${slug}` : ''}`;
}

/** Texte d'un titre multilingue pour l'adresse (français de préférence) */
const texteAdresse = (v: unknown): string => typeof v === 'string' ? v
  : v && typeof v === 'object' ? ((v as Record<string, string | undefined>).fr || Object.values(v as Record<string, string | undefined>).find(Boolean) || '')
  : '';

/** Adresse publique d'une œuvre : « /oeuvres/125-zajeljazz » ; un article : « /articles/… » */
export function oeuvrePath(id: number, titre?: unknown, idType?: number | null): string {
  const slug = slugAdresse(texteAdresse(titre));
  const base = idType === 4 || idType === 5 ? 'articles' : 'oeuvres';
  return `/${base}/${id}${slug ? `-${slug}` : ''}`;
}

/** Adresse publique d'un produit artisanal : « /artisanat/12-tapis-de-ghardaia » */
export function artisanatPath(id: number, titre?: unknown): string {
  const slug = slugAdresse(texteAdresse(titre));
  return `/artisanat/${id}${slug ? `-${slug}` : ''}`;
}

/**
 * Adresse publique d'un événement : « /evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail ».
 * Le nom (français de préférence) rend le lien partagé lisible ; seul le numéro compte.
 */
export function evenementPath(id: number, nom?: unknown): string {
  const texte = typeof nom === 'string' ? nom
    : nom && typeof nom === 'object' ? ((nom as Record<string, string | undefined>).fr || Object.values(nom as Record<string, string | undefined>).find(Boolean) || '')
    : '';
  const slug = slugAdresse(texte);
  return `/evenements/${id}${slug ? `-${slug}` : ''}`;
}
