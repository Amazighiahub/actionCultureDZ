/**
 * Tri d'une liste par nom (champ JSON multilingue), commun aux lieux, intervenants et professionnels
 * (audit V11 BDD-15).
 * - Français : colonne calculée `nom_tri` (première langue remplie, le français d'abord), indexée, quand
 *   la migration l'a créée (20261216 pour lieu et intervenant).
 * - Autres langues, ou colonne absente : nom dans la langue, comparé sans accents ni majuscules. Le JSON
 *   brut se triait dans un ordre faux (« Écomusée » après « Zaouïa », guillemets compris).
 * Toujours départagé par la clé primaire : l'ordre d'une page à l'autre reste stable.
 */
const { literal } = require('sequelize');
const { aColonne } = require('./colonnesCalculees');
const { SUPPORTED_LANGUAGES } = require('./multiLangSearchBuilder');

/**
 * @param {import('sequelize').ModelStatic<any>} model
 * @param {object} [options]
 * @param {string} [options.lang='fr']
 * @param {string} [options.champ='nom'] champ JSON trié
 * @param {string|null} [options.colonne='nom_tri'] colonne calculée du champ (null : aucune)
 * @param {string} [options.direction='ASC']
 * @param {string} [options.alias] alias de la table dans la requête (par défaut le nom du modèle)
 * @returns {Promise<{ order: Array, attributes: object|undefined }>} `attributes` (colonne de tri lue)
 *   est à passer aussi quand Sequelize pagine en deux niveaux (jointure multiple), pour pouvoir trier dessus
 */
async function triParNom(model, { lang = 'fr', champ = 'nom', colonne = 'nom_tri', direction = 'ASC', alias } = {}) {
  const table = (alias || model.name).replace(/[^A-Za-z0-9_]/g, '');
  const nomChamp = String(champ).replace(/[^A-Za-z0-9_]/g, '');
  const sens = String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const cle = model.primaryKeyAttribute;
  const langue = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'fr';

  if (langue === 'fr' && colonne && await aColonne(model, colonne)) {
    const ref = `\`${table}\`.\`${colonne.replace(/[^A-Za-z0-9_]/g, '')}\``;
    return {
      order: [[literal(ref), sens], ...(cle ? [[cle, sens]] : [])],
      attributes: { include: [[literal(ref), colonne]] }
    };
  }
  return {
    order: [
      [literal(`JSON_UNQUOTE(JSON_EXTRACT(\`${table}\`.\`${nomChamp}\`, '$."${langue}"')) COLLATE utf8mb4_0900_ai_ci`), sens],
      ...(cle ? [[cle, sens]] : [])
    ],
    attributes: undefined
  };
}

module.exports = { triParNom };
