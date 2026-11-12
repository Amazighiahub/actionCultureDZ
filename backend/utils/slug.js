const { texteLisible } = require('../helpers/i18n');
const { sansAccent } = require('./texte');

/**
 * Adresses lisibles « 17-amina-benali » (même règle que frontEnd/src/utils/slug.ts).
 * Seul le numéro identifie la page ; le texte est décoratif.
 */
function slugify(text) {
  // Sans accents ni majuscules : règle commune de utils/texte.js
  return sansAccent(text || '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * Texte d'un champ multilingue ({ fr, ar, ... } ou JSON) pour une adresse : français, puis anglais, puis
 * arabe. Ordre propre aux adresses, à garder : slugify ne garde que les lettres latines, l'anglais donne
 * donc une adresse lisible là où l'arabe la viderait (texteLisible met l'arabe avant l'anglais). Même
 * lecture que texteLisible (helpers/i18n.js) avec l'anglais en langue de secours (audit V11 COD-B3).
 */
function plainText(value) {
  return texteLisible(value, 'fr', 'en');
}

/** Chemin public du portfolio d'un professionnel */
function professionnelPath(id, prenom, nom) {
  const slug = slugAdresse(`${plainText(prenom)} ${plainText(nom)}`);
  return `/professionnels/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'un événement : /evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail */
function evenementPath(id, nom) {
  const slug = slugAdresse(plainText(nom));
  return `/evenements/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'une organisation : /organisations/12-editions-casbah (comme le site) */
function organisationPath(id, nom) {
  const slug = slugAdresse(plainText(nom));
  return `/organisations/${id}${slug ? `-${slug}` : ''}`;
}

/**
 * Chemin public d'une œuvre : /oeuvres/125-zajeljazz ; un article a sa propre page (/articles/…).
 * @param {number} [idType] type de l'œuvre (4 et 5 : articles)
 */
function oeuvrePath(id, titre, idType) {
  const slug = slugAdresse(plainText(titre));
  const base = [4, 5].includes(Number(idType)) ? 'articles' : 'oeuvres';
  return `/${base}/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'un produit artisanal : /artisanat/12-tapis-de-ghardaia (titre de son œuvre) */
function artisanatPath(id, titre) {
  const slug = slugAdresse(plainText(titre));
  return `/artisanat/${id}${slug ? `-${slug}` : ''}`;
}

/**
 * Texte de l'adresse : lettres latines si le nom en a (« zajeljazz »), sinon ses propres lettres
 * (arabe, tifinagh) : un titre seulement en arabe ne laisse plus une adresse réduite au numéro.
 * Même calcul que frontEnd/src/utils/slug.ts.
 */
function slugAdresse(texte) {
  const latin = slugify(texte);
  if (latin) return latin;
  return String(texte || '')
    .normalize('NFC')
    .replace(/\p{M}/gu, '')             // voyelles courtes et signes diacritiques
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Chemin public d'un lieu du patrimoine : /patrimoine/12-casbah-d-alger */
function lieuPath(id, nom) {
  const slug = slugAdresse(plainText(nom));
  return `/patrimoine/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'une personnalité : /personnalites/19-el-hadj-m-hamed-el-anka */
function personnalitePath(id, prenom, nom) {
  const slug = slugAdresse(`${plainText(prenom)} ${plainText(nom)}`);
  return `/personnalites/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'un service : /services/4-restaurant-dar-el-bahdja */
function servicePath(id, nom) {
  const slug = slugAdresse(plainText(nom));
  return `/services/${id}${slug ? `-${slug}` : ''}`;
}

/** Chemin public d'une wilaya : /wilayas/16-alger (nom en lettres latines de la base) */
function wilayaPath(id, nom) {
  const slug = slugAdresse(plainText(nom));
  return `/wilayas/${id}${slug ? `-${slug}` : ''}`;
}

module.exports = { slugify, slugAdresse, plainText, professionnelPath, evenementPath, organisationPath, oeuvrePath, artisanatPath, lieuPath, personnalitePath, wilayaPath, servicePath };
