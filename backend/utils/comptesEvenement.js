/**
 * Comptes d'inscriptions d'un événement, calculés par la base dans la même requête
 * (sous-requêtes : pas de requête supplémentaire par événement, cf. DBA-01 dans models/events/evenement.js).
 *
 * - nombre_inscrits     : places prises = inscriptions non annulées (inscrit, confirmé, présent, absent)
 * - nombre_participants : inscriptions confirmées ou présentes
 */
const { literal } = require('sequelize');

/** Statuts qui occupent une place (capacité de l'événement) */
const STATUTS_PLACE_PRISE = ['inscrit', 'confirme', 'present', 'absent'];

/**
 * @param {string} alias - alias SQL de la table evenement dans la requête (nom du modèle par défaut)
 * @returns {Array} à passer dans attributes.include
 */
function attributsComptes(alias = 'Evenement') {
  const id = `\`${alias}\`.\`id_evenement\``;
  return [
    [literal(`(SELECT COUNT(*) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation <> 'annule')`), 'nombre_inscrits'],
    [literal(`(SELECT COUNT(*) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation IN ('confirme', 'present'))`), 'nombre_participants']
  ];
}

module.exports = { attributsComptes, STATUTS_PLACE_PRISE };
