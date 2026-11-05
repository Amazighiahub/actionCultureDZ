/**
 * LivreSubService - Logique spécifique au sous-type Livre
 */

const BaseSubtypeService = require('./baseSubtypeService');
const LivreDTO = require('../../../dto/oeuvre/subtypes/livreDTO');
const AppError = require('../../../utils/appError');

/**
 * ISBN saisi → valeur enregistrée : espaces retirés, « x » final en majuscule, vide → null.
 * ISBN-10 (9 chiffres + chiffre ou X) ou ISBN-13, tirets permis. Avant : la valeur brute partait en
 * base et « 978 2 07 036024 5 », « 2-07-036024-X » ou un champ vidé donnaient une erreur 500.
 * @returns {string|null|undefined} undefined si le champ est absent (ne rien changer)
 */
function normaliserIsbn(valeur) {
  if (valeur === undefined) return undefined;
  const isbn = String(valeur ?? '').replace(/\s+/g, '').toUpperCase();
  if (!isbn) return null;
  const chiffres = isbn.replace(/-/g, '');
  if (!/^(\d{9}[\dX]|\d{13})$/.test(chiffres) || !/^[0-9-]+X?$/.test(isbn)) {
    throw AppError.badRequest('ISBN invalide : 10 ou 13 chiffres (le dernier d’un ISBN-10 peut être X)');
  }
  return isbn;
}

/** Nombre de pages : vide ou illisible → null */
const lirePages = (v) => BaseSubtypeService.nombre(v, true);

const EXTRAIT_MAX = 20000;
/**
 * Extrait saisi → valeur enregistrée : texte seul (affiché tel quel, jamais comme du HTML),
 * espaces de début et de fin retirés, vide → null.
 * @returns {string|null|undefined} undefined si le champ est absent (ne rien changer)
 */
function normaliserExtrait(valeur) {
  if (valeur === undefined) return undefined;
  if (valeur === null) return null;
  if (typeof valeur !== 'string') throw AppError.badRequest('Extrait invalide');
  const texte = valeur.replace(/\r\n?/g, '\n').trim();
  if (!texte) return null;
  if (texte.length > EXTRAIT_MAX) throw AppError.badRequest(`Extrait trop long : ${EXTRAIT_MAX} caractères au plus`);
  return texte;
}

class LivreSubService extends BaseSubtypeService {
  constructor(models) {
    super('Livre', models, LivreDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      isbn: normaliserIsbn(ds.isbn) ?? null,
      nb_pages: ds.nb_pages != null ? lirePages(ds.nb_pages) : null,
      id_genre: ds.id_genre || null,
      extrait: normaliserExtrait(ds.extrait) ?? null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.isbn !== undefined) data.isbn = normaliserIsbn(ds.isbn);
    if (ds.nb_pages !== undefined) data.nb_pages = lirePages(ds.nb_pages);
    if (ds.id_genre !== undefined) data.id_genre = ds.id_genre;
    if (ds.extrait !== undefined) data.extrait = normaliserExtrait(ds.extrait);
    return data;
  }
}

module.exports = LivreSubService;
module.exports.normaliserIsbn = normaliserIsbn;
module.exports.normaliserExtrait = normaliserExtrait;
