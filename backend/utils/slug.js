/**
 * Adresses lisibles « 17-amina-benali » (même règle que frontEnd/src/utils/slug.ts).
 * Seul le numéro identifie la page ; le texte est décoratif.
 */
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Texte d'un champ multilingue ({ fr, ar, ... } ou JSON) : français d'abord */
function plainText(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return plainText(parsed);
    } catch { /* texte simple */ }
    return value;
  }
  if (typeof value === 'object') return value.fr || value.en || value.ar || Object.values(value).find(Boolean) || '';
  return String(value);
}

/** Chemin public du portfolio d'un professionnel */
function professionnelPath(id, prenom, nom) {
  const slug = slugify(`${plainText(prenom)} ${plainText(nom)}`);
  return `/professionnels/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'un événement : /evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail */
function evenementPath(id, nom) {
  const slug = slugify(plainText(nom));
  return `/evenements/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'une organisation : /organisations/12-editions-casbah (comme le site) */
function organisationPath(id, nom) {
  const slug = slugify(plainText(nom));
  return `/organisations/${id}${slug ? `-${slug}` : ''}`;
}

/**
 * Chemin public d'une œuvre : /oeuvres/125-zajeljazz ; un article a sa propre page (/articles/…).
 * @param {number} [idType] type de l'œuvre (4 et 5 : articles)
 */
function oeuvrePath(id, titre, idType) {
  const slug = slugify(plainText(titre));
  const base = [4, 5].includes(Number(idType)) ? 'articles' : 'oeuvres';
  return `/${base}/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'un produit artisanal : /artisanat/12-tapis-de-ghardaia (titre de son œuvre) */
function artisanatPath(id, titre) {
  const slug = slugify(plainText(titre));
  return `/artisanat/${id}${slug ? `-${slug}` : ''}`;
}

module.exports = { slugify, plainText, professionnelPath, evenementPath, organisationPath, oeuvrePath, artisanatPath };
