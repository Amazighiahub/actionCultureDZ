/**
 * Comptes d'inscriptions d'un événement, calculés par la base dans la même requête
 * (sous-requêtes : pas de requête supplémentaire par événement, cf. DBA-01 dans models/events/evenement.js).
 *
 * Les comptes sont en PERSONNES : une inscription « 4 personnes » prend 4 places (avant : 1 ligne = 1 place,
 * la capacité pouvait être dépassée). nombre_personnes n'est enregistré qu'au-delà de 1.
 * - nombre_inscrits     : places prises (inscrit, confirmé, présent, absent ; ni annulé ni invitation)
 * - nombre_participants : personnes confirmées ou présentes
 */
const { literal } = require('sequelize');

/** Statuts qui occupent une place (capacité de l'événement) */
const STATUTS_PLACE_PRISE = ['inscrit', 'confirme', 'present', 'absent'];

/** Nombre de personnes d'une inscription (table `alias`), 1 par défaut */
const personnesSql = (alias = 'eu') =>
  `GREATEST(1, COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(${alias}.reponses_inscription, '$.nombre_personnes')) AS UNSIGNED), 1))`;
const PERSONNES_SQL = personnesSql();

/**
 * @param {string} alias - alias SQL de la table evenement dans la requête (nom du modèle par défaut)
 * @returns {Array} à passer dans attributes.include
 */
function attributsComptes(alias = 'Evenement') {
  const id = `\`${alias}\`.\`id_evenement\``;
  return [
    [literal(`(SELECT COALESCE(SUM(${PERSONNES_SQL}), 0) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation NOT IN ('annule', 'invitation'))`), 'nombre_inscrits'],
    [literal(`(SELECT COALESCE(SUM(${PERSONNES_SQL}), 0) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation IN ('confirme', 'present'))`), 'nombre_participants']
  ];
}

module.exports = { attributsComptes, STATUTS_PLACE_PRISE, personnesSql };
