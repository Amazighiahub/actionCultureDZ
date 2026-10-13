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

module.exports = { slugify, plainText, professionnelPath };
